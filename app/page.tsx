import type { Metadata } from "next";

import { Comparison, Features, HowItWorks } from "@/components/marketing/features";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { Navbar } from "@/components/marketing/navbar";
import { Pricing } from "@/components/marketing/pricing";
import { Testimonials } from "@/components/marketing/testimonials";

export const metadata: Metadata = {
  title: "BunnyMetrics — Privacy-first analytics for indie makers",
  description:
    "A 1.4kb cookie-less analytics script. No consent banner, no PII, no bloat. Understand your traffic in 60 seconds.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <Navbar />
      <main>
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
      <Footer />
    </div>
  );
}
