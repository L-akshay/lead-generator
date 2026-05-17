This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Enrichment Pipeline (Block 3)

Four parallel enrichment sources run via `Promise.allSettled`:

| Source        | Tool                    | Purpose                                  |
|---------------|-------------------------|------------------------------------------|
| Website scrape| Cheerio + got-scraping  | Marketing copy, headlines, about, social |
| Company search| Tavily API              | Funding, competitors, news, summary      |
| Branding      | meta tag extraction     | Logo, favicon, theme color, brand name   |
| Tech stack    | header + script sniff   | 30+ signatures across 6 categories       |

Each source returns `{ data, source, confidence, error?, durationMs }`. The orchestrator never throws — failures degrade gracefully. Each external call has its own timeout (`withTimeout`) and retries with exponential backoff (`retryWithBackoff`).

## Audit Generation (Block 4)

Gemini 2.5 Flash produces the audit via Google's **structured output** feature (`responseMimeType: 'application/json'` + `responseSchema`), which forces JSON matching our schema. The audit has 8 sections: cover, executive summary, company snapshot, industry positioning, observed strengths, opportunity areas, next steps, closing note. Every field is validated post-generation with Zod (defense in depth — LLMs occasionally violate their own response schemas).

The prompt briefs Gemini like a senior strategy consultant: enrichment dossier first, then strict output rules (specificity, no fabrication, evidence citation, professional voice). Temperature 0.4 balances grounded language with non-robotic phrasing.

**Why Flash over Sonnet:** Single-vendor stack on Gemini reduces auth and SDK complexity. Flash handles structured analytical output well at significantly lower cost and faster latency than premium models. Tradeoff: marginal quality loss vs. operational simplicity — worth benchmarking against Sonnet if quality data showed it materially improved conversion.
