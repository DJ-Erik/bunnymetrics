import { defaultLocale, locales, type Locale } from "@/lib/locales";

/**
 * Canonical + hreflang alternates for a page.
 *
 * Built in one place because Next merges metadata shallowly: a page that sets
 * `alternates: { canonical }` silently discards a layout's `alternates.languages`,
 * which is exactly how the hreflang tags disappeared. Every page that sets
 * metadata now builds its alternates here instead of hand-rolling them.
 */

const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

/** Absolute URL for a path in a given locale. English is canonical unprefixed. */
export function localisedUrl(locale: Locale, path = ""): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${origin}${prefix}${clean}` || `${origin}/`;
}

export function pageAlternates(locale: Locale, path = "") {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = localisedUrl(l, path);
  }
  // x-default points at English, the canonical unprefixed form.
  languages["x-default"] = localisedUrl(defaultLocale, path);

  return {
    canonical: localisedUrl(locale, path),
    languages,
  };
}
