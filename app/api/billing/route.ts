import { apiError, apiOk, authenticate } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getPlan, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `GET /api/billing` — current subscription, plan and usage for this month. */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);

  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.userId },
      select: { plan: true, email: true },
    }),
    prisma.subscriber.findUnique({ where: { stripeCustomerId: auth.userId } }),
  ]);

  const sites = await prisma.site.findMany({
    where: { userId: auth.userId },
    select: { publicId: true },
  });

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const eventsThisMonth = await prisma.event.count({
    where: {
      siteId: { in: sites.map((s) => s.publicId) },
      createdAt: { gte: startOfMonth },
    },
  });

  const planId = (user?.plan ?? "hobby") as PlanId;
  const limit = getPlan(planId).events;

  return apiOk({
    plan: getPlan(planId),
    subscription: subscription ?? null,
    usage: {
      events: eventsThisMonth,
      limit,
      percent: limit ? Math.min(100, (eventsThisMonth / limit) * 100) : 0,
    },
    siteCount: sites.length,
  });
}
