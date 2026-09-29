/** Single source of truth for plans, shared by the API, the UI and the seed. */
export const PLANS = {
  hobby: {
    id: "hobby",
    name: "Hobby",
    monthly: 0,
    yearly: 0,
    events: 10_000,
    sites: 1,
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthly: 900,
    yearly: 700,
    events: 100_000,
    sites: 25,
  },
  scale: {
    id: "scale",
    name: "Scale",
    monthly: 2900,
    yearly: 2400,
    events: 1_000_000,
    sites: 100,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function getPlan(plan: string | null | undefined): (typeof PLANS)[PlanId] {
  return PLANS[(plan as PlanId) ?? "hobby"] ?? PLANS.hobby;
}

export function eventLimitFor(plan: string | null | undefined): number {
  return getPlan(plan).events;
}

export function siteLimitFor(plan: string | null | undefined): number {
  return getPlan(plan).sites;
}
