import type { EnrichedData, EnrichmentResult } from './types';
import { scrapeWebsite } from './scrape-website';
import { searchCompany } from './search-company';
import { extractBranding } from './extract-branding';
import { detectTechStack } from './detect-tech-stack';

interface EnrichmentInput {
  companyName: string;
  website: string | null;
}

/**
 * Orchestrates the 4 enrichment sources in parallel.
 * Uses Promise.allSettled — any individual source can fail without
 * tearing down the pipeline. The LLM in Block 4 reads the `confidence`
 * field on each result to know how heavily to weight each fact.
 */
export async function enrichLead(input: EnrichmentInput): Promise<EnrichedData> {
  const start = Date.now();
  const { companyName, website } = input;

  const results = await Promise.allSettled([
    scrapeWebsite(website),
    searchCompany(companyName, website),
    extractBranding(website),
    detectTechStack(website),
  ]);

  return {
    scrape: settled(results[0], 'cheerio'),
    search: settled(results[1], 'tavily'),
    branding: settled(results[2], 'meta-extraction'),
    techStack: settled(results[3], 'header+meta-sniff'),
    meta: {
      companyName,
      website,
      totalDurationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
  };
}

function settled<T>(r: PromiseSettledResult<EnrichmentResult<T>>, source: string): EnrichmentResult<T> {
  if (r.status === 'fulfilled') return r.value;
  return {
    data: null,
    source,
    confidence: 'low',
    error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    durationMs: 0,
  };
}
