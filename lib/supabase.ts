import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env vars');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

export type LeadStatus =
  | 'queued'
  | 'enriching'
  | 'generating'
  | 'rendering'
  | 'sending'
  | 'completed'
  | 'failed';

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  website: string | null;
  phone: string | null;
  status: LeadStatus;
  current_stage: string | null;
  enriched_data: unknown;
  audit_data: unknown;
  pdf_url: string | null;
  email_sent_at: string | null;
  sheets_logged_at: string | null;
  error_log: Array<{ stage: string; error: string; ts: string }>;
  created_at: string;
  updated_at: string;
}
