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
 * before the request reaches us and we keep only the coarse result: an
 * ISO-3166 alpha-2 country and an optional city name. Vercel and Cloudflare
 * both set these on every request, so the Vercel preview gets real geography
 * with no IP anywhere in the pipeline.
 *
 * Because the values are asserted by the edge, they cannot be spoofed by the
 * browser â€” `?country=US` in a query string does nothing, and the collector
 * exposes no `country` parameter at all.
 */
const COUNTRY_HEADERS = [
  "x-vercel-ip-country", // Vercel
  "cf-ipcountry",        // Cloudflare
  "x-country-code",      // generic
  "fastly-client-country",
  "x-appengine-country",
];

const CITY_HEADERS = [
  "x-vercel-ip-city", // Vercel
  "cf-ipcity",        // Cloudflare
];

function readCountry(request: Request): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = request.headers.get(name)?.trim().toUpperCase();
    if (!value) continue;
    // Cloudflare sends XX and Vercel sends XX when the country is unknown.
    if (value === "XX" || value === "T1" || value === "UNKNOWN") continue;
    if (/^[A-Z]{2}$/.test(value)) return value;
  }
  return null;
}

function readCity(request: Request): string | null {
  for (const name of CITY_HEADERS) {
    const value = request.headers.get(name)?.trim();
    if (!value) continue;
    if (/^(unknown|xx)$/i.test(value)) continue;
    // Keep it a short label, not a free-form string from the network.
    if (value.length > 64) continue;
    return value;
  }
  return null;
}

function geoFromHeaders(request: Request): { country: string | null; city: string | null } {
  return { country: readCountry(request), city: readCity(request) };
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

  const { country, city } = geoFromHeaders(request);

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
      city,
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

  const { country, city } = geoFromHeaders(request);

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
      city,
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
