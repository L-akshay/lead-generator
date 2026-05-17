This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Setup

### One-time Supabase Storage setup

1. Supabase dashboard → Storage → New bucket
2. Name: `audit-pdfs`, Public: ON, file size limit: 10 MB, allowed MIME: `application/pdf`
3. Bucket → Policies → Use template "Allow public access to all files in a bucket"

### One-time Google setup

1. Google Cloud Console → new project → enable Google Sheets API + Google Drive API.
2. Create a service account → generate JSON key → save `client_email` and `private_key`.
3. Create a Google Sheet titled "SimplifIQ Leads" with row-1 headers: `Timestamp | Name | Email | Company | Website | Status | PDF URL | Lead ID`. Share with the service account email (Editor). Copy the sheet ID from the URL.
4. Create a Google Drive folder titled "SimplifIQ Audit PDFs". Share with the service account email (Editor). Copy the folder ID from the URL.
5. Paste into `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (with `\n` for newlines, in double quotes)
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_DRIVE_FOLDER_ID`

### Resend setup

1. https://resend.com → new API key.
2. For the demo, the free `onboarding@resend.dev` sender works (may land in spam). For production, add a domain and verify DNS.
3. Paste into `.env.local`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO` (optional).

### Supabase: add the deliver-stage columns

Run in SQL Editor:

```sql
alter table leads add column if not exists drive_archived_at timestamptz;
alter table leads add column if not exists drive_file_id text;
```

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

## PDF Rendering (Block 5)

PDFs are generated server-side with **@react-pdf/renderer** — React components compiled directly to PDF buffers in pure Node. No Chromium, no Puppeteer cold-start penalty on serverless.

The document is 5 pages: cover, executive summary + snapshot, positioning + strengths, opportunities, next steps + closing. A single `theme.ts` holds design tokens; the cover page accent color is dynamically pulled from the prospect's detected `theme-color` meta tag during enrichment, falling back to SimplifIQ's brand orange. The logo is fetched and embedded from `og:image` or `apple-touch-icon`, with a HEAD probe to gracefully skip if the URL is unreachable.

Buffers upload to a public Supabase Storage bucket (`audit-pdfs`); the returned public URL is persisted on the lead row and used by the email step in Block 6.

## Delivery Pipeline (Block 6)

Three side effects run in parallel via `Promise.allSettled` once the PDF is rendered:

| Side effect    | Tool / API                          | Idempotency guard          |
|----------------|-------------------------------------|----------------------------|
| Email + PDF    | Resend (with attachment)            | `leads.email_sent_at`      |
| Lead tracker   | Google Sheets API (append row)      | `leads.sheets_logged_at`   |
| PDF archive    | Google Drive API (upload to folder) | `leads.drive_archived_at`  |

**Idempotency:** each side effect first checks its dedicated timestamp column on the lead and skips if already populated. This means an Inngest retry of the deliver step never sends a duplicate email or appends a duplicate sheet row — critical for any system that touches real-world side effects.

**Completion policy:** the prospect-facing side effect is email — Sheets and Drive are operational bonuses. If email fails, the function throws and Inngest retries with exponential backoff. If email succeeds but Sheets or Drive fail, the failure is appended to `error_log` for visibility and the lead is still marked `completed`. This is the *graceful degradation* pattern: never let a logging failure block a customer-facing delivery.

**Google service account auth:** one JWT-based service account is scoped for both Sheets and Drive ([lib/google/auth.ts](lib/google/auth.ts)). Setup is documented in the README "Setup" section.
