import { tavily } from '@tavily/core';
import type { Confidence, EnrichmentResult, SearchResults } from './types';
import { retryWithBackoff, timed, withTimeout } from './utils';

const TIMEOUT_MS = 10000;

interface TavilyResultItem {
  title: string;
  url: string;
  content?: string;
}

export async function searchCompany(
  companyName: string,
  website: string | null
): Promise<EnrichmentResult<SearchResults>> {
  const { result, durationMs } = await timed(async () => {
    if (!process.env.TAVILY_API_KEY) {
      return { data: null, confidence: 'low' as const, error: 'missing_tavily_key' };
    }

    try {
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const domain = website ? new URL(website).hostname.replace(/^www\./, '') : '';

      // Single broad query — Tavily synthesizes an answer + returns sources.
      // We then categorize the top results into topics.
      const broadQuery = `${companyName} company ${domain ? `(${domain})` : ''} — what they do, funding, competitors, recent news`;

      const res = await retryWithBackoff(
        () => withTimeout(
          client.search(broadQuery, {
            searchDepth: 'advanced',
            includeAnswer: true,
            maxResults: 8,
            excludeDomains: domain ? [domain] : [], // we already scraped their own site
          }),
          TIMEOUT_MS,
          'tavily-search'
        ),
        { attempts: 2, delays: [0, 1000], label: 'tavily' }
      );

      const summary = res.answer || '';
      const sources = (res.results || []).map((r: TavilyResultItem) => ({
        title: r.title as string,
        url: r.url as string,
      })).slice(0, 8);

      // Bucket results by topic heuristically based on title/content keywords.
      const topics = {
        company: [] as string[],
        funding: [] as string[],
        competitors: [] as string[],
        news: [] as string[],
      };

      for (const r of res.results || []) {
        const text = `${r.title} ${r.content || ''}`.toLowerCase();
        const snippet = ((r.content as string) || '').slice(0, 300);
        if (/raised|funding|series|seed|valuation|investor/.test(text)) topics.funding.push(snippet);
        else if (/competitor|vs |alternative|compared/.test(text)) topics.competitors.push(snippet);
        else if (/news|announce|launch|2024|2025|2026/.test(text)) topics.news.push(snippet);
        else topics.company.push(snippet);
      }

      const data: SearchResults = { summary, topics, sources };
      const confidence: Confidence = summary && sources.length >= 3 ? 'high' : sources.length >= 1 ? 'medium' : 'low';

      return { data, confidence };
    } catch (e) {
      return { data: null, confidence: 'low' as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

  return { ...result, source: 'tavily', durationMs };
}
