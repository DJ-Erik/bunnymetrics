import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStats, getRealtime } from "@/lib/stats";
import { RANGES, type Range } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/**
 * `GET /api/stats?site=…&range=…`
 *
 * The aggregated dashboard payload. Readable without a session so it can sit
 * behind a CDN, which is safe because site keys are 12 random base64url bytes
 * and the response contains aggregates only — no visitor identifiers, no IPs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteKey = url.searchParams.get("site");

  if (!siteKey) {
    return NextResponse.json(
      { error: "Missing `site` query parameter" },
      { status: 400, headers: HEADERS },
    );
  }

  const rangeParam = url.searchParams.get("range") ?? "7d";
  const range: Range = (RANGES as readonly string[]).includes(rangeParam)
    ? (rangeParam as Range)
    : "7d";

  const site = await prisma.site.findUnique({
    where: { publicId: siteKey },
    select: { publicId: true, name: true, domain: true },
  });
  if (!site) {
    return NextResponse.json(
      { error: "Unknown site" },
      { status: 404, headers: HEADERS },
    );
  }

  if (url.searchParams.get("realtime") === "1") {
    const realtime = await getRealtime(site.publicId);
    return NextResponse.json(realtime, {
      headers: { ...HEADERS, "Cache-Control": "no-store" },
    });
  }

  const stats = await getStats(site.publicId, range);

  return NextResponse.json({ site, ...stats }, {
    headers: {
      ...HEADERS,
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}
