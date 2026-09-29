import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { Range } from "@/lib/validations";

/**
 * Analytics aggregation layer.
 *
 * NOTE ON DIALECT: Prisma stores `DateTime` in SQLite as INTEGER epoch
 * milliseconds, so all bucketing below uses `strftime(..., createdAt/1000,
 * 'unixepoch')`. That form is UTC. To port to Postgres, swap `strftime` for
 * `to_char(created_at, 'YYYY-MM-DD"T"HH24:00')` and drop the `/1000`.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const REALTIME_WINDOW_MS = 5 * 60_000;
const RANGE_BUCKETS: Record<Range, number> = { "24h": 24, "7d": 7, "30d": 30, "90d": 90 };

export interface Bucket {
  key: string;
  label: string;
  full: string;
  start: number;
  end: number;
}

export interface StatsPayload {
  range: Range;
  generatedAt: string;
  totals: {
    visitors: number;
    pageviews: number;
    events: number;
    sessions: number;
    bounceRate: number;
    avgDuration: number;
    viewsPerVisitor: number;
  };
  change: {
    visitors: number;
    pageviews: number;
    bounceRate: number;
  };
  series: Array<{
    key: string;
    label: string;
    full: string;
    visitors: number;
    pageviews: number;
    events: number;
  }>;
  topPages: Array<{
    path: string;
    title: string | null;
    views: number;
    visitors: number;
    avgDuration: number;
  }>;
  referrers: Array<{ source: string; visits: number; share: number }>;
  devices: Array<{ label: string; value: number }>;
  browsers: Array<{ label: string; value: number }>;
  operatingSystems: Array<{ label: string; value: number }>;
  countries: Array<{ label: string; value: number }>;
  realtime: {
    activeVisitors: number;
    windowMinutes: number;
    byPath: Array<{ path: string; active: number }>;
  };
}

/** `strftime` format used for the series GROUP BY, per range. Must stay in
 *  lockstep with the bucket `key` format in `buildBuckets`. */
const BUCKET_SQL: Record<Range, string> = {
  "24h": "%Y-%m-%dT%H:00",
  "7d": "%Y-%m-%d",
  "30d": "%Y-%m-%d",
  "90d": "%Y-%m-%d",
};

/** Contiguous, zero-filled bucket boundaries for a range. */
export function buildBuckets(range: Range, now = new Date()): Bucket[] {
  const count = RANGE_BUCKETS[range];
  const size = range === "24h" ? HOUR_MS : DAY_MS;
  const lastStart = Math.floor(now.getTime() / size) * size;

  const buckets: Bucket[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = lastStart - i * size;
    const iso = new Date(start).toISOString();
    // These keys MUST byte-match the `strftime` formats used in the series
    // query below, otherwise every bucket silently joins to nothing.
    //   hourly -> strftime('%Y-%m-%dT%H:00')  (16 chars)
    //   daily  -> strftime('%Y-%m-%d')         (10 chars)
    const key = range === "24h" ? iso.slice(0, 16) : iso.slice(0, 10);
    const date = new Date(start);
    buckets.push({
      key,
      label:
        range === "24h"
          ? date.toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      full: date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: range === "24h" ? "numeric" : undefined,
        minute: range === "24h" ? "2-digit" : undefined,
        timeZone: "UTC",
      }),
      start,
      end: start + size,
    });
  }
  return buckets;
}

/** Collapse a full referrer URL down to a readable source label. */
export function referrerSource(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)(:|\/|$)/i.test(value)) return "Direct";
  if (!/^https?:\/\//i.test(value)) return null;

  let host: string;
  try {
    host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  if (!host) return null;

  const social: Record<string, string> = {
    "x.com": "X / Twitter",
    "twitter.com": "X / Twitter",
    "t.co": "X / Twitter",
    "linkedin.com": "LinkedIn",
    "lnkd.in": "LinkedIn",
    "reddit.com": "Reddit",
    "news.ycombinator.com": "Hacker News",
    "lobste.rs": "Lobsters",
    "github.com": "GitHub",
    "newsletter": "Newsletter",
    "producthunt.com": "Product Hunt",
    "dev.to": "DEV",
    "hashnode.com": "Hashnode",
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "facebook.com": "Facebook",
    "bsky.app": "Bluesky",
    "mastodon.social": "Mastodon",
    "google.com": "Google",
  };

  if (social[host]) return social[host];
  if (host.endsWith(".google.")) return "Google";
  if (host.endsWith(".bing.com")) return "Bing";
  if (host.endsWith(".duckduckgo.com")) return "DuckDuckGo";
  if (host === "duckduckgo.com") return "DuckDuckGo";
  return host;
}

const toNumber = (value: unknown): number =>
  typeof value === "bigint" ? Number(value) : Number(value ?? 0);

const toFloat = (value: unknown): number =>
  value === null || value === undefined ? 0 : toNumber(value);

/** Raw scalar stats for a [fromMs, toMs) window. */
async function windowTotals(siteId: string, fromMs: number, toMs: number) {
  const [row] = await prisma.$queryRaw<
    Array<Record<string, unknown>>
  >(Prisma.sql`
    SELECT
      COUNT(DISTINCT visitorId)                       AS visitors,
      COUNT(*)                                       AS events,
      SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) AS pageviews,
      AVG(CASE WHEN duration IS NOT NULL AND duration > 0 THEN duration END) AS avgDuration
    FROM Event
    WHERE siteId = ${siteId} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
  `);

  const [sessions] = await prisma.$queryRaw<Array<Record<string, unknown>>>(
    Prisma.sql`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN views = 1 THEN 1 ELSE 0 END) AS bounced
      FROM (
        SELECT COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS views
        FROM Event
        WHERE siteId = ${siteId} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
        GROUP BY COALESCE(sessionId, visitorId)
      )
    `,
  );

  const visitors = toNumber(row?.visitors);
  const pageviews = toNumber(row?.pageviews);

  return {
    visitors,
    pageviews,
    events: toNumber(row?.events),
    sessions: toNumber(sessions?.total),
    bounceRate: toNumber(sessions?.total)
      ? (toNumber(sessions?.bounced) / toNumber(sessions?.total)) * 100
      : 0,
    avgDuration: toFloat(row?.avgDuration),
    viewsPerVisitor: visitors ? pageviews / visitors : 0,
  };
}

async function breakdown(
  siteId: string,
  column: "device" | "browser" | "os" | "country",
  fromMs: number,
  toMs: number,
  limit = 6,
) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
    Prisma.sql`SELECT ${Prisma.raw(`"${column}"`)} AS label, COUNT(*) AS value
      FROM Event
      WHERE siteId = ${siteId} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
        AND ${Prisma.raw(`"${column}"`)} IS NOT NULL AND ${Prisma.raw(`"${column}"`)} != ''
      GROUP BY label
      ORDER BY value DESC
      LIMIT ${limit}`,
  );
  return rows.map((row) => ({
    label: String(row.label ?? "Unknown"),
    value: toNumber(row.value),
  }));
}

/**
 * Full dashboard payload. Runs a fixed, indexed set of queries regardless of
 * range, so latency stays flat as the event table grows.
 */
export async function getStats(
  siteId: string,
  range: Range,
  now = new Date(),
): Promise<StatsPayload> {
  const buckets = buildBuckets(range, now);
  const fromMs = buckets[0].start;
  const toMs = buckets[buckets.length - 1].end;
  const spanMs = toMs - fromMs;

  const hourly = range === "24h";

  const [seriesRows, topPageRows, referrerRows, deviceRows, browserRows, osRows, countryRows, totals, prev] =
    await Promise.all([
      // The strftime format is a hard-coded literal chosen by `range` (never
      // user input) and MUST be inlined — passing it as a bound parameter would
      // make SQLite treat the quote characters as part of the format string.
      prisma.$queryRaw<Array<Record<string, unknown>>>(
        hourly
          ? Prisma.sql`
              SELECT
                strftime('${Prisma.raw(BUCKET_SQL["24h"])}', createdAt / 1000, 'unixepoch') AS bucket,
                COUNT(DISTINCT visitorId) AS visitors,
                COUNT(*) AS events,
                SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) AS pageviews
              FROM Event
              WHERE siteId = ${siteId} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
              GROUP BY bucket`
          : Prisma.sql`
              SELECT
                strftime('${Prisma.raw(BUCKET_SQL[range])}', createdAt / 1000, 'unixepoch') AS bucket,
                COUNT(DISTINCT visitorId) AS visitors,
                COUNT(*) AS events,
                SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) AS pageviews
              FROM Event
              WHERE siteId = ${siteId} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
              GROUP BY bucket`,
      ),
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          path,
          MAX(NULLIF(title, '')) AS title,
          COUNT(*) AS views,
          COUNT(DISTINCT visitorId) AS visitors,
          AVG(CASE WHEN duration > 0 THEN duration END) AS avgDuration
        FROM Event
        WHERE siteId = ${siteId} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
          AND type = 'pageview'
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `),
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT referrer AS source, COUNT(*) AS visits
        FROM Event
        WHERE siteId = ${siteId} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
          AND type = 'pageview' AND referrer IS NOT NULL AND referrer != ''
        GROUP BY referrer
        ORDER BY visits DESC
        LIMIT 250
      `),
      breakdown(siteId, "device", fromMs, toMs),
      breakdown(siteId, "browser", fromMs, toMs),
      breakdown(siteId, "os", fromMs, toMs),
      breakdown(siteId, "country", fromMs, toMs),
      windowTotals(siteId, fromMs, toMs),
      windowTotals(siteId, fromMs - spanMs, fromMs),
    ]);

  const seriesMap = new Map(
    seriesRows.map((row) => [String(row.bucket), row] as const),
  );

  const series = buckets.map((bucket) => {
    const row = seriesMap.get(bucket.key);
    return {
      key: bucket.key,
      label: bucket.label,
      full: bucket.full,
      visitors: toNumber(row?.visitors),
      pageviews: toNumber(row?.pageviews),
      events: toNumber(row?.events),
    };
  });

  // Defence in depth: if a future edit desyncs the JS bucket key from the SQL
  // strftime format, every bucket would join to nothing and the chart would
  // silently render as empty. Fail loudly rather than showing a blank graph.
  if (totals.events > 0 && series.every((point) => point.events === 0)) {
    throw new Error(
      `BunnyMetrics: series join returned no rows for range "${range}" ` +
        `(totals.events=${totals.events}). Check BUCKET_SQL against buildBuckets().`,
    );
  }

  // Referrers are collapsed to source AFTER querying, so twitter.com and
  // x.com aggregate into a single "X / Twitter" row.
  const sourceTotals = new Map<string, number>();
  for (const row of referrerRows) {
    const source = referrerSource(String(row.source ?? ""));
    if (!source) continue;
    sourceTotals.set(source, (sourceTotals.get(source) ?? 0) + toNumber(row.visits));
  }
  const attributed = [...sourceTotals.values()].reduce((a, b) => a + b, 0);
  const directVisits = Math.max(0, totals.pageviews - attributed);
  if (directVisits > 0) sourceTotals.set("Direct", directVisits);

  const referrerTotal = [...sourceTotals.values()].reduce((a, b) => a + b, 0);

  const pct = (current: number, previous: number) =>
    previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;

  return {
    range,
    generatedAt: now.toISOString(),
    totals,
    change: {
      visitors: pct(totals.visitors, prev.visitors),
      pageviews: pct(totals.pageviews, prev.pageviews),
      bounceRate: totals.bounceRate - prev.bounceRate,
    },
    series,
    topPages: topPageRows.map((row) => ({
      path: String(row.path),
      title: row.title ? String(row.title) : null,
      views: toNumber(row.views),
      visitors: toNumber(row.visitors),
      avgDuration: toFloat(row.avgDuration),
    })),
    referrers: [...sourceTotals.entries()]
      .map(([source, visits]) => ({
        source,
        visits,
        share: referrerTotal ? (visits / referrerTotal) * 100 : 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8),
    devices: deviceRows,
    browsers: browserRows,
    operatingSystems: osRows,
    countries: countryRows,
    realtime: await getRealtime(siteId, now),
  };
}

/** Visitors seen in the trailing 5-minute window, grouped by current path. */
export async function getRealtime(siteId: string, now = new Date()) {
  const nowMs = now.getTime();
  const since = nowMs - REALTIME_WINDOW_MS;

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT
      visitorId,
      MAX(createdAt) AS lastSeen,
      MAX(CASE WHEN type = 'pageview' THEN path END) AS path
    FROM Event
    WHERE siteId = ${siteId} AND createdAt >= ${since} AND createdAt <= ${nowMs}
    GROUP BY visitorId
  `);

  const active = rows.filter((row) => toNumber(row.lastSeen) >= since);
  const pathCounts = new Map<string, number>();
  for (const row of active) {
    const path = String(row.path ?? "/");
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
  }

  return {
    activeVisitors: active.length,
    windowMinutes: REALTIME_WINDOW_MS / 60_000,
    byPath: [...pathCounts.entries()]
      .map(([path, count]) => ({ path, active: count }))
      .sort((a, b) => b.active - a.active)
      .slice(0, 6),
  };
}

/** Resolve a site, always scoped to its owner so IDs can't be guessed across accounts. */
export async function findSiteForUser(userId: string, publicId?: string | null) {
  return prisma.site.findFirst({
    where: { userId, ...(publicId ? { publicId } : {}) },
    orderBy: { createdAt: "asc" },
  });
}

export async function listSitesForUser(userId: string) {
  const sites = await prisma.site.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (sites.length === 0) return [];

  const counts = await prisma.event.groupBy({
    by: ["siteId"],
    where: { siteId: { in: sites.map((s) => s.publicId) } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.siteId, c._count._all] as const));

  return sites.map((site) => ({ ...site, eventCount: countMap.get(site.publicId) ?? 0 }));
}
