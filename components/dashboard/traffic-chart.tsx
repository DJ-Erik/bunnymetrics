"use client";

import { Activity, Eye, MousePointerClick, Users } from "lucide-react";
import * as React from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/utils";

const CONFIG = {
  visitors: { label: "Visitors", color: "hsl(var(--primary))" },
  pageviews: { label: "Pageviews", color: "hsl(var(--accent))" },
  events: { label: "Events", color: "hsl(var(--cyan))" },
} satisfies ChartConfig;

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
  const [metric, setMetric] = React.useState<"visitors" | "pageviews" | "events">("visitors");

  return (
    <Card glass className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Traffic over time</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {range === "24h" ? "Hourly, last 24 hours" : `Daily, last ${range.replace("d", " days")}`} · UTC
          </p>
        </div>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
          <TabsList>
            <TabsTrigger value="visitors">
              <Users />
              Visitors
            </TabsTrigger>
            <TabsTrigger value="pageviews">
              <Eye />
              Pageviews
            </TabsTrigger>
            <TabsTrigger value="events">
              <Activity />
              Events
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
          <ChartContainer config={CONFIG} className="h-[16rem] w-full">
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

export function RealtimeChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ChartContainer config={CONFIG} className="h-[9rem] w-full">
      <LineChart data={data} margin={{ left: 0, right: 0, top: 4 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide />
        <Line
          dataKey="visitors"
          type="monotone"
          stroke="var(--color-visitors)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[16rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/30 text-center">
      <MousePointerClick className="size-6 text-muted-foreground/50" />
      <p className="text-sm font-medium">No traffic in this period</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Install the tracking snippet on your site and data will appear here
        within seconds.
      </p>
    </div>
  );
}

export { formatNumber };
