import { NextResponse } from "next/server";

import { apiError, apiOk, authenticate } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { updateSiteSchema } from "@/lib/validations";
import { isValidDomain, normalizeDomain } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Every handler below resolves the site through the caller's userId, so a
 *  guessed site id can never read or mutate another account's data. */
async function loadSite(request: Request, id: string) {
  const auth = await authenticate(request);
  if (!auth) return { error: apiError("Unauthorized", 401) } as const;

  const site = await prisma.site.findFirst({
    where: { userId: auth.userId, OR: [{ id }, { publicId: id }] },
  });
  if (!site) return { error: apiError("Site not found", 404) } as const;

  return { site } as const;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const result = await loadSite(request, id);
  if ("error" in result) return result.error;

  const { site } = result;
  const recent = await prisma.event.findMany({
    where: { siteId: site.publicId },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      type: true,
      path: true,
      referrer: true,
      country: true,
      device: true,
      browser: true,
      createdAt: true,
    },
  });

  return apiOk({
    site,
    recentEvents: recent,
    snippet: `<script defer src="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tracking.js" data-site="${site.publicId}"></script>`,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const result = await loadSite(request, id);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  const parsed = updateSiteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Nothing to update", 422, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const data: Record<string, string> = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.environment) data.environment = parsed.data.environment;
  if (parsed.data.domain) {
    const domain = normalizeDomain(parsed.data.domain);
    if (!isValidDomain(domain)) {
      return apiError("That domain doesn't look valid", 422, {
        fields: { domain: "Enter a valid domain, e.g. acme.com" },
      });
    }
    data.domain = domain;
  }

  const site = await prisma.site.update({
    where: { id: result.site.id },
    data,
  });

  return apiOk({ site });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const result = await loadSite(request, id);
  if ("error" in result) return result.error;

  // Events cascade via the Prisma relation, so one delete is enough.
  await prisma.site.delete({ where: { id: result.site.id } });

  return new NextResponse(null, { status: 204 });
}
