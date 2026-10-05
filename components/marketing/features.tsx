import { getTranslations } from "next-intl/server";

import {
  Ban,
  Eye,
  Gauge,
  Globe2,
  Layers,
  LineChart,
  MousePointerClick,
  Radio,
  Timer,
} from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/marketing/section";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const FEATURES = [
  { key: "size", icon: Gauge, span: "lg:col-span-2" },
  { key: "privacy", icon: Ban, span: "" },
  { key: "realtime", icon: Radio, span: "" },
  { key: "events", icon: MousePointerClick, span: "" },
  { key: "engagement", icon: Timer, span: "" },
  { key: "charts", icon: LineChart, span: "lg:col-span-2" },
] as const;

export async function Features() {
  const t = await getTranslations("features");

  return (
    <Section id="features">
      <Container size="wide">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.key} className={cn("group relative", feature.span)}>
              <div className="glass sheen h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15">
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-xl border border-foreground/10 bg-foreground/[0.04] p-2.5">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    {t(`items.${feature.key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`items.${feature.key}.body`)}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}

const COMPARISON_ROWS = ["script", "cookies", "banner", "ip", "gdpr", "price"] as const;

const BENEFIT_KEYS = ["dpa", "policy", "banner", "anywhere"] as const;

export async function Comparison() {
  const t = await getTranslations("features.comparison");

  return (
    <Section className="border-y border-border/50 bg-muted/25">
      <Container size="wide">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading
              align="left"
              eyebrow={t("eyebrow")}
              title={t("title")}
              description={t("description")}
            />
            <ul className="mt-8 space-y-3">
              {BENEFIT_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {t(`benefits.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass overflow-hidden rounded-2xl">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-border/60 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>{t("metric")}</span>
              <span className="text-center text-primary">{t("bunny")}</span>
              <span className="text-center">{t("typical")}</span>
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row}
                className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-b border-border/40 px-5 py-3.5 text-sm last:border-0 hover:bg-foreground/[0.02]"
              >
                <span className="text-muted-foreground">{t(`rows.${row}.label`)}</span>
                <span className="text-center font-semibold text-success">
                  {t(`rows.${row}.bunny`)}
                </span>
                <span className="text-center text-muted-foreground/70">
                  {t(`rows.${row}.typical`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

const STEPS = [
  {
    key: "one",
    icon: Layers,
    code: "site: bm_acme_8f2k1",
  },
  {
    key: "two",
    icon: Eye,
    code: '<script defer src="…/tracking.js" data-site="bm_acme_8f2k1"></script>',
  },
  {
    key: "three",
    icon: Globe2,
    code: "live in ~1.2s",
  },
] as const;

export async function HowItWorks() {
  const t = await getTranslations("features.howItWorks");

  return (
    <Section id="how-it-works">
      <Container size="wide">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        <Stagger className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((item, index) => (
            <StaggerItem key={item.key} className="relative">
              <div className="glass h-full rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-xl border border-foreground/10 bg-foreground/[0.04] p-2.5">
                    <item.icon className="size-5 text-primary" />
                  </div>
                  <span className="font-mono text-3xl font-bold text-foreground/[0.07]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                  {t(`steps.${item.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`steps.${item.key}.body`)}
                </p>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-border/60 bg-background/50 p-3 font-mono text-[11px] leading-relaxed text-foreground/70">
                  <code>{item.code}</code>
                </pre>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
