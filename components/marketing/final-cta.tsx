import { ArrowRight, Lock, ServerOff, Sparkles } from "lucide-react";
import Link from "next/link";

import { AuroraBackground } from "@/components/aurora-background";
import { Container } from "@/components/marketing/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="relative py-24 sm:py-32">
      <Container size="wide">
        <Reveal>
          <div className="glass-strong sheen relative isolate overflow-hidden rounded-[2.5rem] px-6 py-16 text-center sm:px-12 sm:py-20">
            <AuroraBackground variant="cta" />
            <div className="noise pointer-events-none absolute inset-0" />

            <div className="relative mx-auto max-w-2xl">
              <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="size-3" />
                Free forever tier
              </span>

              <h2 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                Stop guessing.{" "}
                <span className="text-gradient-brand">Start knowing.</span>
              </h2>

              <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">
                Ten thousand events a month, forever, with no card. If it earns
                its keep, upgrade. If it doesn&apos;t, you still got the data.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="xl" className="group w-full sm:w-auto">
                  <Link href="/signup">
                    Create your free account
                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="glass" className="w-full sm:w-auto">
                  <Link href="/dashboard">Explore the dashboard</Link>
                </Button>
              </div>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock className="size-3.5 text-success" />
                  No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <ServerOff className="size-3.5 text-success" />
                  No tracking of you
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-success" />
                  Live in 60 seconds
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
