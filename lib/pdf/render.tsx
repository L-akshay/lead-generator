import { Document, renderToBuffer } from '@react-pdf/renderer';
import type { Audit } from '@/lib/llm/audit-schema';
import type { EnrichedData } from '@/lib/enrichment/types';
import { themeWithAccent } from './theme';
import { probeImage } from './utils';
import { CoverPage } from './components/CoverPage';
import { SummaryPage } from './components/SummaryPage';
import { PositioningPage } from './components/PositioningPage';
import { OpportunitiesPage } from './components/OpportunitiesPage';
import { ClosingPage } from './components/ClosingPage';

/**
 * Renders the audit JSON into a PDF buffer.
 * Branding (accent color + logo) is pulled from enriched_data.branding.
 * If the logo URL is unreachable, we render the cover without an image — never fail.
 */
export async function renderAuditPdf(input: {
  audit: Audit;
  enriched: EnrichedData;
}): Promise<{ buffer: Buffer; sizeBytes: number }> {
  const accentColor = input.enriched.branding.data?.themeColor ?? null;
  const theme = themeWithAccent(accentColor);

  const logoUrl = await probeImage(input.enriched.branding.data?.logoUrl ?? null);

  const doc = (
    <Document
      title={`${input.audit.cover.companyName} — Strategic Audit`}
      author="SimplifIQ"
      subject="Personalized strategic audit"
      creator="SimplifIQ Audit Bot"
      producer="SimplifIQ Audit Bot"
    >
      <CoverPage audit={input.audit} logoUrl={logoUrl} theme={theme} />
      <SummaryPage audit={input.audit} theme={theme} />
      <PositioningPage audit={input.audit} theme={theme} />
      <OpportunitiesPage audit={input.audit} theme={theme} />
      <ClosingPage audit={input.audit} theme={theme} />
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return { buffer, sizeBytes: buffer.length };
}
