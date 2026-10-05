import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";

import { DashboardSidebar, MobileDashboardBar } from "@/components/dashboard/sidebar";
import { AuroraBackground } from "@/components/aurora-background";
import { pageAlternates } from "@/lib/alternates";
import { getUserSites, requireUser } from "@/lib/guards";
import { locales, routing, type Locale } from "@/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = hasLocale(routing.locales, locale) ? (locale as Locale) : "en";
  // `meta.dashboard` is a leaf string, so resolve it rather than handing back a
  // translator where a title is expected.
  const t = await getTranslations({ locale: active, namespace: "meta" });
  const title = t("dashboard");

  return {
    title: { default: title, template: "%s · BunnyMetrics" },
    // Authenticated area: keep it out of the index.
    robots: { index: false, follow: false },
    alternates: pageAlternates(active, "/dashboard"),
  };
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const user = await requireUser();
  const sites = await getUserSites(user.id);
  const account = { name: user.name, email: user.email, plan: user.plan };

  return (
    <div className="relative isolate flex min-h-dvh">
      <AuroraBackground variant="page" className="fixed inset-0 -z-10" />

      <DashboardSidebar locale={locale} user={account} sites={sites} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileDashboardBar locale={locale} user={account} sites={sites} />
        {children}
      </div>
    </div>
  );
}
