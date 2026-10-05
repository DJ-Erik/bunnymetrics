import { getTranslations } from "next-intl/server";
import { Quote } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/marketing/section";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ITEMS = ["priya", "marco", "elena"] as const;

const AVATARS: Record<(typeof ITEMS)[number], string> = {
  priya: "PR",
  marco: "MO",
  elena: "EV",
};

export async function Testimonials() {
  const t = await getTranslations("testimonials");

  return (
    <Section className="border-t border-border/50">
      <Container size="wide">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        <Stagger className="mt-14 grid gap-5 md:grid-cols-3">
          {ITEMS.map((key) => (
            <StaggerItem key={key}>
              <figure className="glass sheen flex h-full flex-col rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1">
                <Quote className="size-6 text-primary/50" />
                <blockquote className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-foreground/85">
                  {t(`items.${key}.quote`)}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
                  <Avatar>
                    <AvatarFallback>{AVATARS[key]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t(`items.${key}.name`)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t(`items.${key}.role`)}
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
