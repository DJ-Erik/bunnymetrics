import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/toaster";
import { AuthSessionProvider } from "@/components/session-provider";

import { pageAlternates } from "@/lib/alternates";
import { htmlLang, locales, routing, type Locale } from "@/i18n";

import "../globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

/** Prerender both locales at build time. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const active = (hasLocale(routing.locales, locale) ? locale : routing.defaultLocale) as Locale;
  const t = await getTranslations({ locale: active, namespace: "meta.home" });
  const alternates = pageAlternates(active);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t("title"),
      template: `%s · BunnyMetrics`,
    },
    description: t("description"),
    keywords: [
      "privacy analytics",
      "cookie-less analytics",
      "lightweight analytics",
      "indie hacker analytics",
      "GDPR analytics",
      "Plausible alternative",
      "Fathom alternative",
      "open source analytics",
      "analytics senza cookie",
      "statistiche privacy",
    ],
    authors: [{ name: "BunnyMetrics" }],
    creator: "BunnyMetrics",
    applicationName: "BunnyMetrics",
    category: "technology",
    alternates,
    openGraph: {
      type: "website",
      siteName: "BunnyMetrics",
      locale: active === "it" ? "it_IT" : "en_US",
      title: t("title"),
      description: t("description"),
      url: active === routing.defaultLocale ? siteUrl : `${siteUrl}/${active}`,
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a10" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Anything outside the configured set is a genuine 404, not a silent
  // fallback to English — a mistyped locale should not quietly serve English.
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this subtree; without it every server
  // component would await request headers and turn dynamic.
  setRequestLocale(locale);

  return (
    <html
      lang={htmlLang[locale]}
      dir="ltr"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable} dark`}
    >
      <body className="min-h-dvh bg-background font-sans">
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthSessionProvider>{children}</AuthSessionProvider>
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
