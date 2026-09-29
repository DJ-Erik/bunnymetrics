"use client";

import { Radio, RefreshCw } from "lucide-react";
import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn, formatNumber, pluralize } from "@/lib/utils";

export type RealtimePayload = {
  activeVisitors: number;
  windowMinutes: number;
  byPath: Array<{ path: string; active: number }>;
};

const POLL_MS = 10_000;

/** Live visitor count, polled from `/api/stats?realtime=1`. */
export function RealtimeCard({
  sitePublicId,
  initial,
}: {
  sitePublicId: string;
  initial: RealtimePayload;
}) {
  const [data, setData] = React.useState<RealtimePayload>(initial);
  const [updatedAt, setUpdatedAt] = React.useState<Date>(new Date());
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(
    async (silent = true) => {
      if (!silent) setLoading(true);
      try {
        const response = await fetch(
          `/api/stats?site=${encodeURIComponent(sitePublicId)}&realtime=1`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        setData((await response.json()) as RealtimePayload);
        setUpdatedAt(new Date());
      } catch {
        // Realtime is best-effort; a dropped poll is not worth a toast.
      } finally {
        setLoading(false);
      }
    },
    [sitePublicId],
  );

  React.useEffect(() => {
    const timer = setInterval(() => void refresh(true), POLL_MS);
    // Catch up immediately when the tab regains focus.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const maxActive = Math.max(1, ...data.byPath.map((p) => p.active));

  return (
    <Card glass className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span
              className={cn(
                "absolute inline-flex size-full animate-pulse-ring rounded-full",
                data.activeVisitors > 0 ? "bg-success" : "bg-muted-foreground",
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                data.activeVisitors > 0 ? "bg-success" : "bg-muted-foreground",
              )}
            />
          </span>
          Active right now
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void refresh(false)}
          disabled={loading}
          aria-label="Refresh realtime"
        >
          <RefreshCw className={cn(loading && "animate-spin")} />
        </Button>
      </CardHeader>

      <CardContent>
        {loading && data.activeVisitors === 0 ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <p className="font-display text-4xl font-bold tabular-nums tracking-tight">
              {formatNumber(data.activeVisitors)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Radio className="size-3" />
              {pluralize(data.activeVisitors, "visitor", "visitors")} in the last{" "}
              {data.windowMinutes} minutes
            </p>

            <div className="mt-5 space-y-2.5 border-t border-border/60 pt-4">
              {data.byPath.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No active visitors right now. Pages they&apos;re viewing will
                  appear here live.
                </p>
              ) : (
                data.byPath.map((entry) => (
                  <div key={entry.path} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="truncate font-mono text-foreground/80">
                        {entry.path}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {entry.active}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-success/60 to-success transition-all duration-500"
                        style={{ width: `${(entry.active / maxActive) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="mt-4 text-[10px] text-muted-foreground/70">
              Updated{" "}
              {updatedAt.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}{" "}
              · refreshes every {POLL_MS / 1000}s
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
