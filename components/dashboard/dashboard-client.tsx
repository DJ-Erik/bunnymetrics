"use client";

import { Clock, Eye, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RANGES, type Range } from "@/lib/validations";
import { formatNumber, percentChange } from "@/lib/utils";

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
  sitePublicId,
  domain,
  initialStats,
  planLimit,
}: {
  sitePublicId: string;
  domain: string;
  initialStats: Stats;
  planLimit: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rangeParam = (searchParams.get("range") ?? "7d") as Range;
  const range: Range = (RANGES as readonly string[]).includes(rangeParam)
    ? rangeParam
    : "7d";

  const [stats, setStats] = React.useState<Stats>(initialStats);
  const [loading, setLoading] = React.useState(false);

  // Reset immediately when the site or range changes, before the fetch lands.
  React.useEffect(() => {
    if (initialStats.range !== stats.range) {
      setStats(initialStats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStats]);

  function setRange(next: Range) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("site", sitePublicId);
    params.set("range", next);
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
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
      toast.error("Couldn't load that range — reverting");
      setRange(range);
      setStats(previous);
    } finally {
      setLoading(false);
    }
  }

  // Reset for a different site.
  React.useEffect(() => {
    setStats(initialStats);
  }, [sitePublicId, initialStats]);

  function exportCsv() {
    const url = `/api/events?site=${encodeURIComponent(sitePublicId)}&format=csv&limit=1000`;
    window.location.href = url;
  }

  const statCards: StatCardData[] = [
    {
      key: "visitors",
      label: "Unique visitors",
      value: stats.totals.visitors,
      change: stats.change.visitors,
      kind: "number",
      icon: Users,
    },
    {
      key: "pageviews",
      label: "Pageviews",
      value: stats.totals.pageviews,
      change: stats.change.pageviews,
      kind: "number",
      icon: Eye,
    },
    {
      key: "bounce",
      label: "Bounce rate",
      value: stats.totals.bounceRate,
      change: -stats.change.bounceRate,
      kind: "percent",
      icon: MousePointerClick,
      invertChange: true,
      hint: "single-page sessions",
    },
    {
      key: "duration",
      label: "Avg. time on page",
      value: stats.totals.avgDuration,
      change: 0,
      kind: "duration",
      icon: Clock,
      hint: "across all pages",
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
              Overview
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.totals.sessions.toLocaleString()} sessions ·{" "}
            {stats.totals.viewsPerVisitor.toFixed(1)} pages per visitor ·{" "}
            {formatNumber(stats.totals.events)} events
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
            Export CSV
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
            <TopPagesTable
              data={stats.topPages}
              loading={loading}
              domain={domain}
            />
          </div>
          <ReferrersCard data={stats.referrers} loading={loading} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BreakdownCard title="Devices" items={stats.devices} loading={loading} />
          <BreakdownCard title="Browsers" items={stats.browsers} loading={loading} />
          <BreakdownCard title="Operating systems" items={stats.operatingSystems} loading={loading} />
          <BreakdownCard
            title="Countries"
            items={stats.countries.map((c) => ({
              label: countryName(c.label),
              value: c.value,
            }))}
            loading={loading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <InstallCard sitePublicId={sitePublicId} domain={domain} />

          <Card glass id="billing" className="h-fit scroll-mt-20">
            <CardContent className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Plan usage
              </p>
              <p className="mt-3 font-display text-3xl font-bold tabular-nums">
                {formatNumber(stats.totals.events)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  / {formatNumber(planLimit)}
                </span>
              </p>
              <Progress value={usagePercent} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                Events counted in the last {stats.range.replace("d", " days")}.
              </p>

              <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-xs">
                {[
                  ["Events", stats.totals.events],
                  ["Pageviews", stats.totals.pageviews],
                  ["Sessions", stats.totals.sessions],
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
                <a href="#install">
                  <TrendingUp />
                  Install &amp; manage
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/70">
          Last computed{" "}
          {new Date(stats.generatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · all times UTC · visitor IDs rotate every 30 days
        </p>
      </div>
    </div>
  );
}

function countryName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ??
      code
    );
  } catch {
    return code;
  }
}

export { Skeleton, percentChange };
