import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { defineRouting } from "next-intl/routing";

import { defaultLocale, isLocale, locales, type Locale } from "@/lib/locales";

export { defaultLocale, htmlLang, isLocale, localeNames, locales, type Locale } from "@/lib/locales";

/**
 * BunnyMetrics ships two locales.
 *
 * `localePrefix: "as-needed"` puts English at the root (`/pricing`) and Italian
 * behind a prefix (`/it/pricing`). That keeps every existing English URL — and
 * every link already pasted into someone's README — working untouched, and it
 * makes English the canonical, unprefixed form. `/en/...` redirects to the
 * unprefixed equivalent so there is exactly one canonical URL per page.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

/**
 * Loads the message catalogue for the active locale. Only the active locale's
 * JSON is imported, so the Italian bundle never ships to an English visitor.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested)
    ? (requested as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: "UTC",
    now: new Date(),
  };
});
