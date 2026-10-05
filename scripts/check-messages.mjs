/**
 * Cross-checks the message catalogues: every key must exist in every locale,
 * and every namespace used in the source must resolve.
 *
 * A missing key is not a build error in next-intl — it renders the key path
 * itself ("dashboard.stats.pageviews") and fails silently in production. This
 * catches a typo or a half-finished translation before it ships.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const LOCALES = ["en", "it"];
const catalogs = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(join(root, "messages", `${locale}.json`), "utf8")),
  ]),
);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if ([".ts", ".tsx"].includes(extname(entry.name))) yield full;
  }
}

const get = (catalog, path) =>
  path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), catalog);

function leaves(node, prefix = "", out = {}) {
  if (!node || typeof node !== "object") return out;
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") leaves(value, path, out);
    else out[path] = value;
  }
  return out;
}

let errors = 0;
const identical = [];

// ---- structural parity across locales ----
const flat = Object.fromEntries(LOCALES.map((l) => [l, leaves(catalogs[l])]));

for (const path of Object.keys(flat.en)) {
  for (const locale of LOCALES) {
    if (flat[locale][path] === undefined) {
      console.error(`::error::messages/${locale}.json: missing "${path}"`);
      errors += 1;
    }
  }
  for (const locale of LOCALES.slice(1)) {
    const en = flat.en[path];
    const other = flat[locale][path];
    if (other !== undefined && en === other && /[a-z]{3}/i.test(String(en))) {
      identical.push(`${path} = ${JSON.stringify(en)}`);
    }
  }
}
for (const path of Object.keys(flat.it)) {
  if (flat.en[path] === undefined) {
    console.error(`::error::messages/en.json: missing "${path}" (present only in it.json)`);
    errors += 1;
  }
}

// ---- every namespace referenced in source must exist ----
const NAMESPACE_RE = /(?:useTranslations|getTranslations)\(\s*\{?[^)]*?namespace:\s*"([^"]+)"|(?:useTranslations|getTranslations)\(\s*"([^"]+)"/g;
const namespaces = new Set();

for (const dir of ["app", "components", "lib"]) {
  for (const file of walk(join(root, dir))) {
    const source = readFileSync(file, "utf8");
    const rel = relative(root, file);
    for (const match of source.matchAll(NAMESPACE_RE)) {
      const ns = match[1] ?? match[2];
      if (!ns) continue;
      namespaces.add(ns);
      if (get(catalogs.en, ns) === undefined) {
        console.error(`::error::${rel}: namespace "${ns}" is not in messages/en.json`);
        errors += 1;
      }
    }
  }
}

// ---- unreferenced keys are a code smell, not a failure ----
const referenced = new Set();
for (const dir of ["app", "components"]) {
  for (const file of walk(join(root, dir))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\b([a-z]{1,3})\(\s*"([^"]+)"/g)) {
      referenced.add(match[2]);
    }
  }
}
const orphans = Object.keys(flat.en).filter(
  (path) => !referenced.has(path.split(".").pop()) && !path.endsWith(".name"),
);

if (identical.length > 0) {
  console.log(`\n  ${identical.length} value(s) identical across locales (brand names, formats):`);
  console.log(`    ${identical.slice(0, 12).join("\n    ")}`);
  if (identical.length > 12) console.log(`    … and ${identical.length - 12} more`);
}
if (orphans.length > 0) {
  console.log(`\n  ${orphans.length} catalogue key(s) with no obvious call site:`);
  console.log(`    ${orphans.slice(0, 15).join(", ")}`);
}

console.log(
  `\n${LOCALES.length} locales, ${Object.keys(flat.en).length} keys each, ` +
    `${namespaces.size} namespace(s), ${errors} error(s).`,
);
if (errors > 0) process.exit(1);
