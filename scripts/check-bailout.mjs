/**
 * Fails if any statically prerendered page falls back to client-side rendering,
 * or if a locale is missing from the output.
 *
 * When a statically rendered route renders a client component that calls
 * `useSearchParams` / `usePathname` (or fetches) without a Suspense boundary,
 * Next.js bails that subtree out to the client and writes a
 * `BAILOUT_TO_CLIENT_SIDE_RENDERING` marker into the HTML. The result is a
 * blank first paint and content that search engines may not see, while the
 * build still reports success — which is exactly how this shipped once.
 *
 * Reads the artifacts in `.next/server/app`, so no server is needed.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const MARKER = "BAILOUT_TO_CLIENT_SIDE_RENDERING";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", ".next", "server", "app");

/**
 * Prerendered pages, per locale, with a marker of real content so an empty or
 * errored render cannot pass vacuously.
 *
 * Paths are the `generateStaticParams` forms (`/en/login`, not `/login`):
 * the `as-needed` prefix rewrite happens in middleware at request time.
 */
/** Rendered URLs, per locale: English canonical unprefixed, Italian under /it. */
const PAGES = [
  { url: "/", locale: "en", file: "en.html", expect: "Analytics that respects", lang: "en" },
  { url: "/it", locale: "it", file: "it.html", expect: "Analytics che rispetta", lang: "it" },
  { url: "/login", locale: "en", file: join("en", "login.html"), expect: "Welcome back", lang: "en" },
  { url: "/it/login", locale: "it", file: join("it", "login.html"), expect: "Bentornato", lang: "it" },
  { url: "/signup", locale: "en", file: join("en", "signup.html"), expect: "Start tracking free", lang: "en" },
  { url: "/it/signup", locale: "it", file: join("it", "signup.html"), expect: "Inizia a tracciare gratis", lang: "it" },
];

if (!existsSync(outDir)) {
  console.error(`::error::${outDir} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

let failures = 0;
let checked = 0;

for (const { url, file, expect, lang } of PAGES) {
  const path = join(outDir, file);
  const label = url;

  if (!existsSync(path)) {
    console.error(`::error::${label}: no prerendered HTML at ${relative(process.cwd(), path)}`);
    failures += 1;
    continue;
  }

  const html = readFileSync(path, "utf8");
  checked += 1;

  if (html.includes(MARKER)) {
    console.error(
      `::error::${label}: contains ${MARKER}. A statically prerendered page is ` +
        "falling back to client-side rendering. Remove the " +
        "useSearchParams()/usePathname() call, or wrap the component in a " +
        "Suspense boundary and accept the fallback.",
    );
    failures += 1;
    continue;
  }

  if (!html.includes(expect)) {
    console.error(
      `::error::${label}: expected copy "${expect}" is missing from the ` +
        "prerendered HTML. The page may be rendering an error boundary.",
    );
    failures += 1;
    continue;
  }

  // <html lang> must reflect the active locale, not the default.
  if (!html.includes(`<html lang="${lang}"`)) {
    console.error(`::error::${label}: <html lang="${lang}"> is missing.`);
    failures += 1;
    continue;
  }

  // hreflang alternates for both locales on every localisable page. The
  // attribute serialises as `hrefLang` — HTML attribute names are
  // case-insensitive, so match it that way rather than case-sensitively.
  const hasAlternates = /hreflang="en"/i.test(html) && /hreflang="it"/i.test(html);
  if (!hasAlternates) {
    console.error(`::error::${label}: hreflang alternates for en/it are missing.`);
    failures += 1;
    continue;
  }

  // The switcher must be present on every page.
  if (!html.includes(">EN<") || !html.includes(">IT<")) {
    console.error(`::error::${label}: language switcher (EN | IT) is missing.`);
    failures += 1;
    continue;
  }

  console.log(
    `  ✅ ${label.padEnd(12)} ${String(html.length).padStart(7)} B  lang=${lang}  hreflang  no bailout`,
  );
}

if (checked === 0) {
  console.error("::error::No pages were checked.");
  process.exit(1);
}

if (failures > 0) {
  console.error(`\n::error::${failures} page(s) failed the bailout check.`);
  process.exit(1);
}

console.log(`\n${checked} prerendered page(s) are fully server-rendered.`);
