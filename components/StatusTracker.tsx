'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

type LeadStatus =
  | 'queued'
  | 'enriching'
  | 'generating'
  | 'rendering'
  | 'sending'
  | 'completed'
  | 'failed';

const STAGES: { key: LeadStatus; label: string }[] = [
  { key: 'queued', label: 'Submission received' },
  { key: 'enriching', label: 'Researching your company' },
  { key: 'generating', label: 'Generating strategic audit' },
  { key: 'rendering', label: 'Designing your PDF report' },
  { key: 'sending', label: 'Sending to your inbox' },
  { key: 'completed', label: 'Done — check your email' },
];

export function StatusTracker({ leadId }: { leadId: string }) {
  const [status, setStatus] = useState<LeadStatus>('queued');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}/status`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        setStatus(data.status);
        if (data.pdf_url) setPdfUrl(data.pdf_url);
        if (data.status === 'failed') setHasError(true);
      } catch {
        // Network blip — just keep polling.
      }
    };

    poll();
    const id = setInterval(() => {
      if (status !== 'completed' && status !== 'failed') poll();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [leadId, status]);

  const currentIdx = STAGES.findIndex((s) => s.key === status);

  return (
    <div className="mt-10 w-full rounded-xl border border-neutral-200 bg-white p-6 text-left shadow-sm">
      <ul className="space-y-3">
        {STAGES.map((stage, i) => {
          const done = i < currentIdx || status === 'completed';
          const active = i === currentIdx && status !== 'completed';
          return (
            <li key={stage.key} className="flex items-center gap-3">
              <span
                className={
                  done
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white'
                    : active
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white'
                    : 'flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 text-neutral-400'
                }
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="text-[10px]">{i + 1}</span>
                )}
              </span>
              <span
                className={
                  done || active
                    ? 'text-sm font-medium text-neutral-900'
                    : 'text-sm text-neutral-400'
                }
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ul>

      {hasError && (
        <div className="mt-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Something went wrong generating your audit. Our team has been
            notified.
          </span>
        </div>
      )}

      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Open your audit PDF
        </a>
      )}
    </div>
  );
}
