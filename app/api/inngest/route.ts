import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processLead } from '@/inngest/functions/process-lead';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processLead],
});
