import { getTranslations } from "next-intl/server";
import { ArrowRight, Lock, ServerOff, Sparkles } from "lucide-react";

import { AuroraBackground } from "@/components/aurora-background";
import { Container } from "@/components/marketing/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const PERKS = [
  { key: "perk1", icon: Lock },
  { key: "perk2", icon: ServerOff },
  { key: "perk3", icon: Sparkles },
] as const;

export async function FinalCta() {
  const t = await getTranslations("finalCta");

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
                {t("badge")}
              </span>

              <h2 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                {t("titleLead")} <span className="text-gradient-brand">{t("titleAccent")}</span>
              </h2>

              <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">
                {t("description")}
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="xl" className="group w-full sm:w-auto">
                  <Link href="/signup">
                    {t("primaryCta")}
                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="glass" className="w-full sm:w-auto">
                  <Link href="/dashboard">{t("secondaryCta")}</Link>
                </Button>
              </div>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
                {PERKS.map((perk) => (
                  <span key={perk.key} className="flex items-center gap-1.5">
                    <perk.icon className="size-3.5 text-success" />
                    {t(perk.key)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
