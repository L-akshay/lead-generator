import { z } from 'zod';

const normalizeUrl = (val: string | undefined) => {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const leadSchema = z.object({
  name: z.string().min(2, 'Name too short').max(100).trim(),
  email: z.string().email('Invalid email').toLowerCase().trim(),
  company: z.string().min(2, 'Company name required').max(150).trim(),
  website: z
    .string()
    .optional()
    .transform(normalizeUrl)
    .refine(
      (v) => !v || /^https?:\/\/[^\s]+\.[^\s]+/.test(v),
      'Invalid website URL'
    ),
  phone: z.string().optional().transform((v) => v?.trim() || undefined),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadFormValues = z.input<typeof leadSchema>;
