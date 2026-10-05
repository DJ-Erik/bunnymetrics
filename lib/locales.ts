/**
 * Locale data that is safe to import from both server and client code.
 *
 * Kept separate from `i18n.ts` on purpose: that module exports a
 * `getRequestConfig` that imports the message catalogues, so a client component
 * importing from it would pull the server config and the translations into the
 * browser bundle. Nothing in this file may import anything server-only.
 */

export const locales = ["en", "it"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** BCP-47 tags for <html lang> and hreflang. */
export const htmlLang: Record<Locale, string> = {
  en: "en",
  it: "it",
};

/** Endonyms: a language switcher should be readable to whoever it names. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Swap the locale prefix on a path while preserving everything after it, so
 * `/pricing` becomes `/it/pricing` and `/it/pricing` becomes `/pricing`.
 * English is canonical at the root, so its prefix is dropped.
 *
 * This produces the *canonical* URL, which is what hreflang and `next/link`
 * want. For English that means an unprefixed path.
 */
export function swapLocalePath(pathname: string, target: Locale): string {
  const bare = pathname.replace(/^\/(?:en|it)(?=\/|$)/, "");
  const rest = bare === "" ? "" : bare;
  return target === defaultLocale ? rest || "/" : `/${target}${rest}`;
}

/**
 * The URL the language switcher should link to.
 *
 * Differs from `swapLocalePath` for English: it keeps the `/en` prefix even
 * though that is not the canonical URL. The switcher is deliberately plain
 * links with no client JavaScript, so the cookie has to be written by the
 * middleware seeing an explicit prefix. Linking straight to `/` would give it no
 * signal, leaving a visitor who switched back from Italian stuck on `/it` via
 * the stale `NEXT_LOCALE` cookie. `/en` 308s to the canonical path, so the URL
 * bar ends up clean.
 *
 * The extra hop is a one-off, on a click the visitor already asked for.
 */
export function languageSwitchPath(pathname: string, target: Locale): string {
  const bare = pathname.replace(/^\/(?:en|it)(?=\/|$)/, "");
  return `/${target}${bare}`;
}
