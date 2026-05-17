import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { StatusTracker } from '@/components/StatusTracker';

export default async function LeadStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, name, company')
    .eq('id', id)
    .single();

  if (!lead) notFound();

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-500">
          SimplifIQ
        </p>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Got it, {lead.name.split(' ')[0]}.
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          We&apos;re preparing the strategic audit for{' '}
          <strong>{lead.company}</strong>.
        </p>

        <StatusTracker leadId={lead.id} />
      </div>
    </main>
  );
}
