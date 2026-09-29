import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getStats } from "@/lib/stats";
import { getUserSites, requireUser } from "@/lib/guards";
import { eventLimitFor } from "@/lib/plans";
import { RANGES, type Range } from "@/lib/validations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

type SearchParams = Promise<{ site?: string; range?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const sites = await getUserSites(user.id);

  // No sites yet — send them to onboarding instead of an empty dashboard.
  if (sites.length === 0) {
    return <EmptyState plan={user.plan} />;
  }

  const params = await searchParams;
  const requested = sites.find((site) => site.publicId === params.site) ?? sites[0];

  if (!requested) {
    return <EmptyState plan={user.plan} />;
  }

  // Keep the URL honest: if the query pointed at a site this user doesn't own,
  // send them to their first site rather than leaking that it exists.
  if (params.site && params.site !== requested.publicId) {
    redirect(`/dashboard?site=${requested.publicId}`);
  }

  const rangeParam = params.range ?? "7d";
  const range: Range = (RANGES as readonly string[]).includes(rangeParam)
    ? (rangeParam as Range)
    : "7d";

  const stats = await getStats(requested.publicId, range);

  return (
    <DashboardClient
      sitePublicId={requested.publicId}
      domain={requested.domain}
      initialStats={stats}
      planLimit={eventLimitFor(user.plan)}
    />
  );
}
