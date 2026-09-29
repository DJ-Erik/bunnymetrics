/**
 * Fails if any source file starts with a UTF-8 byte order mark.
 *
 * Editors and PowerShell's `Set-Content -Encoding UTF8` add a BOM silently.
 * Most tools tolerate it, but Prisma's schema parser does not: a BOM before
 * the first `//` comment makes `prisma generate` fail with
 *   P1012: This line is invalid. It does not start with any known Prisma
 *   schema keyword
 * with an error that points at line 1, column 1 — nowhere near the cause.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".verify-adapter",
  "prisma", // contains the .db files
]);
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".prisma",
  ".css", ".yml", ".yaml", ".sh", ".txt", ".env", ".example", ".gitignore",
  ".gitattributes", ".npmrc",
]);

const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry === ".env" || entry.endsWith(".db")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (!TEXT_EXT.has(extname(entry))) continue;

    const bytes = readFileSync(full);
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      offenders.push(relative(ROOT, full).replace(/\\/g, "/"));
    }
  }
}

walk(ROOT);

if (offenders.length > 0) {
  for (const file of offenders) {
    console.error(`::error::${file}: has a UTF-8 BOM`);
  }
  console.error(
    `\nRemove the BOM. In PowerShell use ` +
      `[System.IO.File]::WriteAllText($p, $c, (New-Object System.Text.UTF8Encoding($false))) ` +
      `rather than Set-Content -Encoding UTF8.`,
  );
  process.exit(1);
}

console.log("  no BOMs in source files");
