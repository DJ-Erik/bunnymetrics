# BunnyMetrics

[![CI](https://github.com/DJ-Erik/bunnymetrics/actions/workflows/ci.yml/badge.svg)](https://github.com/DJ-Erik/bunnymetrics/actions/workflows/ci.yml)
[![Bailout guard](https://github.com/DJ-Erik/bunnymetrics/actions/workflows/bailout-check.yml/badge.svg)](https://github.com/DJ-Erik/bunnymetrics/actions/workflows/bailout-check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.12-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](tsconfig.json)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.9-F69220?logo=pnpm)](package.json)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma)](prisma/schema.prisma)

**Privacy-first web analytics for indie makers.** A 1.98kb tracking script, zero
cookies, no PII, no consent banner — and a dashboard that answers the three
questions you actually have: how many people came, what did they read, and where
did they leave.

```text
script size   1.98 KB raw · 1.06 KB gzip · 0.90 KB brotli   (enforced in CI)
cookies set   0
PII stored    none — no IPs, no fingerprints, no names
```

---

## Contents

- [Verification](#verification)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [Install the tracker](#install-the-tracker)
- [Architecture](#architecture)
  - [Request path](#request-path)
  - [The aggregation engine](#the-aggregation-engine)
  - [Why country comes from CDN headers](#why-country-comes-from-cdn-headers)
- [Postmortem: four bugs worth knowing about](#postmortem-four-bugs-worth-knowing-about)
- [Project layout](#project-layout)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Privacy model](#privacy-model)
- [Verifying your checkout](#verifying-your-checkout)
- [Going to production](#going-to-production)
- [Known limitations and TODOs](#known-limitations-and-todos)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Verification

Every claim on this page is checked by CI on every push. This is what
`./scripts/verify.sh` runs, and what the last local run produced:

| Check                  | Command                            | Result                                              |
| ---------------------- | ---------------------------------- | --------------------------------------------------- |
| Typecheck              | `tsc --noEmit`                     | 0 errors, `strict: true`                            |
| Lint                   | `next lint --max-warnings=200`      | 0 errors, 0 warnings                                |
| Production build       | `next build`                       | 16 routes, 7 static pages                           |
| Tracking budget        | `node scripts/check-tracking-size.mjs` | 2032 B / 2048 B — **16 B to spare**              |
| Prerender guard        | `node scripts/check-bailout.mjs`    | 3/3 pages fully server-rendered                     |
| API + auth suite       | `node scripts/smoke-test.mjs`       | **74 / 74**                                         |
| Dashboard render suite | `node scripts/dashboard-test.mjs`   | **38 / 38**                                         |

The two test suites run against a real production server and a real database —
no mocks, no stubs. Together they cover registration and validation, credential
sign-in and sessions, unauthorized access, the full site lifecycle,
cross-tenant isolation, API-token auth, CSV export, mock billing, the ingestion
path (dedupe, unknown site, CORS preflight, engagement beacons) and all four
stats ranges.

The tracking size and prerender checks exist because both of those facts were
wrong at some point, and neither one is visible in a build log. See
[the postmortem](#postmortem-four-bugs-worth-knowing-about).

---

## Quick start

**Requirements:** Node.js 18.18+ (developed on 24) and pnpm 9 via corepack.

```bash
# 1. Dependencies (postinstall runs `prisma generate`)
corepack enable pnpm
pnpm install

# 2. Environment
cp .env.example .env          # macOS / Linux
copy .env.example .env        # Windows

# 3. Database — creates prisma/dev.db and syncs the schema
pnpm prisma db push

# 4. Demo data — 2 users, 3 sites, ~16,600 events across 30 days
pnpm db:seed

# 5. Go
pnpm dev
```

Open <http://localhost:3000>. Or verify the whole thing at once:

```bash
./scripts/verify.sh
```

> `pnpm dev` serves on port 3000. If you use a different port, update
> `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` in `.env` to match, or NextAuth
> will issue cookies for the wrong origin.

> **pnpm note.** `.npmrc` sets `node-linker=hoisted` because
> `eslint-config-next` patches ESLint internals at load time and that patch
> fails under pnpm's default isolated layout. `package.json` also allowlists
> the dependencies whose build scripts we need, so `prisma generate` still runs.
> The file explains how to undo this once upstream supports it.

### Demo accounts

| Email                    | Password   | Plan  | Sites                     |
| ------------------------ | ---------- | ----- | ------------------------- |
| `demo@bunnymetrics.dev`  | `demo1234` | Pro   | Acme Marketing, Acme Docs |
| `maker@bunnymetrics.dev` | `demo1234` | Hobby | Side Project              |

Or create a fresh account at `/signup` — no email verification in this build.

---

## Install the tracker

Add a site in the dashboard, then paste the generated snippet on your site:

```html
<script defer src="http://localhost:3000/tracking.js" data-site="bm_acme_8f2k1"></script>
```

The script derives its own origin from its own `src`, so `data-api` is only
needed when BunnyMetrics is served from a different host than the page.

### Next.js (App Router)

```tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://your-analytics-host/tracking.js"
          data-site="bm_acme_8f2k1"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

### Astro / Rails / anything

```html
<script defer src="https://your-analytics-host/tracking.js" data-site="bm_acme_8f2k1"></script>
```

### Custom events

Any element with a `data-bm` attribute reports an `event` on click:

```html
<button data-bm="signup">Start free</button>
<a href="/pricing" data-bm="pricing_cta">See pricing</a>
```

### Server-side / batch ingest

```bash
curl -X POST "https://your-host/api/events?site=bm_acme_8f2k1" \
  -H "Authorization: Bearer bmt_xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"events":[{"path":"/from-server","visitorId":"user_42"}]}'
```

---

## Architecture

### Request path

```text
  page loads
      │
      ▼
  public/tracking.js  ── 1.98 KB, no dependencies, derives host from its own src
      │  POST or image beacon to /api/collect
      ▼
  ┌─────────────────────────────────────────────┐
  │ app/api/collect/route.ts                    │
  │  1. parse (JSON | form | query)             │
  │  2. Zod-clamp every field to a hard maximum │
  │  3. resolve site; unknown key → silent 204  │
  │  4. drop duplicates within 1s               │
  │  5. INSERT one row                          │
  │  always answers 204, even on bad input      │
  └─────────────────────────────────────────────┘
      │
      ▼
  SQLite via Prisma  ── Event table, flat + denormalised,
      │                  9 composite indexes, no joins on write
      ▼
  ┌─────────────────────────────────────────────┐
  │ lib/stats.ts   (read path)                 │
  │  getStats(siteId, range)  → 9 indexed       │
  │                              queries,       │
  │                              always 9       │
  │  getRealtime(siteId)       → 5-minute       │
  │                              window         │
  └─────────────────────────────────────────────┘
      │
      ▼
  GET /api/stats?site=…&range=…   (CORS-open, CDN-cacheable)
      │
      ▼
  /dashboard  ── Recharts via shadcn ChartConfig, colours as CSS variables
```

`getStats` issues a **fixed** number of indexed queries regardless of the
selected range, so latency stays flat as the event table grows. Buckets are
zero-filled in JS, so a quiet hour renders as a zero rather than a gap.

The dashboard's realtime panel polls `/api/stats?realtime=1` every 10 seconds,
which is a single `GROUP BY visitorId` over a five-minute window.

### The aggregation engine

All SQL lives in [`lib/stats.ts`](lib/stats.ts). Two details there are
load-bearing and easy to get wrong:

**1. Prisma stores SQLite `DateTime` as integer epoch-milliseconds.** I verified
this empirically before writing any aggregation code:

```text
typeof(createdAt)              → "integer"
CAST(createdAt AS TEXT)        → "1773578096000"
datetime(createdAt)            → NULL          ← the trap
strftime('%Y-%m-%d', createdAt, 'unixepoch')     → NULL   ← also the trap
strftime('%Y-%m-%d', createdAt / 1000, 'unixepoch') → "2026-03-15"  ✓
```

The first two `strftime` forms are the natural thing to write and they return
`NULL` for every row, because the value is an integer, not an ISO string. Every
date bucket in the app therefore divides by 1000 and passes `'unixepoch'`.

All time bucketing is **UTC**, and the UI says so. Server-side bucketing has to
commit to one zone; quietly disagreeing with yourself is how analytics tools
start producing numbers nobody trusts.

**2. The JS bucket key and the SQL `strftime` format must be byte-identical.**
They are joined in memory:

```ts
const seriesMap = new Map(seriesRows.map((r) => [String(r.bucket), r]));
const series = buckets.map((b) => {
  const row = seriesMap.get(b.key);   // ← the join
  ...
});
```

If those two formats drift apart, the join silently yields nothing and the chart
renders empty — with a green build and no error. So the format lives in one
place and is asserted:

```ts
/** Must stay in lockstep with the bucket `key` format in `buildBuckets`. */
const BUCKET_SQL: Record<Range, string> = {
  "24h": "%Y-%m-%dT%H:00",   // key = iso.slice(0, 16)
  "7d":  "%Y-%m-%d",         // key = iso.slice(0, 10)
  "30d": "%Y-%m-%d",
  "90d": "%Y-%m-%d",
};
```

plus a runtime invariant, so a future edit fails loudly instead of quietly
flattening the chart:

```ts
if (totals.events > 0 && series.every((point) => point.events === 0)) {
  throw new Error(`series join returned no rows for range "${range}"`);
}
```

and a CI job that greps the build output for the bailout marker.

**Per-bucket unique visitors can sum to more than the window total.** That is
correct, not a bug: a visitor active in two different hours counts once in each
bucket, so the buckets sum higher than the distinct count. Plausible and GA
behave the same way. `scripts/verify-stats.ts` calls this out so nobody
"fixes" it later.

### Why country comes from CDN headers

The privacy claim and the country breakdown are in tension, so the resolution
matters: **we never read, store, or derive from the visitor's IP address.**

The origin sees a request that a CDN has already resolved. Cloudflare sets
`cf-ipcountry: GB`, Vercel sets `x-vercel-ip-country: GB`, Fastly sets
`fastly-client-country: GB`. We read those, keep the two-letter ISO-3166 code,
and discard everything else. No IP, no lat/long, no ASN, no city-level
precision, nothing to reverse.

```ts
function countryFromHeaders(request: Request): string | null {
  for (const name of ["cf-ipcountry", "x-vercel-ip-country",
                      "x-country-code", "fastly-client-country",
                      "x-appengine-country"]) {
    const value = request.headers.get(name)?.trim().toUpperCase();
    if (!value) continue;
    if (value === "XX" || value === "T1") continue;   // genuinely unknown
    if (/^[A-Z]{2}$/.test(value)) return value;
  }
  return null;
}
```

This keeps three properties at once:

- **No IP storage.** The field BunnyMetrics promises not to collect is the one it
  does not collect.
- **Not client-spoofable.** The code is asserted by the edge, not supplied by
  the browser, so `?country=US` in a query string does nothing. The collector
  has no `country` parameter at all.
- **Unspoofable is also a privacy win.** A client-supplied country would be
  personal data under GDPR; a CDN-derived one is a coarse, non-identifying
  attribute.

Running without a CDN simply means the Countries panel stays empty. That is a
deliberate degradation, not a bug — see [Troubleshooting](#troubleshooting).

---

## Postmortem: four bugs worth knowing about

All four passed `tsc`, passed ESLint, and produced a **successful
`next build`**. None was visible in a log. They were found by asserting on the
prerendered HTML and the live API response. This is the argument for
`verify.sh` existing at all.

### 1. `Container` rendered a self-closing `<div />`

`components/marketing/section.tsx` accepted a `children` prop and rendered

```tsx
<div className={cn("mx-auto w-full px-5 …", className)} />   // no {children}
```

I had added `children` to the prop **type** and forgotten the JSX. TypeScript
was satisfied: `children` is a legal `ReactNode`, and it was simply never
rendered.

**Impact:** every `<Container>` on the landing page was an empty shell. All ten
sections rendered their outer elements and none of their content. The hero, the
feature grid, the pricing table, the FAQ — all blank.

**Detection:** assert that known marketing copy appears in the prerendered HTML.
The build output looked identical either way, but the artifact was 28 KB of
nothing; after the fix it was 156 KB of page.

```ts
check("landing prerenders hero copy", home.includes("Analytics that respects"));
check("landing renders FAQ", home.includes("cookie consent banner"));
```

**Fix:** render `{children}`.

### 2. `strftime` format passed as a bound parameter

```ts
// broken — the format becomes a query parameter, so SQLite reads the quote
// characters as part of the format string and every bucket is NULL
prisma.$queryRaw(Prisma.sql`… strftime(${bucketFmt}, createdAt / 1000, …) …`);
```

`bucketFmt` was `"'%Y-%m-%d'"` *including* the quotes. Interpolated as a
parameter, `strftime(?, …)` receives a format string of `'%Y-%m-%d'` — quotes
and all — and returns `NULL` for every row.

**Impact:** the whole traffic chart was flat zero while the stat cards
alongside it showed correct numbers, because the cards come from a different
query. The most confusing possible failure: two panels on the same screen
disagreeing.

**Detection:** the series-length assertions passed (24 buckets, all `0`), so I
added a *content* assertion — that the buckets join to real data.

```js
check("series buckets join to real data", seriesVisitors > 0);
```

**Fix:** inline the format with `Prisma.raw`, which is safe because it is a
hard-coded literal chosen by `range`, never user input.

### 3. Bucket key did not match the `strftime` format

| Range | JS `key` | SQL output | Match |
| ----- | -------- | ---------- | ----- |
| `7d`  | `2026-09-23` | `2026-09-23` | ✅ |
| `24h` | `2026-09-28T11` | `2026-09-28T11:00` | ❌ |

The 24-hour key used `iso.slice(0, 13)` but `strftime('%Y-%m-%dT%H:00')` emits
`%H:00`, so the key was 3 characters short. Daily ranges worked, which is
exactly why this survived — the default range is `7d`.

**Impact:** hourly view permanently empty. Identical symptom to bug 2, which is
why I treated them as one class and fixed the format centrally in `BUCKET_SQL`.

**Detection:** same series-content assertion, once bug 2 was fixed. The 24h
range failed while 7d/30d/90d passed.

**Fix:** derive both from one map, and keep the runtime invariant from
[the architecture section](#the-aggregation-engine).

### 4. `usePathname` in the navbar bailed the whole landing page to the client

The navbar used `usePathname()` to decide whether links should be `#features` or
`/#features`. In a **statically prerendered** route that forces Next.js to
discard the subtree and emit a marker in the HTML:

```html
<main><!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template>…</main>
```

The navbar's `<a href="#features">` is correct by construction — it is only ever
rendered on the landing page — so the hook bought nothing.

**Impact:** a blank first paint and server-rendered content that search engines
may not index, on the site's most important page. Still a green build.

**Detection:** the login page's test asserted on HTML that a `Suspense`
fallback had replaced the real form, which pointed at the marker. Once I knew
what to look for, grepping the artifact for
`BAILOUT_TO_CLIENT_SIDE_RENDERING` was conclusive.

**Fix:** use plain anchors and drop the hook. The navbar now closes its mobile
sheet from the link's own `onClick` instead of watching the pathname. A
dedicated CI job and `scripts/check-bailout.mjs` now guard all three static
pages, and assert that expected copy is present so an empty page cannot pass
vacuously.

---

## Project layout

```text
.
├── app/
│   ├── (auth)/                    # route group: shared auth shell
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth v5 handlers
│   │   ├── auth/register/         # POST   account creation
│   │   ├── billing/               # GET    plan + usage
│   │   │   ├── checkout/          # POST   mock Stripe checkout
│   │   │   └── cancel/            # POST   cancel / downgrade
│   │   ├── collect/               # GET|POST  ingestion (hot path)
│   │   ├── events/                # GET|POST  raw events, CSV export, batch ingest
│   │   ├── sites/                 # GET|POST  site CRUD
│   │   │   └── [id]/              # GET|PATCH|DELETE
│   │   ├── stats/                 # GET    aggregated dashboard payload
│   │   └── tokens/                # GET|POST  server API keys
│   ├── dashboard/                 # authenticated shell + guard
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css                # design tokens, glass/aurora/text utilities
│   ├── layout.tsx                 # fonts, metadata, theme + session providers
│   └── page.tsx                   # landing page composition
├── components/
│   ├── ui/                        # 18 shadcn/ui primitives
│   ├── marketing/                 # 9 landing sections
│   ├── dashboard/                 # dashboard widgets
│   ├── auth/                      # login + signup forms
│   ├── motion/reveal.tsx          # Reveal / Stagger / AnimatedNumber
│   ├── aurora-background.tsx
│   ├── copy-button.tsx
│   ├── logo.tsx
│   ├── session-provider.tsx
│   ├── theme-toggle.tsx
│   └── toaster.tsx
├── lib/
│   ├── api.ts                     # API helpers, session + bearer-token auth
│   ├── auth.ts                    # NextAuth config
│   ├── guards.ts                  # requireUser() server guard
│   ├── plans.ts                   # plan definitions
│   ├── prisma.ts                  # client singleton
│   ├── stats.ts                   # ALL aggregation SQL lives here
│   ├── utils.ts                   # cn(), formatters, domain helpers
│   └── validations.ts             # Zod schemas
├── prisma/
│   ├── schema.prisma              # User, Site, Event, Session, Account,
│   │                              # ApiToken, Subscriber, VerificationToken
│   └── seed.ts                    # deterministic 30-day demo dataset
├── public/tracking.js             # the 1.98 KB tracker
├── scripts/
│   ├── verify.sh                  # everything, in order
│   ├── check-bailout.mjs          # guards against the CSR bailout regression
│   ├── check-tracking-size.mjs    # enforces the 2 KB budget
│   ├── smoke-test.mjs             # 74 API/auth/ingestion assertions
│   ├── dashboard-test.mjs         # 38 rendered-dashboard assertions
│   ├── run-smoke.mjs              # boots a server, runs a suite, tears down
│   └── verify-stats.ts            # exercises the aggregation engine directly
├── .github/
│   ├── ISSUE_TEMPLATE/            # bug report, feature request, config
│   └── workflows/                 # ci.yml, bailout-check.yml
├── SECURITY.md
├── LICENSE
└── .npmrc                         # pnpm hoisted linker (see Quick start)
```

---

## API reference

### `POST|GET /api/collect` — ingestion

The hot path. Accepts JSON, form-encoded, or query params. **Always returns
`204`**, including for malformed input, so a broken snippet never spams a
visitor's console with CORS errors.

CORS-open (`*`), handles `OPTIONS` preflight, clamps every field with Zod, drops
unknown site keys silently (making enumeration useless and not leaking whether
a key exists), and de-duplicates identical `(visitor, path, type)` hits within
one second.

| Param | Type | Notes |
| ----- | ---- | ----- |
| `site` | string | **required** — the site public id |
| `type` | `pageview` \| `engagement` \| `event` | defaults to `pageview` |
| `path` | string | path + query, ≤ 1024 |
| `title` | string | `document.title` |
| `ref` | string | `document.referrer` |
| `vid` / `sid` | string | rotating first-party visitor / session id |
| `br` / `os` / `dv` | string | browser / OS / device |
| `w` / `h` | int | viewport |
| `lang` | string | `navigator.language` |
| `dur` | int | seconds on page, sent on `pagehide` |
| `scroll` | int | depth threshold (25/50/75/100) |
| `name` | string | custom event from `data-bm` |

There is deliberately **no `country` parameter** — see
[why country comes from CDN headers](#why-country-comes-from-cdn-headers).

### `GET /api/stats` — aggregation

`?site=<publicId>&range=24h|7d|30d|90d[&realtime=1]`

Public by design so it can sit behind a CDN: site keys are 9 random base64url
bytes and the payload is aggregates only. Returns `totals`, `change`
(period-over-period deltas), `series`, `topPages`, `referrers`, `devices`,
`browsers`, `operatingSystems`, `countries`, `realtime`. `&realtime=1` narrows
the response to the live panel only. Invalid ranges fall back to `7d`.

### `GET|POST /api/sites`, `GET|PATCH|DELETE /api/sites/[id]`

Site CRUD. Every handler resolves the site through the caller's `userId`, so a
guessed site id can never read or mutate another account's data. `POST` returns
the ready-to-paste snippet. Domains are normalised (`https://`, `www.`, and
trailing paths stripped) and validated. Ceiling of 25 sites per account.

### `GET /api/events` — export, `POST` — batch ingest

- `GET ?site=&format=json|csv&limit=1-1000` — session or bearer token required.
  Omitting `site` exports across every site the caller owns.
- `POST ?site=` — up to 500 events per request.

### `GET|POST /api/tokens`

Server-to-server API keys. The plaintext `bmt_…` token is returned exactly once;
only a bcrypt hash plus an 11-character lookup prefix is stored. Ceiling of 20
per account.

### `GET /api/billing`, `POST /api/billing/checkout`, `POST /api/billing/cancel`

Mock Stripe that writes the same rows a real webhook would, so the billing UI
works with zero Stripe keys. Setting `STRIPE_SECRET_KEY` flips `mode` to `live`.

---

## Data model

`User` → `Site` → `Event`, plus `Session` / `Account` for NextAuth, `ApiToken`
for server ingestion and `Subscriber` for billing.

Two decisions worth naming:

**`Site.publicId` vs `Site.id`.** `publicId` (`bm_acme_8f2k1`) is the unguessable
key the browser reports against; `id` is the internal relational key.
`Event.siteId` references `Site.publicId`, so ingestion writes one column and
needs no join.

**`Event` is flat and denormalised on purpose.** It is the hot path, so a write
must never require a join. Nine composite indexes cover the dashboard's access
patterns: `(siteId, createdAt)`, `(siteId, path)`, `(siteId, visitorId)`,
`(siteId, type)`, and one each for `country`, `referrer`, `browser`, `os`,
`device`.

---

## Privacy model

- **No cookies.** The only browser state is a first-party id in `localStorage`,
  used to de-duplicate pageviews within one browser. It is not linked to a
  person and rotates every 30 days.
- **No IP storage.** See [why country comes from CDN headers](#why-country-comes-from-cdn-headers).
- **No fingerprinting, no enrichment, no third-party sharing.** Nothing is sold,
  shared with ad networks, or used to train models.
- **No consent banner required.** There is no personal data to disclose under
  GDPR or CCPA.

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

---

## Verifying your checkout

```bash
./scripts/verify.sh
```

Runs install, database sync, typecheck, lint, tracking-budget check, build,
prerender guard, seed, then boots the production server and runs both test
suites, tearing the server down afterwards. It is destructive to the local
SQLite database: it re-seeds, so hand-made sites in `prisma/dev.db` will be
removed.

Individually:

| Command | What it does |
| ------- | ------------ |
| `pnpm dev` | dev server on :3000 |
| `pnpm build` | `prisma generate` + production build |
| `pnpm start` | serve the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:push` | sync schema |
| `pnpm db:migrate` | create + apply a migration |
| `pnpm db:seed` | load the demo dataset |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:reset` | drop, re-push, re-seed |
| `node scripts/smoke-test.mjs` | API suite (needs a running server) |
| `node scripts/dashboard-test.mjs` | dashboard suite (needs a running server) |
| `node scripts/check-bailout.mjs` | prerender guard (needs a prior build) |
| `node scripts/check-tracking-size.mjs` | 2 KB budget |
| `pnpm verify:stats` | exercise the aggregation engine directly |

---

## Going to production

1. **Generate a real secret**, and set both variables:
   ```bash
   npx auth secret      # or: openssl rand -base64 32
   ```
   ```env
   NEXTAUTH_SECRET="<random>"
   NEXTAUTH_URL="https://analytics.yourdomain.com"
   NEXT_PUBLIC_APP_URL="https://analytics.yourdomain.com"
   ```
   Shipping the placeholder `dev-secret-change-me…` in production means anyone
   can forge a session.

2. **Switch the database.** Set `provider = "postgresql"` in
   `prisma/schema.prisma`, point `DATABASE_URL` at your instance, then
   `pnpm prisma migrate deploy`. The models are provider-agnostic. The only
   dialect-specific SQL is the `strftime` bucketing in `lib/stats.ts` — swap it
   for `to_char(created_at, 'YYYY-MM-DD"T"HH24:00')` and drop the `/ 1000`.

3. **Enable migrations.** The repo ships schema-only (`db push`), because that
   is friendlier for a first run. Create a baseline before going live:
   ```bash
   pnpm prisma migrate dev --name init
   git add prisma/migrations
   ```

4. **Put it behind a CDN.** This is what enables the Countries panel and edge
   caching for `/api/stats`. Everything else runs fine on a single Node process.

5. **Optional: real Stripe.** Add the keys from `.env.example`.

### Scaling notes

- `/api/collect` is the only write path and is deliberately cheap: two indexed
  lookups and one `INSERT`.
- `getStats` runs a fixed number of indexed queries regardless of range.
- The realtime panel's 10-second poll is one `GROUP BY visitorId` over a
  five-minute window. At scale, move that to Redis `HINCRBY` on write rather
  than querying events.
- For high-traffic sites, use Postgres and add a rollup table if 90-day queries
  outgrow the indexes.

---

## Known limitations and TODOs

- **[ ] Migrate `package.json#prisma` to `prisma.config.ts` before Prisma 7.**
  Prisma prints a deprecation warning on every command and removes the
  `package.json#prisma` key in 7. The config file must carry the seed command
  and the schema path instead. Not done deliberately: migrating early would put
  the working `db:push` and `db:seed` flow at risk for a cosmetic gain, and
  Prisma 6.19's config API is still settling. **Track this before upgrading.**
- **[ ] `next lint` is deprecated** and removed in Next 16. Migrate to the
  ESLint CLI (`@next/codemod@canary next-lint-to-eslint-cli .`). Blocked on the
  same `eslint-config-next` patch issue as [`.npmrc`](#quick-start).
- **[ ] No email verification or password reset.** Fine for self-hosting;
  required before any hosted multi-tenant launch.
- **[ ] No rate limiting on `/api/collect`.** It is CORS-open by necessity. A
  single Node process can be flooded; put a limit at your CDN.
- **[ ] No funnel or retention views.** `/api/stats` returns enough shape to
  build both client-side.
- **[ ] Countries are empty without a CDN.** By design — see
  [the privacy section](#why-country-comes-from-cdn-headers).
- **[ ] Mock billing only.** Real Stripe keys flip the `mode` flag; the
  `checkout.sessions.create` call is not written.
- **[ ] SQLite has no row-level security.** Tenant isolation is enforced in the
  query layer (`where: { userId }` on every handler), which is correct but
  currently only convention plus test coverage.

---

## Troubleshooting

**`Could not find Prisma Schema`** — run from the repo root and make sure
`prisma/schema.prisma` exists. `pnpm install` runs `prisma generate`, so install
first.

**`EPERM: operation not permitted, rename ... query_engine`** — a running server
or Prisma Studio still holds the engine DLL. Stop every Node process and retry.
On Windows, `taskkill` for stragglers.

**Signed in but the dashboard redirects to `/login`** — `NEXTAUTH_URL` does not
match the origin you are on. Cookies are issued for the configured origin.

**No data in the dashboard** — confirm the snippet is live by watching the
Network tab for a `204` on `/api/collect`. If there is no request at all, the
script is not executing; check for a CSP `script-src` block.

**`db push` asks to accept data loss** — expected when adding a unique index to a
populated column. Safe on an empty table; back up first in production.

**Countries are empty** — that panel needs a CDN header. Without Cloudflare,
Vercel or similar in front, no country is recorded. See
[why country comes from CDN headers](#why-country-comes-from-cdn-headers).

**Charts are empty but the stat cards have numbers** — this is bugs 2 and 3 from
the postmortem. `pnpm verify:stats` will either show populated buckets or throw
the explicit invariant error naming the range.

**`Failed to patch ESLint`** — you are installing with pnpm's default isolated
linker. `.npmrc` should set `node-linker=hoisted`; check it is not overridden by
a global pnpm config.

---

## Contributing

Issues and PRs welcome — see the [issue templates](.github/ISSUE_TEMPLATE).
Security problems go through [SECURITY.md](SECURITY.md), not a public issue.

CI runs typecheck, lint, the 2 KB budget, the prerender guard, the build, and
both test suites. `pnpm build` runs `prisma generate` first, so a fresh clone
needs nothing more than `pnpm install` and `pnpm build`.

If you change the aggregation, the tracker, or the prerender behaviour, please
run `./scripts/verify.sh` before opening the PR.

---

## License

[MIT](LICENSE) © 2026 BunnyMetrics contributors
