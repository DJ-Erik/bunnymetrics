/**
 * Applies the Prisma schema to Turso over its HTTPS API.
 *
 * The Prisma CLI cannot open a libSQL/HTTP connection, so `db push` and
 * `migrate deploy` only work against a local SQLite file. This script bridges
 * that gap: it asks the Prisma CLI to render the DDL for our schema, then
 * executes it against Turso's `/v2/pipeline` endpoint in a single transaction.
 *
 *   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… node scripts/turso-push.mjs
 *
 * Safe to re-run: it inspects `sqlite_master` first and exits cleanly if the
 * tables are already present, rather than failing on `table already exists`.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);

const url = process.env.TURSO_DATABASE_URL?.trim();
const token = process.env.TURSO_AUTH_TOKEN?.trim();
const dryRun = process.argv.includes("--dry-run");

/** Split rendered DDL into individual statements. */
function splitStatements(sql) {
  return sql
    .split(/;\s*\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/;\s*$/, ""));
}

if (dryRun) {
  // Render and report without touching the network, so the DDL and the
  // statement splitter can be reviewed before any credential is involved.
  const sql = renderSchema();
  const statements = splitStatements(sql);
  console.log("Turso schema push (dry run — nothing was sent)\n");
  console.log(`  ${statements.length} statements\n`);
  for (const [i, stmt] of statements.entries()) {
    const firstLine = stmt.split("\n")[0].slice(0, 72);
    console.log(`  ${String(i + 1).padStart(2)}. ${firstLine}`);
  }
  const hasIndex = /CREATE (UNIQUE )?INDEX/i.test(sql);
  const hasTable = /CREATE TABLE/i.test(sql);
  console.log(`\n  contains CREATE TABLE: ${hasTable}`);
  console.log(`  contains CREATE INDEX:  ${hasIndex}`);
  if (!hasTable) {
    console.error("\n  ERROR: no CREATE TABLE in the rendered DDL.");
    process.exit(1);
  }
  process.exit(0);
}

if (!url) {
  console.error("TURSO_DATABASE_URL is not set. Nothing to do.");
  process.exit(1);
}

if (!token) {
  console.error(
    "TURSO_AUTH_TOKEN is not set. Create a token with:\n" +
      "  turso db tokens create <db-name>",
  );
  process.exit(1);
}

const httpUrl = url.replace(/^libsql:\/\//, "https://");

async function pipeline(statements) {
  const response = await fetch(httpUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests: statements }),
  });

  if (!response.ok) {
    throw new Error(
      `Turso pipeline failed: ${response.status} ${await response.text()}`,
    );
  }

  const body = await response.json();
  const results = body.results ?? [];

  for (const result of results) {
    if (result.type === "error") {
      throw new Error(`Turso error: ${result.error?.message ?? "unknown"}`);
    }
  }

  return results;
}

async function existingTables() {
  const [result] = await pipeline([
    {
      type: "execute",
      stmt: {
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('User','Site','Event','Session','Account','ApiToken','Subscriber','VerificationToken')",
      },
    },
  ]);

  const rows = result?.response?.result?.rows ?? [];
  return rows.map((row) => String(row[0]?.value ?? row[0]));
}

/**
 * Render the schema as DDL using the locally installed Prisma CLI.
 *
 * Invoked as `node node_modules/prisma/build/index.js` rather than through
 * `npx`, which is not spawnable from Node on Windows (it resolves to npx.cmd)
 * and would add a shell dependency on POSIX.
 */
function renderSchema() {
  return execFileSync(
    process.execPath,
    [
      require.resolve("prisma/build/index.js"),
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
}

async function main() {
  console.log("Turso schema push");
  console.log(`  target: ${url.replace(/\/\/[^@]*@/, "//***@")}`);

  const existing = await existingTables();
  if (existing.length > 0) {
    console.log(`  already applied (${existing.length} tables): ${existing.join(", ")}`);
    console.log("\nNothing to do. Drop the database with `turso db drop` to start over.");
    return;
  }

  const sql = renderSchema();
  if (!sql.trim()) {
    throw new Error("Prisma produced an empty schema diff.");
  }

  console.log(`  applying ${statements.length} statements`);

  const results = await pipeline(
    // libSQL's pipeline accepts one statement per request.
    splitStatements(sql).map((s) => ({ type: "execute", stmt: { sql: s } })),
  );
  const affected = results.reduce(
    (sum, r) => sum + Number(r?.response?.rows_affected ?? 0),
    0,
  );
  console.log(`  done (${affected} rows affected)`);

  const after = await existingTables();
  console.log(`  tables now present: ${after.join(", ") || "none"}`);
  if (after.length === 0) {
    throw new Error("Schema push reported success but no tables were created.");
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
