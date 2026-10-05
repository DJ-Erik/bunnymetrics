import type { MetadataRoute } from "next";

import { defaultLocale, locales } from "@/i18n";

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

/**
 * Public routes only.
 *
 * `/login` and `/dashboard` are deliberately absent: both send
 * `robots: { index: false }` from their generateMetadata, and listing a page in
 * a sitemap while asking crawlers not to index it is a contradiction that search
 * engines resolve by ignoring the whole sitemap.
 */
const ROUTES = ["", "/signup"];

function localeUrl(locale: string, route: string) {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${base}${prefix}${route}` || `${base}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return ROUTES.flatMap((route) => {
    // x-default points at English, the canonical unprefixed form, so a visitor
    // with no locale preference gets the unprefixed URL.
    const languages = Object.fromEntries(
      locales.map((locale) => [locale, localeUrl(locale, route)]),
    );
    languages["x-default"] = localeUrl(defaultLocale, route);

    return locales.map((locale) => ({
      url: localeUrl(locale, route),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
      alternates: { languages },
    }));
  });
}