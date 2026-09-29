/**
 * Enforces the tracking script budget.
 *
 * The 2kb claim is the product's central promise, so it is checked rather than
 * asserted in prose. `LIMIT_BYTES` is the raw, uncompressed size — the number a
 * reviewer gets from `wc -c public/tracking.js` — with gzip and brotli reported
 * for context.
 */
import { brotliCompressSync, gzipSync, constants } from "node:zlib";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const LIMIT_BYTES = 2048;

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "..", "public", "tracking.js");

let source;
try {
  source = readFileSync(file);
} catch {
  console.error(`::error::Could not read ${file}`);
  process.exit(1);
}

const raw = source.length;
const gzip = gzipSync(source, { level: 9 }).length;
const brotli = brotliCompressSync(source, {
  params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
}).length;

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

console.log("Tracking script budget");
console.log(`  raw    ${String(raw).padStart(5)} B  (${kb(raw)})`);
console.log(`  gzip   ${String(gzip).padStart(5)} B  (${kb(gzip)})`);
console.log(`  brotli ${String(brotli).padStart(5)} B  (${kb(brotli)})`);

// Cheap structural guard: a truncated or stubbed file would trivially "pass".
const text = source.toString("utf8");
for (const needle of ["/api/collect", "sendBeacon", "data-bm"]) {
  if (!text.includes(needle)) {
    console.error(`::error::tracking.js looks incomplete: missing "${needle}"`);
    process.exit(1);
  }
}

if (raw > LIMIT_BYTES) {
  const over = raw - LIMIT_BYTES;
  console.error(
    `::error::tracking.js is ${raw} B, ${over} B over the ${LIMIT_BYTES} B budget (${kb(raw)}).`,
  );
  process.exit(1);
}

console.log(`  budget ${LIMIT_BYTES} B — ${LIMIT_BYTES - raw} B to spare ✅`);
