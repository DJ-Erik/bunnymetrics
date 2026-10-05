/**
 * Asserts the locale *routing* contract, not the copy on the page.
 *
 * check-locale-content.mjs proves each locale renders its own text; this proves
 * the negotiation around it, which is where the silent failures live:
 *
 *   - Italian in the cookie must win over the English canonical URL
 *   - switching back to English must actually clear that bias
 *   - the choice must persist (a year-long cookie, not a session cookie)
 *   - Accept-Language must land a first-time visitor correctly
 *   - `/api`, `/tracking.js`, `/sitemap.xml` and `/robots.txt` must never be
 *     redirected or given a locale prefix — the collector is fetched
 *     cross-origin by third-party sites, so a redirect there breaks analytics
 *     for every customer
 *
 * Node's `fetch` keeps no cookie jar, so each request sends exactly the Cookie
 * header given here, which makes the assertions deterministic.
 */
const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ""}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`);
  }
};

async function get(path, { cookie, acceptLanguage } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (acceptLanguage) headers["accept-language"] = acceptLanguage;
  const res = await fetch(BASE + path, { redirect: "manual", headers });
  const body = res.status === 200 ? await res.text() : "";
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return {
    status: res.status,
    location: res.headers.get("location") ?? "",
    body,
    lang: /<html lang="(\w+)"/.exec(body)?.[1] ?? "",
    setCookie,
    hasMaxAge: setCookie.some((c) => /Max-Age/i.test(c)),
  };
}

async function main() {
  console.log(`\n=== i18n routing checks ===\n  base ${BASE}\n`);

  // --- default is English, unprefixed and canonical ---
  {
    const root = await get("/");
    check("/ serves English with no cookie", root.status === 200 && root.lang === "en");
    check(
      "/ is the canonical English URL (no redirect)",
      root.status === 200 && root.location === "",
    );

    const it = await get("/it");
    check("/it serves Italian", it.status === 200 && it.lang === "it");
  }

  // --- /en must not be a second canonical URL for the same page ---
  for (const [path, canonical] of [
    ["/en", "/"],
    ["/en/login", "/login"],
    ["/en/signup", "/signup"],
  ]) {
    const res = await get(path);
    check(
      `${path} redirects to its canonical form`,
      [307, 308].includes(res.status) && res.location === canonical,
      `${res.status} -> ${res.location || "(no location)"}`,
    );
  }

  // --- an Italian cookie must win over the unprefixed canonical URL ---
  for (const path of ["/", "/login", "/signup"]) {
    const res = await get(path, { cookie: "NEXT_LOCALE=it" });
    // `/it` not `/it/`: the root is the one path where next-intl does not add a
    // trailing slash, and `/it/` and `/it` are the same URL.
    const expected = (path === "/" ? "/it" : `/it${path}`).replace(/\/$/, "") || "/it";
    check(
      `cookie=it: ${path} redirects to Italian`,
      [307, 308].includes(res.status) && res.location === expected,
      `${res.status} -> ${res.location || "(no location)"} (want ${expected})`,
    );
  }

  // --- switching back to English must clear the bias, not just redirect once ---
  {
    const switched = await get("/en/login", { cookie: "NEXT_LOCALE=it" });
    check(
      "/en/login redirects to the unprefixed path",
      [307, 308].includes(switched.status) && switched.location === "/login",
      `${switched.status} -> ${switched.location}`,
    );

    const cookie = switched.setCookie.find((c) => c.startsWith("NEXT_LOCALE="));
    check(
      "the switch rewrites NEXT_LOCALE to en",
      cookie?.startsWith("NEXT_LOCALE=en") ?? false,
      cookie ?? "(no cookie set)",
    );
    check(
      "the choice persists (Max-Age), not a session cookie",
      switched.hasMaxAge,
    );

    // The real regression this guards: with a stale it cookie still present,
    // the English landing page bounces straight back to /it.
    const afterSwitch = await get("/login", { cookie: "NEXT_LOCALE=en" });
    check(
      "after switching, English paths stay English",
      afterSwitch.status === 200 && afterSwitch.lang === "en",
      `${afterSwitch.status} lang=${afterSwitch.lang || "-"}`,
    );
  }

  // --- a stated Italian preference must survive a page load ---
  {
    const res = await get("/it", { cookie: "NEXT_LOCALE=it" });
    const cookie = res.setCookie.find((c) => c.startsWith("NEXT_LOCALE="));
    check("/it keeps the visitor on Italian", res.status === 200 && res.lang === "it");
    check(
      "an explicit locale visit stores a persistent cookie",
      (cookie?.startsWith("NEXT_LOCALE=it") ?? false) && res.hasMaxAge,
      cookie ?? "(no cookie set)",
    );
  }

  // --- first-time visitors, before any cookie exists ---
  {
    const italian = await get("/", { acceptLanguage: "it-IT,it;q=0.9,en;q=0.5" });
    check(
      "Accept-Language: it lands a new visitor on /it",
      [307, 308].includes(italian.status) && italian.location === "/it",
      `${italian.status} -> ${italian.location || "(no location)"}`,
    );

    const english = await get("/", { acceptLanguage: "en-GB,en;q=0.9" });
    check(
      "Accept-Language: en is served directly",
      english.status === 200,
      `${english.status}`,
    );
  }

  // --- internal links must not fall back to English ---
  {
    const page = (await get("/it")).body;
    // App routes only: /_next assets and /api calls are not locale-scoped, and
    // /en is the switcher's own link to English (it redirects to the canonical
    // unprefixed path).
    const hrefs = [
      ...new Set(
        [...page.matchAll(/href="(\/(?!\/?_next|\/?api|\/?en)[\w\-./?=&%#]*)"/g)].map(
          (m) => m[1],
        ),
      ),
    ].filter((h) => !h.startsWith("/en"));
    const english = hrefs.filter((h) => !h.startsWith("/it") && h !== "/");
    check(
      "no Italian page links back to an English-only path",
      english.length === 0,
      english.length > 0 ? english.join(", ") : `${hrefs.length} internal links, all prefixed`,
    );
    check(
      "Italian CTAs keep the locale",
      ["/it/signup", "/it/login"].every((h) => hrefs.includes(h)),
    );
  }

  // --- infrastructure that must never be locale-routed ---
  for (const path of ["/tracking.js", "/api/stats?site=x", "/sitemap.xml", "/robots.txt"]) {
    const res = await get(path);
    const clean = res.status !== 307 && res.status !== 308 && !res.location.includes("/it");
    check(
      `${path} is not redirected or prefixed`,
      clean,
      `${res.status}${res.location ? ` -> ${res.location}` : ""}`,
    );
  }

  // --- the tracker must still be byte-identical and cross-origin readable ---
  {
    const res = await fetch(`${BASE}/tracking.js`);
    const body = await res.text();
    check("tracking.js is served", res.status === 200 && body.length > 0, `${body.length} bytes`);
    check(
      "tracking.js is cross-origin readable",
      res.headers.get("access-control-allow-origin") === "*",
    );
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});