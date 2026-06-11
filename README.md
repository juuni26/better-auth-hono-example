# Vellum — consumer fintech onboarding demo

**Live: [vellum.juuni.dev](https://vellum.juuni.dev)** — Stripe runs in test
mode; complete checkout with card `4242 4242 4242 4242`, any future expiry, any CVC.

Landing → signup → subscription → payment → dashboard, built end-to-end on the
job's exact stack. Runs locally with **zero keys** (Stripe demo mode) and flips
to live Stripe when keys are present — see **[HANDOFF.md](./HANDOFF.md)** for
the remaining fill-in values.

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, TanStack **Router / Query / Table / Virtual**, shadcn/ui-style components, Tailwind v4, Motion |
| Backend | **Hono** on **Cloudflare Workers** (single app via `@cloudflare/vite-plugin`) |
| Auth | **better-auth** (email + password) with the Drizzle adapter |
| DB | Cloudflare **D1** via **Drizzle ORM** (migrations in `drizzle/`) |
| Payments | **Stripe** Checkout + webhooks (signature-verified, idempotent) |
| E2E | Playwright — 40 tests across the full journey, desktop + 375px mobile |

## Run it

```sh
bun install                # or npm install
npm run db:migrate         # apply migrations to local D1 (.wrangler/state)
npm run dev -- --port 5174 # http://localhost:5174
```

Sign up with any email/password (≥8 chars) — payment runs in demo mode until
Stripe keys are configured.

## Test it

```sh
npx playwright test        # uses system Chrome (channel: 'chrome'), 40 tests
node scripts/screenshot.mjs  # BASE_URL=http://localhost:5174 — walks the whole
                             # flow and drops 375/1280 screenshots into shots/
```

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Vite dev server — SPA + worker + local D1 together |
| `npm run build` | Client + worker production build |
| `npm run typecheck` | `tsc --noEmit` (TS 6, strict) |
| `npm run db:generate` | Drizzle migration from `src/worker/db/schema.ts` |
| `npm run db:migrate` / `db:migrate:remote` | Apply migrations local / remote |
| `npm run deploy` | Build + `wrangler deploy` (needs HANDOFF §4 filled) |

## How the money flows

```
signup (better-auth, session cookie)
  → /onboarding  plan select
      free plan     → POST /api/checkout → subscription active
      paid + keys   → Stripe Checkout redirect → webhook activates
      paid, no keys → demo mode: server simulates what the webhook would write
  → /dashboard   D1-backed ledger (seeded once per user), balance chart,
                 virtualized table, send / vaults / top-up
  → /billing     switch tier, cancel, Stripe billing portal (live mode)
```

Webhook (`POST /api/stripe/webhook`): raw-body signature verification via
`constructEventAsync` + SubtleCrypto provider (Workers-safe), idempotency via
`stripe_event` insert with `ON CONFLICT DO NOTHING` — replays ack and no-op.

## Layout

```
src/
  worker/          Hono app: auth.ts (better-auth), stripe.ts (checkout/portal/webhook),
                   transactions.ts (ledger + seed), db/schema.ts (Drizzle), index.ts (routes)
  app/             SPA: routes/ (TanStack file-based), components/ (ui kit + brand),
                   lib/ (auth client, query options, utils)
  shared/plans.ts  plan catalog used by both worker and app
e2e.test.ts        Playwright suite · playwright.config.ts
HANDOFF.md         ← every FILL-ME value, Stripe/Cloudflare setup
```
