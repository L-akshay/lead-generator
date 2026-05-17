'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  leadSchema,
  type LeadFormValues,
  type LeadInput,
} from '@/lib/validation/lead-schema';
import { Loader2 } from 'lucide-react';

export function LeadForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues, unknown, LeadInput>({
    resolver: zodResolver(leadSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (values: LeadInput) => {
    setServerError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Server error (${res.status})`);
      }

      const { leadId } = await res.json();
      router.push(`/leads/${leadId}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Field label="Full Name" error={errors.name?.message}>
        <input
          {...register('name')}
          className={inputCx}
          placeholder="Mridul Sharma"
          autoComplete="name"
        />
      </Field>

      <Field label="Work Email" error={errors.email?.message}>
        <input
          {...register('email')}
          type="email"
          className={inputCx}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Company Name" error={errors.company?.message}>
        <input
          {...register('company')}
          className={inputCx}
          placeholder="Acme Inc."
          autoComplete="organization"
        />
      </Field>

      <Field label="Company Website" error={errors.website?.message} optional>
        <input
          {...register('website')}
          className={inputCx}
          placeholder="acme.com"
          autoComplete="url"
        />
      </Field>

      <Field label="Phone" error={errors.phone?.message} optional>
        <input
          {...register('phone')}
          className={inputCx}
          placeholder="+91 ..."
          autoComplete="tel"
        />
      </Field>

      {serverError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Submitting…' : 'Get My Free Audit'}
      </button>

      <p className="text-center text-xs text-neutral-500">
        Your personalized audit will arrive in your inbox in under 60 seconds.
      </p>
    </form>
  );
}

const inputCx =
  'w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900';

function Field({
  label,
  children,
  error,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
        {optional && (
          <span className="ml-1 text-xs font-normal text-neutral-400">
            (optional)
          </span>
        )}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
