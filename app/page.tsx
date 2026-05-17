import { LeadForm } from '@/components/LeadForm';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-neutral-500">
            SimplifIQ · Free Strategic Audit
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Get a personalized audit of your business
          </h1>
          <p className="mt-3 text-sm text-neutral-600">
            Submit your details. Our AI researches your company and delivers a curated strategic audit to your inbox — all in under a minute.
          </p>
        </div>

        <div className="w-full rounded-xl border border-neutral-200 bg-white p-7 shadow-sm">
          <LeadForm />
        </div>
      </div>
    </main>
  );
}
