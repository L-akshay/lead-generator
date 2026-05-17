import { z } from 'zod';
import { SchemaType, type Schema } from '@google/generative-ai';

/**
 * The complete audit structure. Every field is required.
 * Gemini is forced (via responseSchema) to populate every field;
 * if any source was low-confidence, the LLM should write generic but
 * useful content rather than fabricate facts.
 */
export const auditSchema = z.object({
  cover: z.object({
    companyName: z.string(),
    tagline: z.string(),
    industry: z.string(),
    preparedDate: z.string(),
  }),

  executiveSummary: z.object({
    text: z.string(),
    headline: z.string(),
  }),

  companySnapshot: z.object({
    whatTheyDo: z.string(),
    targetCustomer: z.string(),
    businessModel: z.string(),
    scaleSignals: z.array(z.string()).min(2).max(5),
  }),

  industryPositioning: z.object({
    marketContext: z.string(),
    competitors: z.array(z.object({
      name: z.string(),
      angle: z.string(),
    })).min(2).max(4),
    differentiator: z.string(),
  }),

  observedStrengths: z.array(z.object({
    title: z.string(),
    evidence: z.string(),
    detail: z.string(),
  })).min(3).max(4),

  opportunityAreas: z.array(z.object({
    title: z.string(),
    finding: z.string(),
    recommendation: z.string(),
    impact: z.string(),
  })).min(3).max(5),

  nextSteps: z.array(z.object({
    action: z.string(),
    rationale: z.string(),
  })).min(2).max(4),

  closingNote: z.string(),
});

export type Audit = z.infer<typeof auditSchema>;

/**
 * Gemini's responseSchema. Note: Gemini's schema flavor doesn't support
 * the full JSON Schema spec — it uses SchemaType enums and doesn't accept
 * minItems/maxItems. We enforce ranges via Zod validation post-generation.
 *
 * `description` fields are how we communicate per-field guidance to the model.
 */
export const auditGeminiSchema: Schema = {
  type: SchemaType.OBJECT,
  required: ['cover', 'executiveSummary', 'companySnapshot', 'industryPositioning', 'observedStrengths', 'opportunityAreas', 'nextSteps', 'closingNote'],
  properties: {
    cover: {
      type: SchemaType.OBJECT,
      required: ['companyName', 'tagline', 'industry', 'preparedDate'],
      properties: {
        companyName: { type: SchemaType.STRING },
        tagline: { type: SchemaType.STRING, description: '5-10 words capturing what they do' },
        industry: { type: SchemaType.STRING, description: 'Format: "Category · Sub-category", e.g. "B2B SaaS · Developer Tools"' },
        preparedDate: { type: SchemaType.STRING, description: 'Human-readable month + year, e.g. "May 2026"' },
      },
    },
    executiveSummary: {
      type: SchemaType.OBJECT,
      required: ['text', 'headline'],
      properties: {
        text: { type: SchemaType.STRING, description: '3-4 sentences. The most important paragraph in the report. Must reference 1-2 specific facts from the dossier to prove research depth.' },
        headline: { type: SchemaType.STRING, description: 'A single one-liner capturing the strategic thesis, e.g. "Strong product positioning, undermonetized awareness funnel."' },
      },
    },
    companySnapshot: {
      type: SchemaType.OBJECT,
      required: ['whatTheyDo', 'targetCustomer', 'businessModel', 'scaleSignals'],
      properties: {
        whatTheyDo: { type: SchemaType.STRING, description: '2-3 sentences using their own language where possible' },
        targetCustomer: { type: SchemaType.STRING, description: 'Who they serve, with specificity' },
        businessModel: { type: SchemaType.STRING, description: 'Inferred revenue model. If uncertain, say so.' },
        scaleSignals: {
          type: SchemaType.ARRAY,
          description: '2-5 evidence-backed indicators of stage. Cite source where natural: "raised Series A per TechCrunch", "20+ logos on landing page", "Hiring 12 engineering roles per LinkedIn"',
          items: { type: SchemaType.STRING },
        },
      },
    },
    industryPositioning: {
      type: SchemaType.OBJECT,
      required: ['marketContext', 'competitors', 'differentiator'],
      properties: {
        marketContext: { type: SchemaType.STRING, description: '2-3 sentences situating them in their industry' },
        competitors: {
          type: SchemaType.ARRAY,
          description: '2-4 real competitors in the same category',
          items: {
            type: SchemaType.OBJECT,
            required: ['name', 'angle'],
            properties: {
              name: { type: SchemaType.STRING },
              angle: { type: SchemaType.STRING, description: 'How this competitor positions vs the subject company in one sentence' },
            },
          },
        },
        differentiator: { type: SchemaType.STRING, description: 'Their apparent moat or wedge, based on what was scraped' },
      },
    },
    observedStrengths: {
      type: SchemaType.ARRAY,
      description: '3-4 strengths, each backed by specific evidence from the dossier',
      items: {
        type: SchemaType.OBJECT,
        required: ['title', 'evidence', 'detail'],
        properties: {
          title: { type: SchemaType.STRING, description: '4-7 word punchy title' },
          evidence: { type: SchemaType.STRING, description: 'Specific fact from the enrichment that backs this' },
          detail: { type: SchemaType.STRING, description: '2-3 sentences expanding on why this is a strength' },
        },
      },
    },
    opportunityAreas: {
      type: SchemaType.ARRAY,
      description: '3-5 opportunities — the heart of the audit. Each: finding + recommendation + impact.',
      items: {
        type: SchemaType.OBJECT,
        required: ['title', 'finding', 'recommendation', 'impact'],
        properties: {
          title: { type: SchemaType.STRING, description: '4-7 word title naming the opportunity' },
          finding: { type: SchemaType.STRING, description: 'What was observed — neutral, evidence-based' },
          recommendation: { type: SchemaType.STRING, description: 'Concrete, actionable suggestion' },
          impact: { type: SchemaType.STRING, description: 'Why this matters, with a directional outcome' },
        },
      },
    },
    nextSteps: {
      type: SchemaType.ARRAY,
      description: '2-4 concrete actions SimplifIQ proposes',
      items: {
        type: SchemaType.OBJECT,
        required: ['action', 'rationale'],
        properties: {
          action: { type: SchemaType.STRING, description: 'Imperative, specific action' },
          rationale: { type: SchemaType.STRING, description: 'One sentence on why this is the logical first step' },
        },
      },
    },
    closingNote: { type: SchemaType.STRING, description: '1-2 warm sentences. Personal, references the company by name, invites a 20-minute conversation with SimplifIQ.' },
  },
};
