import { getTranslations } from "next-intl/server";

import { Container, Section, SectionHeading } from "@/components/marketing/section";
import { Reveal } from "@/components/motion/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ITEMS = [
  "consent",
  "google",
  "event",
  "selfHost",
  "data",
  "limit",
  "frameworks",
  "export",
] as const;

export async function Faq() {
  const t = await getTranslations("faq");

  return (
    <Section id="faq">
      <Container size="narrow">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

        <Reveal className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {ITEMS.map((key) => (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger>{t(`items.${key}.q`)}</AccordionTrigger>
                <AccordionContent>{t(`items.${key}.a`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </Container>
    </Section>
  );
}
