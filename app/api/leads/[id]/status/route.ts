import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, status, current_stage, name, company, pdf_url, error_log, email_sent_at, sheets_logged_at, drive_archived_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
