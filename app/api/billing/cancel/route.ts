import { z } from "zod";

import { apiError, apiOk, authenticate } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `POST /api/billing/cancel` â€” downgrade to the free tier at period end. */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);
  if (auth.via !== "session") return apiError("Use the dashboard, not a token", 403);

  const body = await request.json().catch(() => ({}));
  const immediately = z
    .object({ immediately: z.boolean().default(false) })
    .safeParse(body ?? {});

  if (!immediately.success) return apiError("Invalid request", 422);
  const now = immediately.data.immediately;

  const subscription = await prisma.subscriber.findUnique({
    where: { stripeCustomerId: auth.userId },
  });

  if (now) {
    await prisma.subscriber.deleteMany({ where: { userId: auth.userId } });
    await prisma.user.update({
      where: { id: auth.userId },
      data: { plan: "hobby" },
    });
    return apiOk({ status: "cancelled", immediate: true });
  }

  if (subscription) {
    await prisma.subscriber.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });
  }

  return apiOk({
    status: "cancelling",
    immediate: false,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
  });
}
