import * as cheerio from 'cheerio';
import { gotScraping } from 'got-scraping';
import type { EnrichmentResult, ScrapedSite } from './types';
import { absoluteUrl, cleanText, retryWithBackoff, timed, withTimeout } from './utils';

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000; // 1.5MB — bail out on giant pages

export async function scrapeWebsite(website: string | null): Promise<EnrichmentResult<ScrapedSite>> {
  const { result, durationMs } = await timed(async () => {
    if (!website) {
      return { data: null, confidence: 'low' as const, error: 'no_website_provided' };
    }

    try {
      const html = await retryWithBackoff(
        () => withTimeout(fetchHtml(website), TIMEOUT_MS, 'scrape'),
        { attempts: 2, delays: [0, 800], label: 'scrape-fetch' }
      );

      const $ = cheerio.load(html);

      const title = cleanText($('title').first().text(), 200);
      const metaDescription = cleanText(
        $('meta[name="description"]').attr('content') ?? $('meta[property="og:description"]').attr('content'),
        500
      );

      const headlines: string[] = [];
      $('h1, h2').each((_, el) => {
        const t = cleanText($(el).text(), 200);
        if (t && headlines.length < 8) headlines.push(t);
      });

      const paragraphs: string[] = [];
      $('main p, article p, p').each((_, el) => {
        const t = cleanText($(el).text(), 400);
        if (t && t.length > 50 && paragraphs.length < 5) paragraphs.push(t);
      });

      // Try to find "about" link in nav, scrape it for context
      let aboutText: string | null = null;
      const aboutHref = $('a').filter((_, a) => /about/i.test($(a).text() || $(a).attr('href') || '')).first().attr('href');
      if (aboutHref) {
        const aboutUrl = absoluteUrl(aboutHref, website);
        if (aboutUrl && aboutUrl !== website) {
          try {
            const aboutHtml = await withTimeout(fetchHtml(aboutUrl), 5000, 'scrape-about');
            const $$ = cheerio.load(aboutHtml);
            aboutText = cleanText($$('main, article, body').first().text(), 1500);
          } catch {
            // about page failed — that's fine, we have main page
          }
        }
      }

      // Pricing page detection
      const pricingHref = $('a').filter((_, a) => /pricing|plans/i.test($(a).text() || $(a).attr('href') || '')).first().attr('href');
      const pricingPageUrl = pricingHref ? absoluteUrl(pricingHref, website) : null;

      // Social links from footer
      const socialLinks: string[] = [];
      $('a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="x.com"], a[href*="facebook.com"], a[href*="instagram.com"], a[href*="youtube.com"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !socialLinks.includes(href)) socialLinks.push(href);
      });

      const footerText = cleanText($('footer').first().text(), 800);
      const ogImage = absoluteUrl($('meta[property="og:image"]').attr('content'), website);

      const data: ScrapedSite = {
        title,
        metaDescription,
        headlines,
        paragraphs,
        aboutText,
        footerText,
        socialLinks: socialLinks.slice(0, 8),
        pricingPageUrl,
        ogImage,
      };

      const score = [title, metaDescription, headlines.length, paragraphs.length, aboutText].filter(Boolean).length;
      const confidence = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';

      return { data, confidence: confidence as 'high' | 'medium' | 'low' };
    } catch (e) {
      return { data: null, confidence: 'low' as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

  return { ...result, source: 'cheerio', durationMs };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await gotScraping({
    url,
    timeout: { request: 7000 },
    headerGeneratorOptions: { browsers: [{ name: 'chrome', minVersion: 110 }] },
    followRedirect: true,
    https: { rejectUnauthorized: false }, // tolerate self-signed certs in dev
  });

  if (!res.ok) throw new Error(`HTTP ${res.statusCode}`);
  if (res.body.length > MAX_BYTES) return res.body.slice(0, MAX_BYTES);
  return res.body;
}
