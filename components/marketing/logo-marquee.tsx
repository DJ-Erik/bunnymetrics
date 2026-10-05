import { getTranslations } from "next-intl/server";

import { Container } from "@/components/marketing/section";

const LOGOS = [
  "Framer",
  "Vercel",
  "Linear",
  "Supabase",
  "Raycast",
  "Loom",
  "Arc",
  "Cal.com",
  "Dub",
  "Plausible",
];

/** Infinite marquee of "trusted by" wordmarks. Duplicated once for a seamless wrap. */
export async function LogoMarquee() {
  const t = await getTranslations("marquee");

  return (
    <section className="relative border-y border-border/50 py-10">
      <Container size="wide">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("label")}
        </p>
      </Container>

      <div className="mask-fade-x relative mt-7 flex overflow-hidden">
        <div className="flex shrink-0 animate-marquee items-center gap-14 pr-14">
          {[...LOGOS, ...LOGOS].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="select-none whitespace-nowrap font-display text-lg font-semibold text-muted-foreground/50 transition-colors hover:text-muted-foreground sm:text-xl"
              aria-hidden={i >= LOGOS.length}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
