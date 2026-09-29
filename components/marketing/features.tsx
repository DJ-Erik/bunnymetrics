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
  {
    icon: Gauge,
    title: "1.4kb, uncompressed",
    body: "One file, one HTTP/2 push, zero dependencies. Your Lighthouse score never notices we're here.",
    span: "lg:col-span-2",
    accent: "from-primary/20",
  },
  {
    icon: Ban,
    title: "Zero cookies. Zero PII.",
    body: "No fingerprinting, no cross-site IDs, no consent banner. GDPR + CCPA out of the box.",
    span: "",
    accent: "from-success/20",
  },
  {
    icon: Radio,
    title: "Realtime visitors",
    body: "Live page-by-page activity from the last 5 minutes, polling every 10 seconds.",
    span: "",
    accent: "from-accent/20",
  },
  {
    icon: MousePointerClick,
    title: "Custom events",
    body: "Any element with data-bm=\"signup\" becomes a tracked event. One attribute, zero config.",
    span: "",
    accent: "from-accent/20",
  },
  {
    icon: Timer,
    title: "Engagement & scroll",
    body: "Time on page and max scroll depth, reported on unload — the two metrics that predict conversion.",
    span: "",
    accent: "from-primary/20",
  },
  {
    icon: LineChart,
    title: "Every chart you need",
    body: "Visitors, pageviews, referrers, geography, devices, browsers, OS, bounce and duration — over any range.",
    span: "lg:col-span-2",
    accent: "from-[hsl(var(--cyan))]/20",
  },
] as const;

export function Features() {
  return (
    <Section id="features">
      <Container size="wide">
        <SectionHeading
          eyebrow="Why BunnyMetrics"
          title={
            <>
              Everything you actually look at,
              <br className="hidden sm:block" /> nothing you have to sit through
            </>
          }
          description="Analytics tools got heavy because they solve enterprise problems. We solved the indie-maker problem instead — and threw away the rest."
        />

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <StaggerItem
              key={feature.title}
              className={cn("group relative", feature.span)}
            >
              <div className="glass sheen h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15">
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                    feature.accent,
                  )}
                />
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-xl border border-foreground/10 bg-foreground/[0.04] p-2.5">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
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

const COMPARISON = [
  { label: "Tracking script", bunny: "1.4kb", other: "8–45kb" },
  { label: "Cookies set", bunny: "0", other: "3–20" },
  { label: "Consent banner", bunny: "Not needed", other: "Required (EU)" },
  { label: "Stores IP addresses", bunny: "No", other: "Yes" },
  { label: "Personal data subject to GDPR", bunny: "No", other: "Yes" },
  { label: "Monthly price (10k events)", bunny: "$0", other: "$0–19" },
];

export function Comparison() {
  return (
    <Section className="border-y border-border/50 bg-muted/25">
      <Container size="wide">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading
              align="left"
              eyebrow="The switch"
              title={
                <>
                  Most analytics are a
                  <br className="hidden sm:block" /> liability in disguise
                </>
              }
              description="Google Analytics loads 45kb, writes 20 cookies, and legally obliges you to ask European visitors for permission before you even do that. BunnyMetrics does none of it."
            />
            <ul className="mt-8 space-y-3">
              {[
                "No data processing agreement to negotiate",
                "No cookie policy to maintain",
                "No banner hurting your conversion rate",
                "Deploy anywhere — static site, edge, or Next.js",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass overflow-hidden rounded-2xl">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-border/60 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Metric</span>
              <span className="text-center text-primary">BunnyMetrics</span>
              <span className="text-center">Typical</span>
            </div>
            {COMPARISON.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-b border-border/40 px-5 py-3.5 text-sm last:border-0 hover:bg-foreground/[0.02]"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-center font-semibold text-success">
                  {row.bunny}
                </span>
                <span className="text-center text-muted-foreground/70">
                  {row.other}
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
    icon: Layers,
    step: "01",
    title: "Add your site",
    body: "Paste your domain. We generate a unique tracking key for that property.",
    code: "site: bm_acme_8f2k1",
  },
  {
    icon: Eye,
    title: "Paste one snippet",
    body: "Drop it above </head> on any framework — Next.js, Astro, Rails, plain HTML.",
    code: '<script defer src="…/tracking.js" data-site="bm_acme_8f2k1"></script>',
  },
  {
    icon: Globe2,
    title: "Watch it land",
    body: "Traffic shows up in realtime. Referrers, pages and devices start populating immediately.",
    code: "live in ~1.2s",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Container size="wide">
        <SectionHeading
          eyebrow="How it works"
          title="Live before your coffee gets cold"
          description="No SDK install, no build step, no tag manager. Three steps, about ninety seconds."
        />

        <Stagger className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((item) => (
            <StaggerItem key={item.step} className="relative">
              <div className="glass h-full rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-xl border border-foreground/10 bg-foreground/[0.04] p-2.5">
                    <item.icon className="size-5 text-primary" />
                  </div>
                  <span className="font-mono text-3xl font-bold text-foreground/[0.07]">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
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
