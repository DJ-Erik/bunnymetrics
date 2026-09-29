/**
 * Fails if any statically prerendered page falls back to client-side rendering.
 *
 * When a statically rendered route renders a client component that calls
 * `useSearchParams` / `usePathname` (or fetches) without a Suspense boundary,
 * Next.js bails that subtree out to the client and writes a
 * `BAILOUT_TO_CLIENT_SIDE_RENDERING` marker into the HTML. The result is a
 * blank first paint and content that search engines may not see, while the
 * build still reports success — which is exactly how this shipped once.
 *
 * Runs against the artifacts in `.next/server/app`, so no server is needed.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const MARKER = "BAILOUT_TO_CLIENT_SIDE_RENDERING";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", ".next", "server", "app");

/** Pages that must be fully prerendered, with a marker of real content so an
 *  empty or errored render cannot pass vacuously. */
const PAGES = [
  { file: "index.html", expect: "Analytics that respects" },
  { file: "login.html", expect: "Welcome back" },
  { file: "signup.html", expect: "Start tracking free" },
];

if (!existsSync(outDir)) {
  console.error(`::error::${outDir} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

let failures = 0;
let checked = 0;

for (const { file, expect } of PAGES) {
  const path = join(outDir, file);
  const label = `/${file.replace(".html", "")}`;

  if (!existsSync(path)) {
    console.error(`::error::${label}: no prerendered HTML at ${relative(process.cwd(), path)}`);
    failures += 1;
    continue;
  }

  const html = readFileSync(path, "utf8");
  checked += 1;

  if (html.includes(MARKER)) {
    console.error(
      `::error::${label}: contains ${MARKER}. ` +
        "A statically prerendered page is falling back to client-side " +
        "rendering. Remove the useSearchParams()/usePathname() call, or wrap " +
        "the component in a Suspense boundary and accept the fallback.",
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

  console.log(`  ✅ ${label.padEnd(9)} ${String(html.length).padStart(7)} B  no bailout`);
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
