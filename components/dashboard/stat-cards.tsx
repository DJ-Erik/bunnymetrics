"use client";

import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDuration, formatNumber, formatPercent } from "@/lib/utils";

type Kind = "number" | "percent" | "duration";

export interface StatCardData {
  key: string;
  label: string;
  value: number;
  change: number;
  kind: Kind;
  icon: LucideIcon;
  hint?: string;
  /** For bounce rate, a *decrease* is good. */
  invertChange?: boolean;
}

const FORMATTERS: Record<Kind, (n: number) => string> = {
  number: (n) => formatNumber(n),
  percent: (n) => formatPercent(n),
  duration: (n) => formatDuration(n),
};

export function StatCards({
  data,
  loading,
}: {
  data: StatCardData[];
  loading?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((stat) => (
        <StatCard key={stat.key} stat={stat} loading={loading} />
      ))}
    </div>
  );
}

function StatCard({ stat, loading }: { stat: StatCardData; loading?: boolean }) {
  const t = useTranslations("dashboard");

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-28" />
        <Skeleton className="mt-3 h-3 w-32" />
      </Card>
    );
  }

  const delta = stat.change;
  const flat = Math.abs(delta) < 0.05;
  const good = stat.invertChange ? delta < 0 : delta > 0;
  const Icon = stat.icon;

  const Delta = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <Card glass className="group p-5 transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {stat.label}
        </p>
        <div className="rounded-lg border border-foreground/[0.07] bg-foreground/[0.03] p-1.5 text-muted-foreground transition-colors group-hover:text-primary">
          <Icon className="size-3.5" />
        </div>
      </div>

      <p className="mt-3 font-display text-3xl font-bold tabular-nums tracking-tight">
        {FORMATTERS[stat.kind](stat.value)}
      </p>

      <div className="mt-2.5 flex items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
            flat
              ? "bg-muted text-muted-foreground"
              : good
                ? "bg-success/12 text-success"
                : "bg-destructive/12 text-destructive",
          )}
        >
          <Delta className="size-3" />
          {formatPercent(Math.abs(delta))}
        </span>
        <span className="truncate text-muted-foreground">
          {stat.hint ?? t("stats.vsPrevious")}
        </span>
      </div>
    </Card>
  );
}
