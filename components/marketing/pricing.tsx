"use client";

import { ArrowRight, Check } from "lucide-react";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Container, Section, SectionHeading } from "@/components/marketing/section";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type PlanId = "hobby" | "pro" | "scale";

const PLANS: Array<{
  id: PlanId;
  monthly: number;
  yearly: number;
  href: string;
  highlighted?: boolean;
  featureKeys: string[];
}> = [
  {
    id: "hobby",
    monthly: 0,
    yearly: 0,
    href: "/signup",
    featureKeys: ["sites", "history", "charts", "referrers", "realtime", "support"],
  },
  {
    id: "pro",
    monthly: 9,
    yearly: 7,
    href: "/signup?plan=pro",
    highlighted: true,
    featureKeys: ["sites", "history", "events", "engagement", "api", "support"],
  },
  {
    id: "scale",
    monthly: 29,
    yearly: 24,
    href: "/signup?plan=scale",
    featureKeys: ["pro", "docker", "databases", "sso", "sla", "support"],
  },
];

export function Pricing() {
  const t = useTranslations("pricing");
  const [yearly, setYearly] = React.useState(true);

  // Hooks must not run inside a map, so each plan's catalogue is resolved once
  // at the top level and looked up by id below.
  const hobbyT = useTranslations("pricing.plans.hobby");
  const proT = useTranslations("pricing.plans.pro");
  const scaleT = useTranslations("pricing.plans.scale");
  const planTranslations = { hobby: hobbyT, pro: proT, scale: scaleT } as const;

  return (
    <Section id="pricing" className="border-t border-border/50">
      <Container size="wide">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        <Reveal className="mt-9 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm transition-colors",
              !yearly ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t("monthly")}
          </span>
          <Switch
            checked={yearly}
            onCheckedChange={setYearly}
            aria-label={t("monthly")}
          />
          <span
            className={cn(
              "text-sm transition-colors",
              yearly ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t("yearly")}
          </span>
          <Badge variant="success" className="ml-1">
            {t("save")}
          </Badge>
        </Reveal>

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
          {PLANS.map((plan, index) => {
            const pt = planTranslations[plan.id];
            const price = yearly ? plan.yearly : plan.monthly;

            return (
              <Reveal key={plan.id} delay={index * 0.08}>
                <div
                  className={cn(
                    "group relative flex h-full flex-col rounded-3xl p-7 transition-all duration-300",
                    plan.highlighted
                      ? "glass-strong border-glow lg:-my-3 lg:py-10"
                      : "glass hover:border-foreground/15",
                    "hover:-translate-y-1",
                  )}
                >
                  {plan.highlighted && (
                    <>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                      />
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant="default" className="px-3 py-1 shadow-glow-sm">
                          {t("mostPopular")}
                        </Badge>
                      </div>
                    </>
                  )}

                  <div>
                    <h3 className="font-display text-lg font-semibold tracking-tight">
                      {pt("name")}
                    </h3>
                    <p className="mt-1.5 min-h-[2.5rem] text-sm text-muted-foreground">
                      {pt("tagline")}
                    </p>
                  </div>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="font-display text-5xl font-bold tracking-tight">
                      ${price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("perMonth")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {pt("events")}
                    {yearly && plan.monthly > 0 && ` · ${t("billedYearly")}`}
                  </p>

                  <Button
                    asChild
                    size="lg"
                    variant={plan.highlighted ? "default" : "outline"}
                    className="mt-6 w-full"
                  >
                    <Link href={plan.href}>
                      {pt("cta")}
                      <ArrowRight className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>

                  <ul className="mt-7 space-y-3 border-t border-border/60 pt-6">
                    {plan.featureKeys.map((key) => (
                      <li key={key} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            plan.highlighted ? "text-primary" : "text-success",
                          )}
                        />
                        <span className="text-muted-foreground">
                          {pt(`features.${key}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            {t("footnoteLead")}{" "}
            <a
              href="mailto:hello@bunnymetrics.dev"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("footnoteLink")}
            </a>
            . {t("footnoteTail")}
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
