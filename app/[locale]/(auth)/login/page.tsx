import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
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
    namespace: "meta.login",
  });

  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: true },
    alternates: pageAlternates((locale as Locale) ?? defaultLocale, "/login"),
  };
}

/**
 * The switcher lives here rather than in the shared auth layout: the layout
 * covers /login and /signup both, and cannot know which one it is rendering
 * without reading request headers — which would opt both routes out of static
 * prerendering.
 */
export default async function LoginPage({
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
        <LanguageSwitcher locale={locale} currentPath="/login" label={tl("label")} />
        <ThemeToggle />
      </div>
      <LoginForm locale={locale} />
    </div>
  );
}