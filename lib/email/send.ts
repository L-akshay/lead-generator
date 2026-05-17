import { Resend } from 'resend';
import { buildAuditEmail } from './build-message';
import type { Audit } from '@/lib/llm/audit-schema';

interface SendInput {
  toEmail: string;
  prospectFirstName: string;
  audit: Audit;
  pdfBuffer: Buffer;
  pdfFileName: string;
}

interface SendResult {
  messageId: string | null;
}

export async function sendAuditEmail(input: SendInput): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  if (!process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_FROM_EMAIL is not set');

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { subject, text, html } = buildAuditEmail({
    prospectFirstName: input.prospectFirstName,
    audit: input.audit,
  });

  const res = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: input.toEmail,
    replyTo: process.env.RESEND_REPLY_TO || undefined,
    subject,
    text,
    html,
    attachments: [
      {
        filename: input.pdfFileName,
        content: input.pdfBuffer,
      },
    ],
  });

  if (res.error) {
    throw new Error(`Resend error: ${res.error.message}`);
  }

  return { messageId: res.data?.id ?? null };
}
