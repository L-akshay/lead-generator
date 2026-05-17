import { inngest, leadSubmitted } from '@/inngest/client';
import { enrichLead } from '@/lib/enrichment';
import type { EnrichedData } from '@/lib/enrichment/types';
import { generateAudit } from '@/lib/llm/audit-generator';
import type { Audit } from '@/lib/llm/audit-schema';
import { renderAuditPdf } from '@/lib/pdf/render';
import { uploadAuditPdf } from '@/lib/pdf/storage';
import { sendAuditEmail } from '@/lib/email/send';
import { appendLeadRow } from '@/lib/google/sheets';
import { uploadPdfToDrive } from '@/lib/google/drive';
import { supabaseAdmin } from '@/lib/supabase';
import type { LeadStatus } from '@/lib/supabase';

/**
 * The full audit pipeline for a submitted lead.
 *
 * Each step is independently retryable. If a step fails, Inngest retries
 * just that step — prior step results are cached and replayed.
 *
 * Step structure (Block 2: all stubs):
 *   1. enrich      → fetch company data from multiple sources
 *   2. generate    → Claude Sonnet 4 produces structured audit JSON
 *   3. render      → @react-pdf/renderer builds the branded PDF
 *   4. deliver     → email + Drive upload + Sheets append in parallel
 */
export const processLead = inngest.createFunction(
  {
    id: 'process-lead',
    retries: 3,
    triggers: [{ event: leadSubmitted }],
    onFailure: async ({ event, error }) => {
      // Called when all retries are exhausted across the whole function.
      // Mark the lead as permanently failed.
      const leadId = (event.data.event.data as { leadId: string }).leadId;
      await supabaseAdmin
        .from('leads')
        .update({
          status: 'failed' as LeadStatus,
          error_log: [
            {
              stage: 'function',
              error: error.message,
              ts: new Date().toISOString(),
            },
          ],
        })
        .eq('id', leadId);
    },
  },
  async ({ event, step, logger }) => {
    const { leadId } = event.data;
    logger.info('Processing lead', { leadId });

    // ── STEP 1: ENRICH ─────────────────────────────────────────────
    const enriched = await step.run('enrich-company', async () => {
      await updateStatus(leadId, 'enriching', 'enrich-company');

      // Fetch the lead row to get company name + website.
      const { data: lead, error: leadErr } = await supabaseAdmin
        .from('leads')
        .select('company, website')
        .eq('id', leadId)
        .single();

      if (leadErr || !lead) {
        throw new Error(`Failed to load lead ${leadId} for enrichment: ${leadErr?.message}`);
      }

      const data = await enrichLead({
        companyName: lead.company,
        website: lead.website,
      });

      await supabaseAdmin
        .from('leads')
        .update({ enriched_data: data })
        .eq('id', leadId);

      logger.info('Enrichment complete', {
        leadId,
        durationMs: data.meta.totalDurationMs,
        confidences: {
          scrape: data.scrape.confidence,
          search: data.search.confidence,
          branding: data.branding.confidence,
          techStack: data.techStack.confidence,
        },
      });

      return data;
    });

    // ── STEP 2: GENERATE AUDIT ─────────────────────────────────────
    const audit = await step.run('generate-audit', async () => {
      await updateStatus(leadId, 'generating', 'generate-audit');

      // Re-fetch the lead to get name + company + freshly-written enriched_data.
      // We read from the DB rather than relying on the previous step's return
      // value because Inngest serializes step output as JSON in its store
      // (Supabase is our source of truth for the dossier).
      const { data: lead, error: leadErr } = await supabaseAdmin
        .from('leads')
        .select('name, company, website, enriched_data')
        .eq('id', leadId)
        .single();

      if (leadErr || !lead) {
        throw new Error(`Failed to load lead ${leadId} for audit generation: ${leadErr?.message}`);
      }
      if (!lead.enriched_data) {
        throw new Error(`Lead ${leadId} has no enriched_data — was step 1 skipped?`);
      }

      const result = await generateAudit({
        companyName: lead.company,
        website: lead.website,
        prospectName: lead.name,
        enriched: lead.enriched_data as EnrichedData,
      });

      await supabaseAdmin
        .from('leads')
        .update({ audit_data: result.audit })
        .eq('id', leadId);

      logger.info('Audit generated', {
        leadId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        durationMs: result.durationMs,
      });

      return result.audit;
    });

    // ── STEP 3: RENDER PDF ─────────────────────────────────────────
    const pdfMeta = await step.run('render-pdf', async () => {
      await updateStatus(leadId, 'rendering', 'render-pdf');

      // Re-fetch lead — Supabase is source of truth for enriched + audit data.
      const { data: lead, error: leadErr } = await supabaseAdmin
        .from('leads')
        .select('company, enriched_data, audit_data')
        .eq('id', leadId)
        .single();

      if (leadErr || !lead) {
        throw new Error(`Failed to load lead ${leadId} for PDF render: ${leadErr?.message}`);
      }
      if (!lead.audit_data) {
        throw new Error(`Lead ${leadId} has no audit_data — was step 2 skipped?`);
      }

      const { buffer, sizeBytes } = await renderAuditPdf({
        audit: lead.audit_data as Audit,
        enriched: lead.enriched_data as EnrichedData,
      });

      const { publicUrl, storagePath } = await uploadAuditPdf({
        leadId,
        companyName: lead.company,
        buffer,
      });

      await supabaseAdmin
        .from('leads')
        .update({ pdf_url: publicUrl })
        .eq('id', leadId);

      logger.info('PDF rendered + uploaded', { leadId, sizeBytes, publicUrl, storagePath });

      return { pdfUrl: publicUrl, sizeBytes };
    });

    // ── STEP 4: DELIVER (email + sheets + drive) ───────────────────
    await step.run('deliver', async () => {
      await updateStatus(leadId, 'sending', 'deliver');

      // Source of truth: re-read everything from Supabase.
      const { data: lead, error: leadErr } = await supabaseAdmin
        .from('leads')
        .select('id, name, email, company, website, audit_data, pdf_url, email_sent_at, sheets_logged_at, drive_archived_at')
        .eq('id', leadId)
        .single();

      if (leadErr || !lead) {
        throw new Error(`Failed to load lead ${leadId} for delivery: ${leadErr?.message}`);
      }
      if (!lead.audit_data) throw new Error(`Lead ${leadId} has no audit_data`);
      if (!lead.pdf_url) throw new Error(`Lead ${leadId} has no pdf_url`);

      // Fetch the PDF buffer from Supabase Storage — we need bytes to attach to
      // the email and re-upload to Drive.
      const pdfRes = await fetch(lead.pdf_url);
      if (!pdfRes.ok) throw new Error(`Failed to fetch PDF buffer: HTTP ${pdfRes.status}`);
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

      const audit = lead.audit_data as Audit;
      const firstName = lead.name.split(' ')[0] || lead.name;
      const safeCompany = lead.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'company';
      const pdfFileName = `simplifiq-audit-${safeCompany}.pdf`;

      // Run all 3 side effects in parallel; idempotency guards skip already-done work.
      const [emailResult, sheetsResult, driveResult] = await Promise.allSettled([
        (async () => {
          if (lead.email_sent_at) return { skipped: true as const };
          const out = await sendAuditEmail({
            toEmail: lead.email,
            prospectFirstName: firstName,
            audit,
            pdfBuffer,
            pdfFileName,
          });
          await supabaseAdmin
            .from('leads')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', leadId);
          return { skipped: false as const, messageId: out.messageId };
        })(),

        (async () => {
          if (lead.sheets_logged_at) return { skipped: true as const };
          await appendLeadRow({
            leadId: lead.id,
            name: lead.name,
            email: lead.email,
            company: lead.company,
            website: lead.website,
            status: 'completed',
            pdfUrl: lead.pdf_url,
          });
          await supabaseAdmin
            .from('leads')
            .update({ sheets_logged_at: new Date().toISOString() })
            .eq('id', leadId);
          return { skipped: false as const };
        })(),

        (async () => {
          if (lead.drive_archived_at) return { skipped: true as const };
          const out = await uploadPdfToDrive({
            buffer: pdfBuffer,
            fileName: pdfFileName,
          });
          await supabaseAdmin
            .from('leads')
            .update({
              drive_archived_at: new Date().toISOString(),
              drive_file_id: out.fileId,
            })
            .eq('id', leadId);
          return { skipped: false as const, fileId: out.fileId };
        })(),
      ]);

      const failures: Array<{ stage: string; error: string; ts: string }> = [];
      const ts = new Date().toISOString();

      if (emailResult.status === 'rejected') {
        failures.push({ stage: 'email', error: String(emailResult.reason), ts });
        logger.error('Email send failed', { leadId, error: String(emailResult.reason) });
      } else {
        logger.info('Email', { leadId, ...emailResult.value });
      }

      if (sheetsResult.status === 'rejected') {
        failures.push({ stage: 'sheets', error: String(sheetsResult.reason), ts });
        logger.error('Sheets append failed', { leadId, error: String(sheetsResult.reason) });
      } else {
        logger.info('Sheets', { leadId, ...sheetsResult.value });
      }

      if (driveResult.status === 'rejected') {
        failures.push({ stage: 'drive', error: String(driveResult.reason), ts });
        logger.error('Drive upload failed', { leadId, error: String(driveResult.reason) });
      } else {
        logger.info('Drive', { leadId, ...driveResult.value });
      }

      // Completion policy: email is the only prospect-facing side effect.
      // If it fails, throw so Inngest retries. Sheets/Drive failures are
      // logged but never block completion.
      if (emailResult.status === 'rejected') {
        await appendErrorLog(leadId, failures);
        throw new Error('Email delivery failed — Inngest will retry');
      }

      if (failures.length > 0) {
        await appendErrorLog(leadId, failures);
      }
      await supabaseAdmin
        .from('leads')
        .update({
          status: 'completed' as LeadStatus,
          current_stage: null,
        })
        .eq('id', leadId);
    });

    logger.info('Lead processed', { leadId, enriched, audit, pdfMeta });
    return { leadId, ok: true };
  }
);

// ── helpers ──────────────────────────────────────────────────────
async function updateStatus(
  leadId: string,
  status: LeadStatus,
  stage: string
) {
  await supabaseAdmin
    .from('leads')
    .update({ status, current_stage: stage })
    .eq('id', leadId);
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function appendErrorLog(
  leadId: string,
  entries: Array<{ stage: string; error: string; ts: string }>
) {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('error_log')
    .eq('id', leadId)
    .single();

  const existing = (data?.error_log as Array<{ stage: string; error: string; ts: string }>) ?? [];
  await supabaseAdmin
    .from('leads')
    .update({ error_log: [...existing, ...entries] })
    .eq('id', leadId);
}
