import { Quote } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/marketing/section";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TESTIMONIALS = [
  {
    quote:
      "I moved three of my side projects off GA in an evening. Page speed got measurably better and I stopped dreading the cookie banner on my own site.",
    name: "Priya Raghunathan",
    role: "Indie hacker, ShipFastKit",
    initials: "PR",
  },
  {
    quote:
      "The referrer breakdown is the first analytics view I've actually read all week. Found a community that was sending 40% of signups â€” never would have seen that in GA.",
    name: "Marco Oliveira",
    role: "Founder, Loopstack",
    initials: "MO",
  },
  {
    quote:
      "We needed GDPR-safe analytics for a healthcare client. Self-hosting took an afternoon and passed their compliance review without a single finding.",
    name: "Elena Vasquez",
    role: "CTO, Meridian Health",
    initials: "EV",
  },
];

export function Testimonials() {
  return (
    <Section className="border-t border-border/50">
      <Container size="wide">
        <SectionHeading
          eyebrow="Loved by makers"
          title="Don't take our word for it"
          description="Over 4,200 indie founders, side-projecters and tiny SaaS teams use BunnyMetrics every month."
        />

        <Stagger className="mt-14 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <StaggerItem key={item.name}>
              <figure className="glass sheen flex h-full flex-col rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1">
                <Quote className="size-6 text-primary/50" />
                <blockquote className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-foreground/85">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
                  <Avatar>
                    <AvatarFallback>{item.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.role}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
