import type { EnrichedData } from '@/lib/enrichment/types';

/**
 * Builds the user message that briefs Gemini with the dossier.
 * Order matters: context → company facts → dossier → rules.
 */
export function buildAuditPrompt(input: {
  companyName: string;
  website: string | null;
  enriched: EnrichedData;
  prospectName: string;
}): string {
  const { companyName, website, enriched, prospectName } = input;

  const sections: string[] = [];

  sections.push(
    `# Target Company\n` +
      `Name: ${companyName}\n` +
      `Website: ${website ?? 'not provided'}\n` +
      `Submitted by: ${prospectName}\n`
  );

  // Website scrape
  if (enriched.scrape.data) {
    const s = enriched.scrape.data;
    sections.push(
      `# From their website (confidence: ${enriched.scrape.confidence})\n` +
        (s.title ? `Title: ${s.title}\n` : '') +
        (s.metaDescription ? `Meta description: ${s.metaDescription}\n` : '') +
        (s.headlines.length ? `Headlines:\n${s.headlines.map(h => `- ${h}`).join('\n')}\n` : '') +
        (s.paragraphs.length ? `Body excerpts:\n${s.paragraphs.map(p => `- ${p}`).join('\n')}\n` : '') +
        (s.aboutText ? `About page: ${s.aboutText}\n` : '') +
        (s.pricingPageUrl ? `Pricing page found: ${s.pricingPageUrl}\n` : '') +
        (s.socialLinks.length ? `Social links: ${s.socialLinks.join(', ')}\n` : '')
    );
  } else {
    sections.push(`# Website scrape\nUnavailable: ${enriched.scrape.error ?? 'unknown error'}`);
  }

  // Tavily search
  if (enriched.search.data) {
    const s = enriched.search.data;
    sections.push(
      `# External research (confidence: ${enriched.search.confidence})\n` +
        (s.summary ? `Synthesized summary: ${s.summary}\n` : '') +
        (s.topics.funding.length ? `Funding signals:\n${s.topics.funding.slice(0, 3).map(t => `- ${t}`).join('\n')}\n` : '') +
        (s.topics.competitors.length ? `Competitor mentions:\n${s.topics.competitors.slice(0, 3).map(t => `- ${t}`).join('\n')}\n` : '') +
        (s.topics.news.length ? `Recent news:\n${s.topics.news.slice(0, 3).map(t => `- ${t}`).join('\n')}\n` : '') +
        (s.topics.company.length ? `General context:\n${s.topics.company.slice(0, 3).map(t => `- ${t}`).join('\n')}\n` : '') +
        (s.sources.length ? `\nSources cited: ${s.sources.slice(0, 5).map(src => src.url).join(', ')}\n` : '')
    );
  } else {
    sections.push(`# External research\nUnavailable: ${enriched.search.error ?? 'unknown error'}`);
  }

  // Tech stack
  if (enriched.techStack.data) {
    const t = enriched.techStack.data;
    const stack: string[] = [];
    if (t.frontend.length) stack.push(`Frontend: ${t.frontend.join(', ')}`);
    if (t.cms.length) stack.push(`CMS/Builder: ${t.cms.join(', ')}`);
    if (t.analytics.length) stack.push(`Analytics: ${t.analytics.join(', ')}`);
    if (t.marketing.length) stack.push(`Marketing/CRM: ${t.marketing.join(', ')}`);
    if (t.infra.length) stack.push(`Infrastructure: ${t.infra.join(', ')}`);
    if (t.payments.length) stack.push(`Payments: ${t.payments.join(', ')}`);
    if (stack.length) {
      sections.push(`# Detected technology stack (confidence: ${enriched.techStack.confidence})\n${stack.join('\n')}`);
    }
  }

  return sections.join('\n\n');
}

export const AUDIT_SYSTEM_PROMPT = `You are a senior strategy consultant at SimplifIQ writing a personalized first-impression audit for a prospective client. Your job is to make the reader feel that an experienced human spent real time researching their business.

CORE PRINCIPLES
1. SPECIFICITY OVER GENERALITY. Every observation should reference a concrete fact from the dossier. The prospect should feel "they actually looked at my site." Generic statements like "you have a strong brand" with no evidence are forbidden.
2. HONESTY OVER FLATTERY. Strengths must be evidence-backed. Opportunities should be diplomatic but real. If something is a weakness, name it tactfully.
3. NEVER FABRICATE. If the dossier doesn't say it, don't claim it. When confidence is low or data is missing, write directional observations ("companies of this stage typically...") rather than fake specifics.
4. CITE EVIDENCE. In Strengths and Snapshot, reference where the fact comes from when natural: "per their landing page", "as noted in recent press coverage", "based on detected tech stack."
5. WARM, DIRECT VOICE. Confident, not arrogant. Helpful, not salesy. Avoid corporate jargon ("synergies", "leverage", "unlock value", "best-in-class", "world-class"). Avoid em-dashes used as rhetorical pauses.
6. SHOW DOMAIN AWARENESS. If they're B2B SaaS, talk like someone who understands B2B SaaS. If they're D2C, the framing should reflect D2C dynamics. Match their world.

OUTPUT RULES
- Return ONLY a JSON object matching the response schema. Do not include markdown fences, commentary, or any text outside the JSON.
- Every required field must be populated. No empty strings.
- Cover tagline: 5-10 words, evocative, from THEIR language where possible.
- Industry: "Category · Sub-category" format (e.g., "B2B SaaS · Developer Tools", "D2C · Skincare").
- Competitors: real, well-known companies in their space. If the dossier names some, use those. Otherwise infer plausible ones from their category.
- Opportunity Areas: this is the heart of the audit. Each must have observation + recommendation + impact. Make them feel actionable, not theoretical.
- Closing note: warm, references the company by name, invites a 20-minute conversation with SimplifIQ.`;
