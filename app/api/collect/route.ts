import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { collectSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Anything malformed still gets a 204 so a broken snippet never spams a
 *  visitor's console with cross-origin errors. */
const noop = () =>
  new NextResponse(null, { status: 204, headers: CORS_HEADERS });

/**
 * Coarse geography from CDN-provided headers rather than from the client.
 *
 * We never read, derive from, or store the visitor's IP. The edge resolves it
 * before the request reaches us and we keep only a two-letter ISO-3166 code.
 * Vercel and Cloudflare both set this on every request, so the preview gets
 * real country data with no IP anywhere in the pipeline.
 *
 * Because the value is asserted by the edge, it cannot be spoofed by the
 * browser — `?country=US` in a query string does nothing, and the collector
 * exposes no `country` parameter at all.
 *
 * CITY IS DELIBERATELY NOT COLLECTED. The `city` column still exists on Event
 * for a future, opt-in feature, but nothing writes to it and it is not exported
 * or displayed. A city name is a materially stronger quasi-identifier than a
 * country code: combined with a timestamp it narrows an otherwise anonymous
 * visitor a long way, and for a product whose pitch is "we hold no personal
 * data" that is not a trade worth making by default.
 *
 * To re-enable city later:
 *   1. add `const CITY_HEADERS = ["x-vercel-ip-city", "cf-ipcity"];`
 *   2. add a `readCity()` helper mirroring `readCountry()` below
 *   3. set `city` on both `prisma.event.create` calls in this file
 *   4. add "city" to the CSV column list in app/api/events/route.ts
 * Do it as an explicit, reviewed decision — not as a side effect.
 */
const COUNTRY_HEADERS = [
  "x-vercel-ip-country", // Vercel
  "cf-ipcountry",        // Cloudflare
  "x-country-code",      // generic
  "fastly-client-country",
  "x-appengine-country",
];

function readCountry(request: Request): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = request.headers.get(name)?.trim().toUpperCase();
    if (!value) continue;
    // Cloudflare and Vercel both send XX when the country is unknown.
    if (value === "XX" || value === "T1" || value === "UNKNOWN") continue;
    if (/^[A-Z]{2}$/.test(value)) return value;
  }
  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type Payload = {
  site?: unknown;
  type?: unknown;
  path?: unknown;
  title?: unknown;
  ref?: unknown;
  vid?: unknown;
  sid?: unknown;
  br?: unknown;
  os?: unknown;
  dv?: unknown;
  w?: unknown;
  h?: unknown;
  lang?: unknown;
  dur?: unknown;
  scroll?: unknown;
  name?: unknown;
};

/**
 * `POST /api/collect` â€” the single ingestion endpoint used by
 * `public/tracking.js`. Accepts JSON or a form body; always answers 204.
 */
export async function POST(request: Request) {
  let body: Payload;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as Payload;
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as Payload;
    }
  } catch {
    return noop();
  }

  const parsed = collectSchema.safeParse(body);
  if (!parsed.success) return noop();
  const data = parsed.data;

  // Unknown site keys are silently dropped â€” this keeps enumeration useless
  // and avoids leaking whether a key exists.
  const site = await prisma.site.findUnique({
    where: { publicId: data.site },
    select: { publicId: true, id: true },
  });
  if (!site) return noop();

  // Per-request dedupe: identical (visitor, path, type) inside 1s is a retry.
  const since = new Date(Date.now() - 1000);
  const duplicate = await prisma.event.findFirst({
    where: {
      siteId: site.publicId,
      visitorId: data.vid ?? "anon",
      path: data.path,
      type: data.type,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (duplicate) return noop();

  const country = readCountry(request);

  await prisma.event.create({
    data: {
      siteId: site.publicId,
      type: data.type,
      path: data.path.slice(0, 1024),
      title: data.title || null,
      referrer: data.ref || null,
      visitorId: data.vid ?? "anon",
      sessionId: data.sid ?? null,
      country,
      browser: data.br || null,
      os: data.os || null,
      device: data.dv || null,
      screenW: data.w ?? null,
      screenH: data.h ?? null,
      language: data.lang || null,
      duration: data.dur ?? null,
      scroll: data.scroll ?? null,
    },
  });

  return noop();
}

/** `GET /api/collect` â€” image-beacon transport for unload/visibility events. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());

  const parsed = collectSchema.safeParse(raw);
  if (!parsed.success) return noop();
  const data = parsed.data;

  const site = await prisma.site.findUnique({
    where: { publicId: data.site },
    select: { publicId: true },
  });
  if (!site) return noop();

  const since = new Date(Date.now() - 1000);
  const duplicate = await prisma.event.findFirst({
    where: {
      siteId: site.publicId,
      visitorId: data.vid ?? "anon",
      path: data.path,
      type: data.type,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (duplicate) return noop();

  const country = readCountry(request);

  await prisma.event.create({
    data: {
      siteId: site.publicId,
      type: data.type,
      path: data.path.slice(0, 1024),
      title: data.title || null,
      referrer: data.ref || null,
      visitorId: data.vid ?? "anon",
      sessionId: data.sid ?? null,
      country,
      browser: data.br || null,
      os: data.os || null,
      device: data.dv || null,
      screenW: data.w ?? null,
      screenH: data.h ?? null,
      language: data.lang || null,
      duration: data.dur ?? null,
      scroll: data.scroll ?? null,
    },
  });

  return noop();
}
