import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignupForm } from "@/components/auth/signup-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

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
    namespace: "meta.signup",
  });

  return {
    title: t("title"),
    description: t("description"),
    alternates: pageAlternates((locale as Locale) ?? defaultLocale, "/signup"),
  };
}

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tl = await getTranslations("language");

  return (
    <div className="w-full max-w-sm">
      <div className="absolute right-6 top-6 z-10 flex items-center gap-2">
        <LanguageSwitcher locale={locale} currentPath="/signup" label={tl("label")} />
        <ThemeToggle />
      </div>
      <SignupForm locale={locale} />
    </div>
  );
}
