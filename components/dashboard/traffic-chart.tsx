"use client";

import { Activity, Eye, MousePointerClick, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MetricKey = "visitors" | "pageviews" | "events";

// Colours are static and never translated; labels are filled in from messages
// inside the component (see `config` below).
const CONFIG_COLORS = {
  visitors: "hsl(var(--primary))",
  pageviews: "hsl(var(--accent))",
  events: "hsl(var(--cyan))",
} as const satisfies Record<MetricKey, string>;

export type SeriesPoint = {
  key: string;
  label: string;
  full: string;
  visitors: number;
  pageviews: number;
  events: number;
};

export function TrafficChart({
  data,
  loading,
  range,
}: {
  data: SeriesPoint[];
  loading?: boolean;
  range: string;
}) {
  const t = useTranslations("dashboard.chart");
  const ts = useTranslations("dashboard.stats");
  const [metric, setMetric] = React.useState<MetricKey>("visitors");

  // Colours are static, but the legend/tooltip labels are user-facing, so the
  // config is built from translations inside the component.
  const config = {
    visitors: { label: ts("visitors"), color: CONFIG_COLORS.visitors },
    pageviews: { label: ts("pageviews"), color: CONFIG_COLORS.pageviews },
    events: { label: ts("events"), color: CONFIG_COLORS.events },
  } satisfies ChartConfig;

  return (
    <Card glass className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {range === "24h"
              ? `${t("hourly")} · ${t("utc")}`
              : `${t("daily", { days: range.replace("d", "") })} · ${t("utc")}`}
          </p>
        </div>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
          <TabsList>
            <TabsTrigger value="visitors">
              <Users />
              {ts("visitors")}
            </TabsTrigger>
            <TabsTrigger value="pageviews">
              <Eye />
              {ts("pageviews")}
            </TabsTrigger>
            <TabsTrigger value="events">
              <Activity />
              {ts("events")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <Skeleton className="h-[16rem] w-full rounded-xl" />
        ) : data.every((point) => point.events === 0) ? (
          <EmptyChart />
        ) : (
          <ChartContainer config={config} className="h-[16rem] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-visitors)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-visitors)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillPageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-pageviews)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-pageviews)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={24}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={38}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) =>
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
                }
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_value, payload) =>
                      (payload?.[0]?.payload?.full as React.ReactNode) ?? String(_value)
                    }
                  />
                }
              />

              <Area
                dataKey="pageviews"
                type="monotone"
                stroke="var(--color-pageviews)"
                strokeWidth={1.5}
                fill="url(#fillPageviews)"
                hide={metric !== "pageviews"}
                animationDuration={700}
              />
              <Area
                dataKey="events"
                type="monotone"
                stroke="var(--color-events)"
                strokeWidth={1.5}
                fill="transparent"
                hide={metric !== "events"}
                animationDuration={700}
              />
              <Area
                dataKey="visitors"
                type="monotone"
                stroke="var(--color-visitors)"
                strokeWidth={2.25}
                fill="url(#fillVisitors)"
                hide={metric !== "visitors"}
                animationDuration={700}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  const t = useTranslations("dashboard.chart");

  return (
    <div className="flex h-[16rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/30 text-center">
      <MousePointerClick className="size-6 text-muted-foreground/50" />
      <p className="text-sm font-medium">{t("empty")}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{t("emptyHint")}</p>
    </div>
  );
}
