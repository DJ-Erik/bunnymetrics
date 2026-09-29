---
name: Bug report
about: Something in BunnyMetrics is broken or behaving unexpectedly
title: "[Bug] "
labels: bug
assignees: ''
---

## What happened

<!-- A clear, one-paragraph description of the problem. -->

## Steps to reproduce

1.
2.
3.

## Expected behaviour

<!-- What you expected instead. -->

## Actual behaviour

<!-- What actually happened, including any error text. -->

## Environment

| | |
| --- | --- |
| BunnyMetrics version | <!-- git SHA or release tag; `0.0.0` if local --> |
| Install method | <!-- pnpm install / Docker / self-hosted --> |
| Node version | <!-- `node -v` --> |
| Database | <!-- SQLite (file path) or Postgres (version) --> |
| Browser | <!-- If relevant, e.g. Chrome 133 on macOS --> |
| Deployed behind CDN? | <!-- Cloudflare / Vercel / nginx / none --> |

## Logs

<!--
Paste the relevant output. Trim anything sensitive: session cookies, API
tokens, `NEXTAUTH_SECRET`, database URLs, or real visitor data.
-->

```
```

## Anything else?

<!--
Screenshots, a minimal reproduction repo, or a SQL query that shows the problem.
If the issue is data-related, a snippet of the `/api/stats` response for the
affected range is usually the fastest route to a fix.
-->
