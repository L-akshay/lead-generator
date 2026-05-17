import type { Audit } from '@/lib/llm/audit-schema';

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Builds a short, personalized email that cites one specific finding from the audit.
 * Same "they actually researched me" feeling as the PDF cover — the email body
 * must reference a concrete fact to land that effect even before the prospect opens
 * the attachment.
 */
export function buildAuditEmail(input: {
  prospectFirstName: string;
  audit: Audit;
}): EmailContent {
  const { prospectFirstName, audit } = input;
  const companyName = audit.cover.companyName;

  const featuredFinding = audit.opportunityAreas[0]?.finding ?? audit.executiveSummary.headline;

  const subject = `Your SimplifIQ audit for ${companyName}`;

  const text = `Hi ${prospectFirstName},

Thanks for the interest in SimplifIQ. I put together a quick strategic audit for ${companyName} — it's attached as a PDF.

A few notes inside: ${audit.executiveSummary.headline}

One area we'd zoom in on first: ${featuredFinding}

If any of this resonates, I'd love to compare notes over a 20-minute call.

— SimplifIQ`;

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#fafaf9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#262626;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:32px 36px 0;">
                <div style="font-size:11px;letter-spacing:2px;color:#737373;text-transform:uppercase;font-weight:bold;">SimplifIQ · Strategic Audit</div>
                <div style="width:48px;height:3px;background:#FF5C1A;margin-top:16px;margin-bottom:24px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 32px;font-size:14px;line-height:1.6;color:#262626;">
                <p style="margin:0 0 14px;">Hi ${escapeHtml(prospectFirstName)},</p>
                <p style="margin:0 0 14px;">Thanks for the interest in SimplifIQ. I put together a quick strategic audit for <strong>${escapeHtml(companyName)}</strong> — it's attached as a PDF.</p>
                <p style="margin:0 0 14px;"><strong>A few notes inside:</strong> ${escapeHtml(audit.executiveSummary.headline)}</p>
                <p style="margin:0 0 14px;"><strong>One area we'd zoom in on first:</strong> ${escapeHtml(featuredFinding)}</p>
                <p style="margin:0 0 14px;">If any of this resonates, I'd love to compare notes over a 20-minute call.</p>
                <p style="margin:24px 0 0;color:#737373;font-size:13px;">— SimplifIQ</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px;background:#fafaf9;border-top:1px solid #e5e5e5;font-size:11px;color:#737373;letter-spacing:0.5px;text-transform:uppercase;">
                Sent with care · simplifiq.example
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
