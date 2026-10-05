import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getStats } from "@/lib/stats";
import { getUserSites, requireUser } from "@/lib/guards";
import { eventLimitFor } from "@/lib/plans";
import { RANGES, type Range } from "@/lib/validations";
import {
  defaultLocale,
  locales,
  routing,
  type Locale,
} from "@/i18n";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type SearchParams = Promise<{ site?: string; range?: string }>;

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    redirect(`/${defaultLocale}/dashboard`);
  }
  const active = locale as Locale;
  setRequestLocale(active);

  const user = await requireUser();
  const sites = await getUserSites(user.id);

  // No sites yet — send them to onboarding instead of an empty dashboard.
  if (sites.length === 0) {
    return <EmptyState locale={active} plan={user.plan} />;
  }

  const query = await searchParams;
  const requested = sites.find((site) => site.publicId === query.site) ?? sites[0];

  if (!requested) {
    return <EmptyState locale={active} plan={user.plan} />;
  }

  const prefix = active === defaultLocale ? "" : `/${active}`;

  // Keep the URL honest: if the query pointed at a site this user does not own,
  // send them to their first site rather than leaking that it exists.
  if (query.site && query.site !== requested.publicId) {
    redirect(`${prefix}/dashboard?site=${requested.publicId}`);
  }

  const rangeParam = query.range ?? "7d";
  const range: Range = (RANGES as readonly string[]).includes(rangeParam)
    ? (rangeParam as Range)
    : "7d";

  const stats = await getStats(requested.publicId, range);

  return (
    <DashboardClient
      locale={active}
      sitePublicId={requested.publicId}
      domain={requested.domain}
      initialStats={stats}
      planLimit={eventLimitFor(user.plan)}
    />
  );
}
