import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'audit-pdfs';

export async function uploadAuditPdf(opts: {
  leadId: string;
  companyName: string;
  buffer: Buffer;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const safeCompany = opts.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'company';

  const storagePath = `${safeCompany}/${opts.leadId}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, opts.buffer, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}
