"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AuroraBackground } from "@/components/aurora-background";
import { Container } from "@/components/marketing/section";
import { EASE } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

const up = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40">
      <AuroraBackground />
      <div className="noise pointer-events-none absolute inset-0" />

      <Container size="wide" className="relative">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.div
            initial={reduce ? undefined : "hidden"}
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.09 } },
            }}
          >
            <motion.div variants={reduce ? undefined : up}>
              <Link
                href="#features"
                className="glass group inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm transition-colors hover:border-foreground/20"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="size-3" />
                  New
                </span>
                <span className="text-muted-foreground group-hover:text-foreground">
                  Scroll-depth + engagement analytics are live
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>

            <motion.h1
              variants={reduce ? undefined : up}
              className="mt-8 text-balance font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-7xl"
            >
              Analytics that respects
              <br className="hidden sm:block" />{" "}
              <span className="text-gradient-brand">your visitors</span> and your
              <br className="hidden sm:block" /> bundle budget
            </motion.h1>

            <motion.p
              variants={reduce ? undefined : up}
              className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              A <strong className="font-semibold text-foreground">1.4kb</strong>{" "}
              cookie-less script that tells you who visits, what they read, and
              where they bounce. No consent banner. No PII. No Lighthouse penalty.
            </motion.p>

            <motion.div
              variants={reduce ? undefined : up}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
            >
              <Button asChild size="xl" className="group w-full sm:w-auto">
                <Link href="/signup">
                  Start tracking free
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="glass" className="w-full sm:w-auto">
                <Link href="/login">View live demo</Link>
              </Button>
            </motion.div>

            <motion.p
              variants={reduce ? undefined : up}
              className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-success" />
                No credit card
              </span>
              <span className="hidden size-1 rounded-full bg-border sm:block" />
              <span>10k events/month free</span>
              <span className="hidden size-1 rounded-full bg-border sm:block" />
              <span>Self-host in one command</span>
            </motion.p>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 44, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
          className="relative mx-auto mt-16 max-w-5xl sm:mt-20"
        >
          <DashboardPreview />
        </motion.div>
      </Container>
    </section>
  );
}

/** Static, decorative dashboard render used as the hero visual. */
function DashboardPreview() {
  const reduce = useReducedMotion();
  const bars = [38, 52, 44, 61, 73, 58, 82, 69, 91, 78, 88, 96, 84, 100];

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -top-6 bottom-0 -z-10 rounded-[2.5rem] bg-gradient-to-b from-primary/[0.14] to-transparent blur-2xl"
      />
      <div className="glass-strong overflow-hidden rounded-3xl p-2 shadow-lift sm:p-3">
        <div className="overflow-hidden rounded-2xl border border-foreground/[0.07] bg-card/60">
          {/* chrome */}
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-destructive/60" />
              <span className="size-2.5 rounded-full bg-warning/60" />
              <span className="size-2.5 rounded-full bg-success/60" />
            </div>
            <div className="mx-auto flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
              <LogoMark className="size-3.5" />
              bunnymetrics.app/dashboard
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-[1.15fr_1fr] sm:p-5">
            {/* chart card */}
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Visitors
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold">24,891</p>
                </div>
                <Badge variant="success" className="tabular-nums">
                  +18.4%
                </Badge>
              </div>
              <div className="flex h-28 items-end gap-1.5 sm:h-32">
                {bars.map((height, i) => (
                  <motion.div
                    key={i}
                    initial={reduce ? undefined : { height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{
                      duration: 0.8,
                      delay: 0.75 + i * 0.05,
                      ease: EASE,
                    }}
                    className="flex-1 rounded-t-[3px] bg-gradient-to-t from-primary/25 to-primary"
                  />
                ))}
              </div>
            </div>

            {/* side cards */}
            <div className="grid gap-4">
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Active right now
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-success" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-success" />
                  </span>
                  <p className="font-display text-2xl font-bold">27</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Top pages
                </p>
                <div className="space-y-2.5">
                  {[
                    ["/", 92],
                    ["/pricing", 64],
                    ["/docs/getting-started", 41],
                  ].map(([path, width]) => (
                    <div key={path as string} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-mono text-foreground/80">{path}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={reduce ? undefined : { width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
                          className="h-full rounded-full bg-accent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <motion.div
        initial={reduce ? undefined : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.3, duration: 0.6 }}
        className="glass absolute -left-3 top-1/3 hidden rounded-2xl px-3.5 py-2.5 shadow-lift lg:block"
      >
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Script size
        </p>
        <p className="font-mono text-lg font-bold text-success">1.4kb</p>
      </motion.div>

      <motion.div
        initial={reduce ? undefined : { opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.45, duration: 0.6 }}
        className="glass absolute -right-3 bottom-1/4 hidden rounded-2xl px-3.5 py-2.5 shadow-lift lg:block"
      >
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Cookies set
        </p>
        <p className="flex items-center gap-1.5 font-mono text-lg font-bold">
          0
          <span className="size-1.5 rounded-full bg-success" />
        </p>
      </motion.div>
    </div>
  );
}
