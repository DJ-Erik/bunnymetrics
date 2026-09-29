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
 * Country from a CDN-provided header rather than from the client.
 *
 * We never read, derive from, or store the visitor's IP — the edge resolves it
 * to an ISO-3166 alpha-2 code before the request reaches us, and we keep only
 * that two-letter value. Deploying without a CDN just means no country data.
 */
function countryFromHeaders(request: Request): string | null {
  const headers = [
    "cf-ipcountry",
    "x-vercel-ip-country",
    "x-country-code",
    "fastly-client-country",
    "x-appengine-country",
  ];

  for (const name of headers) {
    const value = request.headers.get(name)?.trim().toUpperCase();
    if (!value) continue;
    // Cloudflare sends XX when the country genuinely is unknown.
    if (value === "XX" || value === "T1") continue;
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
 * `POST /api/collect` — the single ingestion endpoint used by
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

  // Unknown site keys are silently dropped — this keeps enumeration useless
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

  const country = countryFromHeaders(request);

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

/** `GET /api/collect` — image-beacon transport for unload/visibility events. */
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

  const country = countryFromHeaders(request);

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
