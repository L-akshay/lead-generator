import * as cheerio from 'cheerio';
import { gotScraping } from 'got-scraping';
import type { BrandingData, EnrichmentResult } from './types';
import { absoluteUrl, cleanText, timed, withTimeout } from './utils';

const TIMEOUT_MS = 7000;

export async function extractBranding(website: string | null): Promise<EnrichmentResult<BrandingData>> {
  const { result, durationMs } = await timed(async () => {
    if (!website) {
      return { data: null, confidence: 'low' as const, error: 'no_website_provided' };
    }

    try {
      const html = await withTimeout(fetchHtml(website), TIMEOUT_MS, 'branding');
      const $ = cheerio.load(html);

      const ogImage = absoluteUrl($('meta[property="og:image"]').attr('content'), website);
      const ogSiteName = cleanText($('meta[property="og:site_name"]').attr('content'), 100);
      const themeColor = cleanText($('meta[name="theme-color"]').attr('content'), 30);

      const appleTouchIcon = absoluteUrl(
        $('link[rel="apple-touch-icon"]').attr('href') ?? $('link[rel="apple-touch-icon-precomposed"]').attr('href'),
        website
      );

      const faviconUrl =
        absoluteUrl($('link[rel="icon"]').attr('href'), website) ??
        absoluteUrl($('link[rel="shortcut icon"]').attr('href'), website) ??
        absoluteUrl('/favicon.ico', website);

      // Best logo candidate: og:image > apple-touch-icon > first <img> with "logo"
      let logoUrl: string | null = ogImage ?? appleTouchIcon ?? null;
      if (!logoUrl) {
        const logoImg = $('img').filter((_, el) => {
          const alt = ($(el).attr('alt') || '').toLowerCase();
          const src = ($(el).attr('src') || '').toLowerCase();
          return /logo/.test(alt) || /logo/.test(src);
        }).first().attr('src');
        if (logoImg) logoUrl = absoluteUrl(logoImg, website);
      }

      const data: BrandingData = {
        logoUrl,
        faviconUrl,
        siteName: ogSiteName,
        themeColor,
        appleTouchIcon,
      };

      const score = [logoUrl, faviconUrl, ogSiteName, themeColor].filter(Boolean).length;
      const confidence = score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';

      return { data, confidence: confidence as 'high' | 'medium' | 'low' };
    } catch (e) {
      return { data: null, confidence: 'low' as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

  return { ...result, source: 'meta-extraction', durationMs };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await gotScraping({
    url,
    timeout: { request: 6000 },
    headerGeneratorOptions: { browsers: [{ name: 'chrome', minVersion: 110 }] },
  });
  if (!res.ok) throw new Error(`HTTP ${res.statusCode}`);
  return res.body;
}
