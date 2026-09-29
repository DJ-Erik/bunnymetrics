import { z } from "zod";

import { apiError, apiOk, authenticate } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generatePublicId } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/sites â€” every site owned by the caller, with event counts. */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);

  const sites = await prisma.site.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      publicId: true,
      name: true,
      domain: true,
      environment: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
  });

  return apiOk(
    sites.map((site) => ({
      ...site,
      eventCount: site._count.events,
      _count: undefined,
      // The install snippet is generated server-side so the client never has to
      // assemble the public URL itself.
      snippet: `<script defer src="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tracking.js" data-site="${site.publicId}"></script>`,
    })),
  );
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(64),
  domain: z.string().trim().min(3).max(253),
  environment: z
    .enum(["production", "staging", "development"])
    .default("production"),
});

/** POST /api/sites â€” create a property and return its tracking snippet. */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid site details", 422, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { normalizeDomain, isValidDomain } = await import("@/lib/utils");
  const domain = normalizeDomain(parsed.data.domain);
  if (!isValidDomain(domain)) {
    return apiError("That domain doesn't look valid", 422, {
      fields: { domain: "Enter a valid domain, e.g. acme.com" },
    });
  }

  const siteCount = await prisma.site.count({ where: { userId: auth.userId } });
  if (siteCount >= 25) {
    return apiError("You've hit the limit of 25 sites per account", 409);
  }

  // Retry on the (astronomically unlikely) publicId collision.
  let publicId = generatePublicId();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await prisma.site.findUnique({ where: { publicId } });
    if (!clash) break;
    publicId = generatePublicId();
  }

  const site = await prisma.site.create({
    data: {
      publicId,
      name: parsed.data.name,
      domain,
      environment: parsed.data.environment,
      userId: auth.userId,
    },
  });

  return apiOk(
    {
      site,
      snippet: `<script defer src="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tracking.js" data-site="${site.publicId}"></script>`,
    },
    201,
  );
}
