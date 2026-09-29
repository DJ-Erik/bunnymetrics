import { Container, Section, SectionHeading } from "@/components/marketing/section";
import { Reveal } from "@/components/motion/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Do I need a cookie consent banner?",
    a: "No. BunnyMetrics stores no cookies, sets no identifiers in your visitors' browsers, and collects no personal data — no IP addresses, no fingerprints, no names, no emails. A rotating first-party ID lives only in localStorage to de-duplicate pageviews within a single browser, and it is never linked to a person. There is nothing to disclose under GDPR or CCPA.",
  },
  {
    q: "How is this different from Google Analytics?",
    a: "GA is a free ad platform that profiles your visitors. It ships 45kb of JavaScript, writes around twenty cookies, requires a consent banner in the EU, and gives you a dashboard optimised for marketing attribution you will never use. BunnyMetrics answers the three questions indie makers actually ask — how many people came, what did they read, where did they leave — in 1.4kb with no personal data.",
  },
  {
    q: "What counts as an event?",
    a: "A pageview is one event. Custom events fired via data-bm attributes, and engagement pings for scroll depth and time-on-page, count as one event each. A typical visitor session produces 2–4 events, so 10,000 events per month is roughly 3,000 sessions — comfortable for any early-stage site.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes, on the Scale plan. It is a standard Next.js app: point it at Postgres or ClickHouse, set four environment variables, and run it under Docker or your favourite PaaS. The schema is plain Prisma, so migrations work exactly as they do here.",
  },
  {
    q: "Is my data sold or used for anything else?",
    a: "Never. There is no third-party sharing, no ad network, no enrichment step, and no model training on your traffic. We store aggregate counters and a hashed visitor ID. Delete your site and its events are gone within seconds.",
  },
  {
    q: "What happens when I exceed my event limit?",
    a: "Nothing breaks. We keep collecting and you keep seeing your data — we simply stop counting new events against your plan until the next billing cycle, and we email you at 80% and 100% so it is never a surprise.",
  },
  {
    q: "Does it work with React, Next.js, Astro, Rails or WordPress?",
    a: "Yes. The script is a single deferred <script> tag with a data-site attribute. It does not care what renders the page, and it works fine alongside React hydration, Astro islands, server-rendered templates, and page builders.",
  },
  {
    q: "Can I export my data?",
    a: "On Pro and above, one click exports every event as CSV, and the /api/stats endpoint returns the full aggregated payload as JSON whenever you want to pipe it into your own warehouse or dashboards.",
  },
];

export function Faq() {
  return (
    <Section id="faq">
      <Container size="narrow">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Still stuck? Email hello@bunnymetrics.dev and a human replies within a day."
        />

        <Reveal className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </Container>
    </Section>
  );
}
