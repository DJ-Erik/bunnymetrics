"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration, formatNumber, formatPercent, truncate } from "@/lib/utils";

export type TopPage = {
  path: string;
  title: string | null;
  views: number;
  visitors: number;
  avgDuration: number;
};

export function TopPagesTable({
  data,
  loading,
  domain,
}: {
  data: TopPage[];
  loading?: boolean;
  domain: string;
}) {
  const t = useTranslations("dashboard.pages");
  // Column headings live in a different namespace and must be resolved at the
  // top level: the table only renders inside a conditional branch, so calling a
  // hook down there would violate the rules of hooks.
  const ts = useTranslations("dashboard.stats");
  const maxViews = Math.max(1, ...data.map((page) => page.views));

  return (
    <Card glass className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {t("shown", { count: formatNumber(data.length) })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {loading ? (
          <div className="space-y-2 px-6 pb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[46%]">{t("page")}</TableHead>
                <TableHead className="text-right">{ts("pageviews")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {ts("visitors")}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {ts("duration")}
                </TableHead>
                <TableHead className="w-[16%] text-right">{t("share")}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((page) => {
                const share = (page.views / maxViews) * 100;
                const href = `https://${domain}${page.path}`;
                return (
                  <TableRow key={page.path}>
                    <TableCell>
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex min-w-0 items-center gap-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[13px] text-foreground/90 group-hover:text-primary">
                            {truncate(page.path, 46)}
                          </p>
                          {page.title && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {truncate(page.title, 60)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(page.views)}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
                      {formatNumber(page.visitors)}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground md:table-cell">
                      {page.avgDuration ? formatDuration(page.avgDuration) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatPercent(share, 0)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function ReferrersCard({
  data,
  loading,
}: {
  data: Array<{ source: string; visits: number; share: number }>;
  loading?: boolean;
}) {
  const t = useTranslations("dashboard.referrers");

  return (
    <Card glass className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-2.5">
            {data.map((ref) => (
              <li key={ref.source} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{ref.source}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatNumber(ref.visits)} · {formatPercent(ref.share, 0)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-500"
                    style={{ width: `${Math.max(3, ref.share)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export type BreakdownItem = { label: string; value: number };

export function BreakdownCard({
  title,
  items,
  loading,
  emptyLabel,
}: {
  title: string;
  items: BreakdownItem[];
  loading?: boolean;
  emptyLabel?: string;
}) {
  const t = useTranslations("dashboard.breakdown");
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <Card glass className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {emptyLabel ?? t("empty")}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatNumber(item.value)}
                    <span className="ml-1.5 text-muted-foreground/60">
                      {formatPercent(total ? (item.value / total) * 100 : 0, 0)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                    style={{ width: `${(item.value / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
