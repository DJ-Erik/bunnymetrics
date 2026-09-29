/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

/** Deterministic PRNG (mulberry32) so every seed produces identical data. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAGES = [
  { path: "/", title: "Acme — Ship faster, sleep better", weight: 34 },
  { path: "/pricing", title: "Pricing — Acme", weight: 16 },
  { path: "/docs/getting-started", title: "Getting started · Acme Docs", weight: 14 },
  { path: "/blog/scaling-postgres", title: "Scaling Postgres without tears", weight: 11 },
  { path: "/features", title: "Features — Acme", weight: 8 },
  { path: "/blog/zero-downtime-migrations", title: "Zero-downtime migrations", weight: 6 },
  { path: "/changelog", title: "Changelog — Acme", weight: 5 },
  { path: "/docs/api", title: "API reference · Acme Docs", weight: 4 },
  { path: "/about", title: "About Acme", weight: 2 },
];

const REFERRERS = [
  { url: "https://news.ycombinator.com/item?id=39900000", weight: 20 },
  { url: "https://x.com/someone/status/1800000000000000000", weight: 16 },
  { url: "https://www.google.com/search?q=acme+deploy", weight: 15 },
  { url: "https://t.co/abc123", weight: 8 },
  { url: "https://www.reddit.com/r/SaaS/comments/1abcdef", weight: 8 },
  { url: "https://github.com/someone/awesome-list", weight: 7 },
  { url: "https://www.linkedin.com/feed/update/urn:li:activity:123", weight: 6 },
  { url: "https://duckduckgo.com/", weight: 5 },
  { url: "https://newsletter.dev/issue/42", weight: 5 },
  { url: "https://producthunt.com/posts/acme", weight: 4 },
  { url: "https://www.bing.com/search?q=acme", weight: 3 },
  { url: "", weight: 38 }, // direct
];

const DEVICES = ["desktop", "desktop", "desktop", "mobile", "mobile", "tablet"];
const BROWSERS = ["Chrome", "Chrome", "Chrome", "Safari", "Safari", "Firefox", "Edge"];
const OSES = ["macOS", "macOS", "Windows", "Windows", "Linux", "iOS", "Android"];
const COUNTRIES = ["US", "US", "US", "GB", "DE", "CA", "FR", "NL", "IN", "BR", "AU", "JP"];
const LANGUAGES = ["en-US", "en-GB", "de-DE", "fr-FR", "pt-BR", "ja-JP", "es-ES"];

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)] as T;
}

function weightedPick<T extends { weight: number }>(
  rand: () => number,
  items: readonly T[],
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rand() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1] as T;
}

const hex = (rand: () => number, length: number) =>
  Array.from({ length }, () => Math.floor(rand() * 16).toString(16)).join("");

async function seedSite(
  userId: string,
  site: { publicId: string; name: string; domain: string; environment: string; seed: number; scale: number },
) {
  await prisma.event.deleteMany({ where: { siteId: site.publicId } });
  await prisma.site.deleteMany({ where: { userId, publicId: site.publicId } });

  const created = await prisma.site.create({
    data: {
      publicId: site.publicId,
      name: site.name,
      domain: site.domain,
      environment: site.environment,
      userId,
    },
  });

  const rand = rng(site.seed);
  const now = Date.now();
  const start = now - 30 * 86_400_000;

  // 1,400 unique visitors spread across the window.
  const visitorCount = Math.round(1_400 * site.scale);
  const rows: Array<{
    siteId: string;
    type: string;
    path: string;
    title: string | null;
    referrer: string | null;
    visitorId: string;
    sessionId: string;
    country: string;
    browser: string;
    os: string;
    device: string;
    screenW: number;
    screenH: number;
    language: string;
    duration: number | null;
    scroll: number | null;
    createdAt: Date;
  }> = [];

  for (let v = 0; v < visitorCount; v += 1) {
    const visitorId = `v_${hex(rand, 16)}`;

    // 1-3 sessions per visitor, clustered in the last 3 weeks.
    const sessions = 1 + Math.floor(rand() * 3);
    for (let s = 0; s < sessions; s += 1) {
      const sessionId = `s_${hex(rand, 12)}`;
      // Weekday traffic is meaningfully higher than weekend traffic.
      const rawDay = rand() * 30;
      const dayOffset = Math.floor(rawDay);
      const anchor = new Date(start + dayOffset * 86_400_000);
      const weekday = anchor.getUTCDay();
      const seasonal = weekday === 0 || weekday === 6 ? 0.55 : 1.15;
      if (rand() > seasonal * 0.85) continue;

      // Bias toward a working-hours bell curve.
      const hour = Math.max(0, Math.min(23, Math.round(14 + (rand() + rand() + rand() - 1.5) * 5)));
      const at = new Date(anchor);
      at.setUTCHours(hour, Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
      if (at.getTime() > now) continue;

      const first = weightedPick(rand, PAGES);
      const referrer = weightedPick(rand, REFERRERS).url || null;
      const device = pick(rand, DEVICES);
      const browser = pick(rand, BROWSERS);
      const os = pick(rand, OSES);
      const country = pick(rand, COUNTRIES);
      const language = pick(rand, LANGUAGES);
      const isMobile = device === "mobile";
      const screenW = isMobile ? 390 : device === "tablet" ? 834 : 1440 + Math.floor(rand() * 200);
      const screenH = isMobile ? 844 : device === "tablet" ? 1194 : 900;

      // Sessions land on the landing page then wander.
      const depth = 1 + Math.floor(rand() * 4);
      let cursor = at.getTime();
      let path = first.path;

      for (let d = 0; d < depth; d += 1) {
        if (d > 0) {
          const next = weightedPick(rand, PAGES);
          path = next.path;
        }
        const dwell = 8 + Math.floor(rand() * 190);
        rows.push({
          siteId: site.publicId,
          type: "pageview",
          path,
          title: PAGES.find((p) => p.path === path)?.title ?? path,
          referrer,
          visitorId,
          sessionId,
          country,
          browser,
          os,
          device,
          screenW,
          screenH,
          language,
          duration: dwell,
          scroll: Math.min(100, 15 + Math.floor(rand() * 85)),
          createdAt: new Date(cursor),
        });

        // ~18% of views emit a custom event; ~55% emit an engagement ping.
        if (rand() < 0.18) {
          rows.push({
            ...rows[rows.length - 1],
            type: "event",
            path: "cta_click",
            title: null,
            duration: null,
            scroll: null,
            createdAt: new Date(cursor + 1_200),
          });
        }
        if (rand() < 0.55) {
          rows.push({
            ...rows[rows.length - 1],
            type: "engagement",
            path: "scroll_50",
            title: null,
            createdAt: new Date(cursor + 2_400),
          });
        }

        cursor += dwell * 1000 + Math.floor(rand() * 25_000);
        if (cursor > now) break;
      }
    }
  }

  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // A small burst inside the trailing 5-minute window so the realtime panel
  // has something to show the moment you log in.
  const liveVisitorCount = site.scale >= 1 ? 9 : 3;
  for (let i = 0; i < liveVisitorCount; i += 1) {
    const page = weightedPick(rand, PAGES);
    rows.push({
      siteId: site.publicId,
      type: "pageview",
      path: page.path,
      title: page.title,
      referrer: weightedPick(rand, REFERRERS).url || null,
      visitorId: `v_live_${hex(rand, 10)}`,
      sessionId: `s_live_${hex(rand, 10)}`,
      country: pick(rand, COUNTRIES),
      browser: pick(rand, BROWSERS),
      os: pick(rand, OSES),
      device: pick(rand, DEVICES),
      screenW: 1440,
      screenH: 900,
      language: pick(rand, LANGUAGES),
      duration: 4 + Math.floor(rand() * 40),
      scroll: Math.min(100, 20 + Math.floor(rand() * 70)),
      createdAt: new Date(now - Math.floor(rand() * 4.5 * 60_000)),
    });
  }

  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Chunked createMany keeps memory flat and inserts fast.
  const CHUNK = 2_000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.event.createMany({ data: rows.slice(i, i + CHUNK) });
  }

  console.log(`  ${site.name}: ${rows.length.toLocaleString()} events across ${visitorCount} visitors`);
  return created;
}

async function main() {
  console.log("Seeding BunnyMetrics…");

  await prisma.event.deleteMany();
  await prisma.site.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("demo1234", 10);

  const user = await prisma.user.create({
    data: {
      email: "demo@bunnymetrics.dev",
      name: "Ada Lovelace",
      password,
      plan: "pro",
    },
  });

  const second = await prisma.user.create({
    data: {
      email: "maker@bunnymetrics.dev",
      name: "Grace Hopper",
      password,
      plan: "hobby",
    },
  });

  await seedSite(user.id, {
    publicId: "bm_acme_8f2k1",
    name: "Acme Marketing Site",
    domain: "acme.com",
    environment: "production",
    seed: 1337,
    scale: 1,
  });

  await seedSite(user.id, {
    publicId: "bm_docs_4x9p2",
    name: "Acme Docs",
    domain: "docs.acme.com",
    environment: "production",
    seed: 4242,
    scale: 0.45,
  });

  await seedSite(second.id, {
    publicId: "bm_shop_77ab3",
    name: "Side Project",
    domain: "sideproject.dev",
    environment: "production",
    seed: 99,
    scale: 0.2,
  });

  console.log("\nDone. Sign in with:");
  console.log("  demo@bunnymetrics.dev  /  demo1234   (pro, 2 sites)");
  console.log("  maker@bunnymetrics.dev /  demo1234   (hobby, 1 site)\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
