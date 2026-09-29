import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiOk, authenticate } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/events?site=â€¦` â€” raw event stream, CSV export, and the server-to-
 * server ingestion endpoint. Keeps the ingestion path and the export path on a
 * single, auditable resource.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteKey = url.searchParams.get("site");
  const format = url.searchParams.get("format") ?? "json";
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 100) || 100, 1),
    1000,
  );

  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);

  // `site` is optional here: with no key, export across every site the caller owns.
  const site = siteKey
    ? await prisma.site.findFirst({
        where: {
          userId: auth.userId,
          OR: [{ publicId: siteKey }, { id: siteKey }],
        },
      })
    : null;

  if (siteKey && !site) return apiError("Site not found", 404);

  const ownedSiteIds = (
    await prisma.site.findMany({
      where: { userId: auth.userId },
      select: { publicId: true },
    })
  ).map((s) => s.publicId);

  const events = await prisma.event.findMany({
    where: {
      siteId: site ? site.publicId : { in: ownedSiteIds },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (format !== "csv") {
    return apiOk({
      site: site?.publicId ?? null,
      count: events.length,
      events,
    });
  }

  const columns = [
    "createdAt", "type", "path", "title", "referrer", "visitorId",
    "sessionId", "country", "browser", "os", "device", "duration", "scroll",
  ] as const;

  const header = columns.join(",");
  const rows = events.map((event) =>
    columns
      .map((column) => {
        const value = event[column];
        const text =
          value === null || value === undefined
            ? ""
            : value instanceof Date
              ? value.toISOString()
              : String(value);
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(","),
  );

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${(site?.domain ?? "sites")}-events.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

const ingestSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.string().max(32).default("pageview"),
        path: z.string().trim().min(1).max(1024),
        title: z.string().max(256).optional(),
        referrer: z.string().max(1024).optional(),
        visitorId: z.string().min(1).max(64),
        sessionId: z.string().max(64).optional(),
        country: z.string().max(8).optional(),
        browser: z.string().max(48).optional(),
        os: z.string().max(48).optional(),
        device: z.string().max(24).optional(),
        duration: z.number().int().min(0).max(86400).optional(),
        scroll: z.number().int().min(0).max(100).optional(),
        timestamp: z.string().datetime().optional(),
      }),
    )
    .min(1)
    .max(500),
});

/** `POST /api/events` â€” batch ingest for backfills and server-side tracking. */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);

  const url = new URL(request.url);
  const siteKey = url.searchParams.get("site");
  if (!siteKey) return apiError("Missing `site` query parameter", 400);

  const site = await prisma.site.findFirst({
    where: { userId: auth.userId, OR: [{ publicId: siteKey }, { id: siteKey }] },
  });
  if (!site) return apiError("Site not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid event batch", 422, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { count } = await prisma.event.createMany({
    data: parsed.data.events.map((event) => ({
      siteId: site.publicId,
      type: event.type,
      path: event.path,
      title: event.title ?? null,
      referrer: event.referrer ?? null,
      visitorId: event.visitorId,
      sessionId: event.sessionId ?? null,
      country: event.country ?? null,
      browser: event.browser ?? null,
      os: event.os ?? null,
      device: event.device ?? null,
      duration: event.duration ?? null,
      scroll: event.scroll ?? null,
      createdAt: event.timestamp ? new Date(event.timestamp) : new Date(),
    })),
  });

  return apiOk({ ingested: count }, 201);
}