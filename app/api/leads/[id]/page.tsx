import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export default async function LeadStatusPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!lead) notFound();

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Got it, {lead.name.split(' ')[0]}.
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          We&apos;re preparing the strategic audit for{' '}
          <strong>{lead.company}</strong>. Current status:{' '}
          <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs">
            {lead.status}
          </code>
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Lead ID: {lead.id}
        </p>
      </div>
    </main>
  );
}