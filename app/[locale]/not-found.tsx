import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n";

/**
 * Locale-scoped 404.
 *
 * Deliberately reads the locale with `getLocale()` rather than destructuring
 * `params`: Next renders this boundary without props when `notFound()` is
 * thrown from a layout above it, so `params` can be undefined and destructuring
 * it crashes the prerender.
 */
export default async function LocaleNotFound() {
  const resolved = await getLocale();
  const locale: Locale = isLocale(resolved) ? resolved : defaultLocale;
  setRequestLocale(locale);

  const t = await getTranslations("notFound");
  const prefix = locale === defaultLocale ? "" : `/${locale}`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <LanguageSwitcher locale={locale} currentPath={prefix || "/"} />
      <Logo className="my-8" />
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("description")}</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
