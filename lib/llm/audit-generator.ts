import { GoogleGenerativeAI } from '@google/generative-ai';
import { auditGeminiSchema, auditSchema, type Audit } from './audit-schema';
import { AUDIT_SYSTEM_PROMPT, buildAuditPrompt } from './prompts';
import type { EnrichedData } from '@/lib/enrichment/types';

const MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 8000;
const TEMPERATURE = 0.4;

interface GenerateAuditInput {
  companyName: string;
  website: string | null;
  enriched: EnrichedData;
  prospectName: string;
}

interface GenerateAuditResult {
  audit: Audit;
  usage: { inputTokens: number; outputTokens: number };
  durationMs: number;
}

export async function generateAudit(input: GenerateAuditInput): Promise<GenerateAuditResult> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: AUDIT_SYSTEM_PROMPT,
    generationConfig: {
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: auditGeminiSchema,
    },
  });

  const userPrompt = buildAuditPrompt(input);
  const start = Date.now();

  const result = await model.generateContent(userPrompt);
  const durationMs = Date.now() - start;

  const text = result.response.text();
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  // Parse — Gemini's responseMimeType guarantees JSON, but parse defensively.
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Gemini returned non-JSON despite responseSchema: ${e instanceof Error ? e.message : String(e)}\nRaw: ${text.slice(0, 500)}`
    );
  }

  // Validate against our Zod schema as defense in depth.
  const parsed = auditSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Audit schema validation failed: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`
    );
  }

  const usageMetadata = result.response.usageMetadata;

  return {
    audit: parsed.data,
    usage: {
      inputTokens: usageMetadata?.promptTokenCount ?? 0,
      outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
    },
    durationMs,
  };
}
