"use client";

import { Clock, Eye, MousePointerClick, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { BreakdownCard, ReferrersCard, TopPagesTable } from "@/components/dashboard/breakdown";
import { InstallCard } from "@/components/dashboard/install-card";
import { RealtimeCard, type RealtimePayload } from "@/components/dashboard/realtime-card";
import { StatCards, type StatCardData } from "@/components/dashboard/stat-cards";
import { TrafficChart, type SeriesPoint } from "@/components/dashboard/traffic-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RANGES, type Range } from "@/lib/validations";
import { formatNumber } from "@/lib/utils";
import { defaultLocale } from "@/lib/locales";

type Stats = {
  range: Range;
  generatedAt: string;
  totals: {
    visitors: number;
    pageviews: number;
    events: number;
    sessions: number;
    bounceRate: number;
    avgDuration: number;
    viewsPerVisitor: number;
  };
  change: { visitors: number; pageviews: number; bounceRate: number };
  series: SeriesPoint[];
  topPages: Array<{
    path: string;
    title: string | null;
    views: number;
    visitors: number;
    avgDuration: number;
  }>;
  referrers: Array<{ source: string; visits: number; share: number }>;
  devices: Array<{ label: string; value: number }>;
  browsers: Array<{ label: string; value: number }>;
  operatingSystems: Array<{ label: string; value: number }>;
  countries: Array<{ label: string; value: number }>;
  realtime: RealtimePayload;
};

export function DashboardClient({
  locale,
  sitePublicId,
  domain,
  initialStats,
  planLimit,
}: {
  locale: string;
  sitePublicId: string;
  domain: string;
  initialStats: Stats;
  planLimit: number;
}) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("dashboard.stats");
  const tb = useTranslations("dashboard.breakdown");
  const th = useTranslations("dashboard.header");
  const tu = useTranslations("dashboard.usage");

  const router = useRouter();
  const searchParams = useSearchParams();
  const prefix = locale === defaultLocale ? "" : `/${locale}`;

  const rangeParam = (searchParams.get("range") ?? "7d") as Range;
  const range: Range = (RANGES as readonly string[]).includes(rangeParam)
    ? rangeParam
    : "7d";

  const [stats, setStats] = React.useState<Stats>(initialStats);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  function setRange(next: Range) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("site", sitePublicId);
    params.set("range", next);
    router.push(`${prefix}/dashboard?${params.toString()}`, { scroll: false });
  }

  async function loadRange(next: Range) {
    setLoading(true);
    const previous = stats;
    setRange(next);

    try {
      const response = await fetch(
        `/api/stats?site=${encodeURIComponent(sitePublicId)}&range=${next}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Request failed");
      const payload = (await response.json()) as Stats & { site?: unknown };
      delete payload.site;
      setStats(payload);
    } catch {
toast.error(th("rangeError"));
      setRange(range);
      setStats(previous);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const url = `/api/events?site=${encodeURIComponent(sitePublicId)}&format=csv&limit=1000`;
    window.location.href = url;
  }

  const statCards: StatCardData[] = [
    {
      key: "visitors",
      label: ts("visitors"),
      value: stats.totals.visitors,
      change: stats.change.visitors,
      kind: "number",
      icon: Users,
    },
    {
      key: "pageviews",
      label: ts("pageviews"),
      value: stats.totals.pageviews,
      change: stats.change.pageviews,
      kind: "number",
      icon: Eye,
    },
    {
      key: "bounce",
      label: ts("bounce"),
      value: stats.totals.bounceRate,
      change: -stats.change.bounceRate,
      kind: "percent",
      icon: MousePointerClick,
      invertChange: true,
      hint: ts("bounceHint"),
    },
    {
      key: "duration",
      label: ts("duration"),
      value: stats.totals.avgDuration,
      change: 0,
      kind: "duration",
      icon: Clock,
      hint: ts("durationHint"),
    },
  ];

  const usagePercent = planLimit
    ? Math.min(100, (stats.totals.events / planLimit) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* header */}
      <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-xl font-bold tracking-tight">
              {domain}
            </h1>
            <Badge variant="secondary" className="capitalize">
              {th("overview")}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {th("sessions", {
              count: stats.totals.sessions.toLocaleString(),
              perVisitor: stats.totals.viewsPerVisitor.toFixed(1),
              events: formatNumber(stats.totals.events),
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(v) => void loadRange(v as Range)}>
            <TabsList>
              {RANGES.map((value) => (
                <TabsTrigger key={value} value={value} disabled={loading}>
                  {value}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            {t("export")}
          </Button>
        </div>
      </div>

      <div className="space-y-6 px-5 sm:px-8">
        <StatCards data={statCards} loading={loading} />

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TrafficChart data={stats.series} loading={loading} range={stats.range} />
          </div>
          <RealtimeCard sitePublicId={sitePublicId} initial={initialStats.realtime} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TopPagesTable data={stats.topPages} loading={loading} domain={domain} />
          </div>
          <ReferrersCard data={stats.referrers} loading={loading} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BreakdownCard title={tb("devices")} items={stats.devices} loading={loading} />
          <BreakdownCard title={tb("browsers")} items={stats.browsers} loading={loading} />
          <BreakdownCard
            title={tb("os")}
            items={stats.operatingSystems}
            loading={loading}
          />
          <BreakdownCard
            title={tb("countries")}
            items={stats.countries.map((c) => ({
              label: countryName(c.label, locale),
              value: c.value,
            }))}
            loading={loading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <InstallCard locale={locale} sitePublicId={sitePublicId} domain={domain} />

          <Card glass id="billing" className="h-fit scroll-mt-20">
            <CardContent className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {tu("title")}
              </p>
              <p className="mt-3 font-display text-3xl font-bold tabular-nums">
                {formatNumber(stats.totals.events)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  / {formatNumber(planLimit)}
                </span>
              </p>
              <Progress value={usagePercent} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                {tu("counted", { days: stats.range.replace("d", "") })}
              </p>

              <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-xs">
                {[
                  [ts("events"), stats.totals.events],
                  [ts("pageviews"), stats.totals.pageviews],
                  [ts("sessions"), stats.totals.sessions],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono tabular-nums">
                      {formatNumber(Number(value))}
                    </span>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" className="mt-5 w-full" asChild>
                <a href="#install">{tu("install")}</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/70">
          {t("footer", {
            time: new Date(stats.generatedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        </p>
      </div>
    </div>
  );
}

function countryName(code: string, locale: string): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ??
      code
    );
  } catch {
    return code;
  }
}
