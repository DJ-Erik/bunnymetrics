"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Container, Section, SectionHeading } from "@/components/marketing/section";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Plan = {
  id: "hobby" | "pro" | "scale";
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  events: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "hobby",
    name: "Hobby",
    tagline: "For the weekend project that suddenly has users.",
    monthly: 0,
    yearly: 0,
    events: "10,000 events / month",
    features: [
      "1 site",
      "30 days of history",
      "Core charts + top pages",
      "Referrers & geography",
      "Realtime visitors",
      "Community support",
    ],
    cta: "Start free",
    href: "/signup",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For products with a real funnel and real traffic.",
    monthly: 9,
    yearly: 7,
    events: "100,000 events / month",
    features: [
      "Unlimited sites",
      "Unlimited history",
      "Custom events + funnels",
      "Scroll depth & engagement",
      "API access + data export",
      "Email support, 24h response",
    ],
    cta: "Start 14-day trial",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "For teams that need the raw numbers, self-hosted.",
    monthly: 29,
    yearly: 24,
    events: "1,000,000 events / month",
    features: [
      "Everything in Pro",
      "Self-host with Docker",
      "Postgres + ClickHouse",
      "SSO / SAML",
      "99.9% uptime SLA",
      "Dedicated Slack channel",
    ],
    cta: "Talk to us",
    href: "/signup?plan=scale",
  },
];

export function Pricing() {
  const [yearly, setYearly] = React.useState(true);

  return (
    <Section id="pricing" className="border-t border-border/50">
      <Container size="wide">
        <SectionHeading
          eyebrow="Pricing"
          title="Cheaper than your coffee, honestly"
          description="Start free forever. Upgrade when your traffic does. Cancel from the dashboard in two clicks — no retention call."
        />

        <Reveal className="mt-9 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm transition-colors",
              !yearly ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Monthly
          </span>
          <Switch checked={yearly} onCheckedChange={setYearly} aria-label="Toggle yearly billing" />
          <span
            className={cn(
              "text-sm transition-colors",
              yearly ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Yearly
          </span>
          <Badge variant="success" className="ml-1">
            Save 20%
          </Badge>
        </Reveal>

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
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
                        Most popular
                      </Badge>
                    </div>
                  </>
                )}

                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="mt-1.5 min-h-[2.5rem] text-sm text-muted-foreground">
                    {plan.tagline}
                  </p>
                </div>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl font-bold tracking-tight">
                    ${yearly ? plan.yearly : plan.monthly}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {plan.events}
                  {yearly && plan.monthly > 0 && " · billed yearly"}
                </p>

                <Button
                  asChild
                  size="lg"
                  variant={plan.highlighted ? "default" : "outline"}
                  className="mt-6 w-full"
                >
                  <Link href={plan.href}>
                    {plan.cta}
                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                <ul className="mt-7 space-y-3 border-t border-border/60 pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          plan.highlighted ? "text-primary" : "text-success",
                        )}
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Need more than 1M events?{" "}
            <a
              href="mailto:hello@bunnymetrics.dev"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Talk to us about volume pricing
            </a>
            . Nonprofits get Pro free — just ask.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
