import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Comparison, Features, HowItWorks } from "@/components/marketing/features";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { Navbar } from "@/components/marketing/navbar";
import { Pricing } from "@/components/marketing/pricing";
import { Testimonials } from "@/components/marketing/testimonials";

import { pageAlternates } from "@/lib/alternates";
import { defaultLocale, type Locale } from "@/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: (locale as Locale) ?? defaultLocale,
    namespace: "meta.home",
  });

  return {
    title: t("title"),
    description: t("description"),
    alternates: pageAlternates((locale as Locale) ?? defaultLocale),
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative min-h-dvh overflow-x-clip">
<Navbar />
        <main>
          {/* These sections read their copy from the request locale via
              getTranslations, so none of them needs a `locale` prop. */}
          <Hero />
          <LogoMarquee />
          <Features />
          <Comparison />
          <HowItWorks />
          <Testimonials />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        {/* Footer switcher keeps its hrefs on the current page: /it#faq stays Italian. */}
        <Footer locale={locale} currentPath={locale === defaultLocale ? "/" : `/${locale}`} />
    </div>
  );
}
