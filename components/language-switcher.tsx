// Plain `next/link`, not the locale-aware one from i18n/navigation: the hrefs
// here are already fully-qualified and deliberately carry an explicit `/en`
// prefix, which the locale-aware Link would prepend again into `/it/en/...`.
import Link from "next/link";

import {
  defaultLocale,
  isLocale,
  languageSwitchPath,
  localeNames,
  locales,
  type Locale,
} from "@/lib/locales";
import { cn } from "@/lib/utils";

/**
 * EN | IT toggle.
 *
 * Deliberately **zero client JavaScript**: it renders plain links, so it costs
 * no hook state, no effect and no event handler. Persistence comes from the
 * middleware, which stores NEXT_LOCALE whenever it sees an explicit locale
 * prefix — so switching is a navigation, not a state update.
 *
 * Each link points at the same page in the other locale, so `/pricing` ->
 * `/it/pricing` and `/it/dashboard` -> `/en/dashboard`.
 *
 * The English link keeps its `/en` prefix (see `languageSwitchPath`) so the
 * middleware always gets the signal it needs to rewrite NEXT_LOCALE; it 308s to
 * the canonical unprefixed path on arrival.
 *
 * This module has no "use client" directive on purpose, and imports locale data
 * from `lib/locales` rather than `i18n` so the server request config and the
 * message catalogues stay out of the browser bundle.
 */
export function LanguageSwitcher({
  locale,
  currentPath,
  className,
  label = "Language",
}: {
  locale: string;
  /** Current pathname including any locale prefix. */
  currentPath: string;
  className?: string;
  /** Translated group label, so the control is not hardcoded English. */
  label?: string;
}) {
  const active: Locale = isLocale(locale) ? locale : defaultLocale;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-foreground/[0.08] bg-background/40 p-0.5 backdrop-blur-sm",
        className,
      )}
      role="group"
      aria-label={label}
    >
      {locales.map((target) => {
        const isActive = target === active;
        return (
          <Link
            key={target}
            href={languageSwitchPath(currentPath, target)}
            hrefLang={target}
            lang={target}
            aria-current={isActive ? "true" : undefined}
            title={localeNames[target]}
            className={cn(
              "rounded-full px-2 py-1 text-[11px] font-semibold transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {target.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
