import { inngest, leadSubmitted } from '@/inngest/client';
import { enrichLead } from '@/lib/enrichment';
import type { EnrichedData } from '@/lib/enrichment/types';
import { generateAudit } from '@/lib/llm/audit-generator';
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
      // Block 5: real PDF render + Drive upload goes here.
      await wait(800);
      const stub = {
        pdfUrl: null,
        sizeBytes: 0,
      };
      return stub;
    });

    // ── STEP 4: DELIVER (email + sheets + drive) ───────────────────
    await step.run('deliver', async () => {
      await updateStatus(leadId, 'sending', 'deliver');
      // Block 6: parallel Resend + Sheets append + final updates here.
      await wait(600);
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
