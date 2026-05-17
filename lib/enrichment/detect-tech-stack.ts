import * as cheerio from 'cheerio';
import { gotScraping } from 'got-scraping';
import type { EnrichmentResult, TechStack } from './types';
import { timed, withTimeout } from './utils';

const TIMEOUT_MS = 7000;

interface TechSignature {
  name: string;
  category: keyof Omit<TechStack, 'raw'>;
  test: (ctx: { headers: Record<string, string>; html: string; scripts: string[]; meta: Record<string, string>; cookies: string[] }) => boolean;
}

const SIGNATURES: TechSignature[] = [
  // Frontend frameworks
  { name: 'Next.js', category: 'frontend', test: ({ headers, html }) => headers['x-powered-by']?.toLowerCase().includes('next') || /_next\/static/.test(html) },
  { name: 'React', category: 'frontend', test: ({ html, scripts }) => scripts.some(s => /react/i.test(s)) || /__NEXT_DATA__|data-reactroot/.test(html) },
  { name: 'Vue.js', category: 'frontend', test: ({ html, scripts }) => /v-cloak|__vue__/.test(html) || scripts.some(s => /vue\.runtime|vue\.min/.test(s)) },
  { name: 'Svelte', category: 'frontend', test: ({ html }) => /svelte-/.test(html) },
  { name: 'Tailwind CSS', category: 'frontend', test: ({ html }) => /class="[^"]*\b(?:flex|grid|bg-(?:white|gray|black)|text-(?:sm|base|lg)|p[xy]?-\d|m[xy]?-\d)\b/.test(html) },

  // CMS / website builders
  { name: 'WordPress', category: 'cms', test: ({ meta, html }) => /wordpress/i.test(meta.generator || '') || /wp-content|wp-includes/.test(html) },
  { name: 'Webflow', category: 'cms', test: ({ html, meta }) => /webflow/i.test(meta.generator || '') || /w-webflow/.test(html) },
  { name: 'Framer', category: 'cms', test: ({ meta, html }) => /framer/i.test(meta.generator || '') || /framerusercontent\.com/.test(html) },
  { name: 'Shopify', category: 'cms', test: ({ html, headers }) => /cdn\.shopify\.com/.test(html) || /shopify/i.test(headers['x-shopify-stage'] || '') },
  { name: 'Wix', category: 'cms', test: ({ meta }) => /wix\.com/i.test(meta.generator || '') },

  // Analytics
  { name: 'Google Analytics', category: 'analytics', test: ({ html, scripts }) => /gtag\(|google-analytics\.com|googletagmanager\.com/.test(html) || scripts.some(s => /googletagmanager|google-analytics/.test(s)) },
  { name: 'Mixpanel', category: 'analytics', test: ({ html, scripts }) => /mixpanel/i.test(html) || scripts.some(s => /mixpanel/i.test(s)) },
  { name: 'Segment', category: 'analytics', test: ({ html, scripts }) => /analytics\.segment|cdn\.segment/.test(html) || scripts.some(s => /segment\.com\/analytics/.test(s)) },
  { name: 'Amplitude', category: 'analytics', test: ({ html, scripts }) => /amplitude/i.test(html) || scripts.some(s => /amplitude/i.test(s)) },
  { name: 'PostHog', category: 'analytics', test: ({ html, scripts }) => /posthog/i.test(html) || scripts.some(s => /posthog/i.test(s)) },
  { name: 'Hotjar', category: 'analytics', test: ({ html, scripts }) => /hotjar/i.test(html) || scripts.some(s => /hotjar/i.test(s)) },

  // Marketing / CRM
  { name: 'HubSpot', category: 'marketing', test: ({ html, scripts, cookies }) => /hs-scripts|hubspot/i.test(html) || scripts.some(s => /hubspot/i.test(s)) || cookies.some(c => /hubspotutk/.test(c)) },
  { name: 'Intercom', category: 'marketing', test: ({ html, scripts }) => /intercom/i.test(html) || scripts.some(s => /intercom/i.test(s)) },
  { name: 'Drift', category: 'marketing', test: ({ html, scripts }) => /drift\.com/i.test(html) || scripts.some(s => /drift/i.test(s)) },
  { name: 'Mailchimp', category: 'marketing', test: ({ html }) => /mailchimp|list-manage/i.test(html) },

  // Infra
  { name: 'Vercel', category: 'infra', test: ({ headers }) => /vercel/i.test(headers['server'] || '') || !!headers['x-vercel-id'] },
  { name: 'Netlify', category: 'infra', test: ({ headers }) => /netlify/i.test(headers['server'] || '') || !!headers['x-nf-request-id'] },
  { name: 'Cloudflare', category: 'infra', test: ({ headers }) => /cloudflare/i.test(headers['server'] || '') || !!headers['cf-ray'] },
  { name: 'AWS CloudFront', category: 'infra', test: ({ headers }) => /cloudfront/i.test(headers['via'] || '') || !!headers['x-amz-cf-id'] },

  // Payments
  { name: 'Stripe', category: 'payments', test: ({ html, scripts }) => /js\.stripe\.com/.test(html) || scripts.some(s => /stripe\.com/.test(s)) },
  { name: 'Razorpay', category: 'payments', test: ({ html, scripts }) => /razorpay/i.test(html) || scripts.some(s => /razorpay/i.test(s)) },
  { name: 'PayPal', category: 'payments', test: ({ html, scripts }) => /paypal\.com\/sdk/.test(html) || scripts.some(s => /paypal/i.test(s)) },
];

export async function detectTechStack(website: string | null): Promise<EnrichmentResult<TechStack>> {
  const { result, durationMs } = await timed(async () => {
    if (!website) {
      return { data: null, confidence: 'low' as const, error: 'no_website_provided' };
    }

    try {
      const res = await withTimeout(
        gotScraping({
          url: website,
          timeout: { request: 6000 },
          headerGeneratorOptions: { browsers: [{ name: 'chrome', minVersion: 110 }] },
        }),
        TIMEOUT_MS,
        'techstack'
      );

      if (!res.ok) throw new Error(`HTTP ${res.statusCode}`);

      const html = res.body;
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers)) {
        headers[k.toLowerCase()] = Array.isArray(v) ? v.join(',') : (v || '').toString();
      }

      const cookies = (res.headers['set-cookie'] as string[] | undefined) || [];

      const $ = cheerio.load(html);
      const meta: Record<string, string> = {};
      $('meta').each((_, el) => {
        const name = ($(el).attr('name') || $(el).attr('property') || '').toLowerCase();
        const content = $(el).attr('content');
        if (name && content) meta[name] = content;
      });

      const scripts: string[] = [];
      $('script[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) scripts.push(src);
      });

      const stack: TechStack = {
        frontend: [],
        analytics: [],
        marketing: [],
        infra: [],
        cms: [],
        payments: [],
        raw: [],
      };

      const ctx = { headers, html, scripts, meta, cookies };
      for (const sig of SIGNATURES) {
        try {
          if (sig.test(ctx)) {
            const arr = stack[sig.category];
            if (!arr.includes(sig.name)) arr.push(sig.name);
          }
        } catch {
          // signature crash — skip silently
        }
      }

      const totalDetected = stack.frontend.length + stack.analytics.length + stack.marketing.length + stack.infra.length + stack.cms.length + stack.payments.length;
      const confidence = totalDetected >= 4 ? 'high' : totalDetected >= 2 ? 'medium' : 'low';

      return { data: stack, confidence: confidence as 'high' | 'medium' | 'low' };
    } catch (e) {
      return { data: null, confidence: 'low' as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

  return { ...result, source: 'header+meta-sniff', durationMs };
}
