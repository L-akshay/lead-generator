import { Inngest, eventType, staticSchema } from 'inngest';

export const leadSubmitted = eventType('lead/submitted', {
  schema: staticSchema<{
    leadId: string;
  }>(),
});

export const inngest = new Inngest({
  id: 'simplifiq-audit-bot',
});
