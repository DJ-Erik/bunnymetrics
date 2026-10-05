import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { locales, routing } from "./i18n";

/**
 * Locale negotiation for every navigable request.
 *
 * Resolution order:
 *   1. an explicit locale in the path — /it/pricing wins outright
 *   2. the NEXT_LOCALE cookie           — set by the language switcher
 *   3. the Accept-Language header      — so a first-time Italian visitor lands
 *                                        on /it without being asked
 *   4. English                          — the default
 *
 * The switcher is plain links to the other locale's URL, so persisting the
 * choice has to happen here: seeing an explicit prefix is the signal that the
 * visitor chose that language, and we store it. That keeps the switcher at zero
 * client JavaScript.
 *
 * next-intl manages NEXT_LOCALE itself for detection (steps 2-3 above); this
 * wrapper only extends its lifetime when a prefix is present.
 *
 * `/api/*` and `/tracking.js` are deliberately excluded — the collector is
 * fetched cross-origin by every tracked site and must never redirect.
 */
const handleLocale = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = handleLocale(request);
  const { pathname } = request.nextUrl;
  const [, firstSegment] = pathname.split("/");

  // Remember an explicitly chosen locale for future visits.
  //
  // next-intl already writes NEXT_LOCALE whenever it *detects* a locale, but
  // that default cookie is a session cookie: closing the browser drops the
  // choice and the visitor lands back on whatever Accept-Language says. Giving
  // it an explicit maxAge on an explicit `/it` or `/en` visit is what makes
  // "I picked Italian" stick.
  //
  // The value is the locale itself, never an empty string — an empty
  // NEXT_LOCALE is not a valid locale, so it would neither pin the choice nor
  // clear a stale one, and someone switching Italian -> English would be
  // negotiated straight back to /it by the cookie their previous click set.
  if (locales.includes(firstSegment as (typeof locales)[number])) {
    response.cookies.set("NEXT_LOCALE", firstSegment, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *  - /api/*        (JSON endpoints; must stay unprefixed)
     *  - /tracking.js  (the tracker, fetched by third-party origins)
     *  - Next internals and files with an extension (favicon, robots, …)
     */
    "/((?!api|tracking\\.js|_next|_vercel|.*\\..*).*)",
  ],
};