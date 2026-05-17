export type Confidence = 'high' | 'medium' | 'low';

export interface EnrichmentResult<T> {
  data: T | null;
  source: string;
  confidence: Confidence;
  error?: string;
  durationMs: number;
}

export interface ScrapedSite {
  title: string | null;
  metaDescription: string | null;
  headlines: string[];        // h1 + h2 text
  paragraphs: string[];       // first 3 body paragraphs
  aboutText: string | null;
  footerText: string | null;
  socialLinks: string[];
  pricingPageUrl: string | null;
  ogImage: string | null;
}

export interface SearchResults {
  summary: string;            // Tavily's synthesized answer
  topics: {
    company: string[];        // result snippets
    funding: string[];
    competitors: string[];
    news: string[];
  };
  sources: { title: string; url: string }[];
}

export interface BrandingData {
  logoUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  themeColor: string | null;
  appleTouchIcon: string | null;
}

export interface TechStack {
  frontend: string[];
  analytics: string[];
  marketing: string[];
  infra: string[];
  cms: string[];
  payments: string[];
  raw: string[];              // unclassified hits
}

export interface EnrichedData {
  scrape: EnrichmentResult<ScrapedSite>;
  search: EnrichmentResult<SearchResults>;
  branding: EnrichmentResult<BrandingData>;
  techStack: EnrichmentResult<TechStack>;
  meta: {
    companyName: string;
    website: string | null;
    totalDurationMs: number;
    timestamp: string;
  };
}
