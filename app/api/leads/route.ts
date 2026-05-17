import { NextRequest, NextResponse } from 'next/server';
import { leadSchema } from '@/lib/validation/lead-schema';
import { supabaseAdmin } from '@/lib/supabase';
import { inngest } from '@/inngest/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lead = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      name: lead.name,
      email: lead.email,
      company: lead.company,
      website: lead.website ?? null,
      phone: lead.phone ?? null,
      status: 'queued',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Insert failed:', error);
    return NextResponse.json(
      { error: 'Failed to save lead' },
      { status: 500 }
    );
  }

  // Fire-and-forget: kick off the audit pipeline.
  // If this fails (e.g. Inngest unreachable), we still return success to
  // the user but flag the lead for manual retry. In production we'd add
  // a fallback (sweeper job that re-fires for 'queued' leads older than N mins).
  try {
    await inngest.send({
      name: 'lead/submitted',
      data: { leadId: data.id },
    });
  } catch (e) {
    console.error('inngest.send failed:', e);
    await supabaseAdmin
      .from('leads')
      .update({
        error_log: [
          {
            stage: 'inngest-send',
            error: e instanceof Error ? e.message : String(e),
            ts: new Date().toISOString(),
          },
        ],
      })
      .eq('id', data.id);
    // Still return 202 — don't punish the user for our infra hiccup.
  }

  return NextResponse.json(
    { leadId: data.id, status: 'queued' },
    { status: 202 }
  );
}
