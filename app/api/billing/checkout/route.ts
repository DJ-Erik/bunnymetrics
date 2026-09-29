import { randomUUID } from "node:crypto";

import { z } from "zod";

import { apiError, apiOk, authenticate, stripeConfigured } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "scale"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

/**
 * `POST /api/billing/checkout` — creates or upgrades the subscription.
 *
 * The app ships in mock mode: no Stripe keys, no network calls, but the exact
 * same database rows a real webhook would write, so the whole billing UI works
 * offline. Set `STRIPE_SECRET_KEY` to flip `mode` to `live`, which is where a
 * real `stripe.checkout.sessions.create` call would slot in.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return apiError("Unauthorized", 401);
  if (auth.via !== "session") return apiError("Use the dashboard, not a token", 403);

  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return apiError("Choose a valid plan", 422);

  const { plan, interval } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true },
  });
  if (!user) return apiError("Account not found", 404);

  const price = interval === "yearly" ? PLANS[plan].yearly : PLANS[plan].monthly;
  const periodEnd = new Date(
    Date.now() + (interval === "yearly" ? 365 : 30) * 86_400_000,
  );

  const subscription = await prisma.subscriber.upsert({
    where: { stripeCustomerId: user.id },
    create: {
      userId: user.id,
      stripeCustomerId: user.id,
      stripeSubscriptionId: `mock_sub_${randomUUID().slice(0, 13)}`,
      stripePriceId: `mock_price_${plan}_${interval}`,
      plan,
      status: "active",
      currentPeriodEnd: periodEnd,
    },
    update: {
      stripeSubscriptionId: `mock_sub_${randomUUID().slice(0, 13)}`,
      stripePriceId: `mock_price_${plan}_${interval}`,
      plan,
      status: "active",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { plan } });

  return apiOk({
    subscription,
    plan: PLANS[plan],
    amount: price,
    currency: "usd",
    interval,
    mode: stripeConfigured() ? "live" : "mock",
  });
}
