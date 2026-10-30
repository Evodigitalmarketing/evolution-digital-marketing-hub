# Label Source Instant Quote Agent

Conversational quote-and-order portal for custom printed labels. A customer describes their product in plain words; the advisor turns that into a label spec, the pricing engine returns a **binding price**, the customer uploads artwork, approves a proof, and pays. Built by Evolution Digital Marketing for Label Source (Winnipeg) as the first customer of a product intended for other print shops.

**Status: working demo with placeholder pricing.** Nothing here should be shown to a real customer until Label Source's rate card replaces `src/lib/pricing/rate-card.placeholder.json`.

## What's in the demo

- `/` — the conversation. Needs-first: product → container → environment → look → quantity → size (with container-based suggestions) → application → artwork → contact. Every material choice is explained in one plain sentence.
- `/quote/[id]` — shareable quote page: price, nearby quantities, "why this price", technical spec; artwork upload with automated preflight; proof view with trim and safe-area guides; rights confirmation; approval; checkout (stub).
- `/admin` — quotes list, auto-priced rate, escalations, rate-card version. No login in the demo.
- API: `POST /api/quotes`, `GET /api/quotes/[id]`, `POST /api/quotes/[id]/artwork`, `POST /api/quotes/[id]/approve`.

## Architecture

| Layer | Where | Notes |
|---|---|---|
| Pricing engine | `src/lib/pricing/engine.ts` | Pure function of (rate card, spec). Validated card, quantity breaks, uplifts, setup/die charges, min order, out-of-range detection, alternatives. Versioned. Tests in `tests/`. |
| Rate card | `src/lib/pricing/rate-card.placeholder.json` | Mirrors the sheet spec in the build plan. Production: loaded from the owners' Google Sheet on a schedule. |
| Advisor | `src/lib/advisor/recommend.ts` | Needs → spec with reasons and flags (regulated category, no artwork, size help, printer). This is the "how the owners advise customers" knowledge base; placeholder rules until the working session with Label Source. |
| Conversation | `src/lib/conversation/steps.ts` | Steps as data, so the same flow runs on web, SMS, or as an LLM agent's tool schema. |
| Preflight | `src/lib/artwork/preflight.ts` | PDF/AI page size vs. label + 0.125" bleed; raster dpi at label size; aspect ratio; colour space note. Anything it can't determine is a note for prepress, not a pass. |
| Quote store | `src/lib/quotes/store.ts` | Supabase when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set; JSON file locally; memory as last resort. |
| UI | `src/components/` | Mobile-first. Brand colours from labelsource.ca. |

The LLM never computes a price. When the conversational layer becomes an LLM agent (phase 1b), `priceQuote` and `recommend` are its tools and it can only repeat what they return.

## Run locally

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
npm test             # pricing engine tests
```

## Deploy

Vercel (Next.js). Set env vars:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — quote storage (table `quotes`: `id text primary key, data jsonb, status text, created_at timestamptz`).

Artwork files are not persisted in the demo (only a hash and a preview). Production adds object storage (Supabase Storage or S3).

## What production adds (see the build plan)

- Real rate card and replay against 20–30 past quotes before launch
- WooCommerce order creation via REST + Stripe checkout; order references the quote ID
- GHL: SMS and email channels, pipeline, owner notifications, pause switch
- LLM conversation layer on top of the step schema
- Owner login on `/admin`; rate-card reload; approval mode for the first two weeks
- Returning customers, order history, one-click reorder
