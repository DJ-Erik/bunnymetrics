# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `1.0.x` | ✅        |
| `< 1.0` | ❌        |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately via GitHub's security advisory flow:

**Repository → Security tab → "Report a vulnerability"**

This opens a private, encrypted thread that only you and the maintainers can
see. If the Security tab is unavailable, email `security@bunnymetrics.dev` with
the details below and we will open a private advisory on your behalf.

Please include:

- Type of issue (e.g. XSS, auth bypass, injection, data exposure)
- Affected route or file, and the version or commit SHA
- Steps to reproduce, ideally with a minimal request/response
- Impact: what an attacker gains, and what access they need to start
- Any proof-of-concept code or request payloads

You should get an acknowledgement within **72 hours** and a remediation plan
within **7 days**. We will keep you updated as the fix ships, and credit you in
the release notes unless you prefer otherwise.

## Scope

BunnyMetrics is a self-hostable analytics service. Issues are in scope if they
let one party:

- Read or modify another account's data (sites, events, API tokens, exports)
- Forge or steal a session, or bypass the sign-in flow
- Inject script or markup into the dashboard or landing page
- Escalate a scoped API token beyond the permissions of its owner
- Extract personal data that BunnyMetrics promises not to collect

## Out of scope

- Findings that require physical or admin access to the host
- Denial of service through deliberate volumetric abuse of a self-hosted
  instance (rate limiting is the operator's responsibility)
- Reports from automated scanners without a demonstrated impact
- Missing security headers on a self-hosted deployment you control
- The upstream security posture of Vercel, Cloudflare, or SQLite

## Threat model in one paragraph

BunnyMetrics stores no personal data by design, so the interesting assets are
account boundaries and the ingestion endpoint. `/api/collect` is intentionally
unauthenticated and CORS-open, because any page in the world must be able to
report events. It accepts untrusted input, so every field is length- and
format-clamped with Zod, writes are bounded to one row per request, and
duplicate hits are de-duplicated within a second. Every other route resolves
the caller's identity from a signed session or a hashed bearer token and scopes
its query through `userId` — a guessed site id cannot cross that boundary.
