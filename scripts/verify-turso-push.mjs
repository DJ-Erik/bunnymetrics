/**
 * Integration test for `scripts/turso-push.mjs`.
 *
 * The script's job is to render the Prisma schema as DDL and apply it to Turso
 * over the Hrana `/v2/pipeline` HTTP protocol. That code path cannot be
 * exercised without a Turso account, so this stands up a local server that
 * implements the same protocol against a real SQLite file, then drives the
 * script against it.
 *
 * The shim is deliberately faithful to the wire format rather than shaped to
 * whatever the script happens to read — it encodes rows as
 * `[{ type, value }]` and reports `response.result.affected_row_count` exactly
 * as Turso does. A mismatch therefore surfaces as a test failure rather than
 * being papered over.
 */
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const TOKEN = "test-auth-token-value";
const TABLES = [
  "User", "Site", "Event", "Session", "Account",
  "ApiToken", "Subscriber", "VerificationToken",
];

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

const encode = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return { type: "integer", value: String(value) };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value: String(value) };
  }
  if (Buffer.isBuffer(value)) return { type: "blob", value: "0" };
  return { type: "text", value: String(value) };
};

function startShim(dbPath, { requireAuth = true, failOn = null } = {}) {
  const db = new DatabaseSync(dbPath);
  const seenAuth = [];

  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const auth = req.headers.authorization ?? null;
      seenAuth.push(auth);

      const json = (status, body) => {
        const text = JSON.stringify(body);
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(text),
        });
        res.end(text);
      };

      if (requireAuth && auth !== `Bearer ${TOKEN}`) {
        json(401, { error: "unauthorized" });
        return;
      }

      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        json(400, { error: "bad request" });
        return;
      }

      const results = [];
      for (const request of body?.requests ?? []) {
        if (request?.type !== "execute") {
          results.push({ type: "ok", response: { type: request?.type ?? "close" } });
          continue;
        }
        const sql = request?.stmt?.sql ?? "";
        if (failOn && sql.includes(failOn)) {
          results.push({
            type: "error",
            error: { message: `syntax error near "${failOn}"`, code: "SQLITE_ERROR" },
          });
          continue;
        }
        try {
          const stmt = db.prepare(sql);
          // node:sqlite exposes `columns()`, not `columnNames()`, and it
          // works even when the result set is empty.
          const cols = stmt.columns().map((c) => ({ name: c.name }));
          const rows = stmt.all().map((row) => Object.values(row).map(encode));
          const info = db.prepare("SELECT changes() AS c").get();
          results.push({
            type: "ok",
            response: {
              type: "execute",
              result: {
                cols,
                rows,
                affected_row_count: Number(info?.c ?? 0),
                last_insert_rowid: null,
                rows_read: rows.length,
                rows_written: rows.length,
                query_duration_ms: 0.1,
              },
            },
          });
        } catch (error) {
          results.push({
            type: "error",
            error: { message: error.message, code: "SQLITE_ERROR" },
          });
        }
      }

      json(200, { baton: null, base_url: null, results });
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        seenAuth,
        db,
        close: () => {
          server.close();
          try { db.close(); } catch { /* already closed */ }
        },
      });
    });
  });
}

/**
 * Must be async, NOT spawnSync: the shim server lives in this process, so
 * blocking the event loop would deadlock the child against its own parent.
 */
function runPush(url, token, dbFile) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/turso-push.mjs"], {
      env: {
        ...process.env,
        TURSO_DATABASE_URL: url,
        TURSO_AUTH_TOKEN: token,
        DATABASE_URL: `file:${dbFile}`,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function tableNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
}

async function main() {
  console.log("\n=== turso-push integration (local Hrana /v2/pipeline shim) ===\n");

  const dir = mkdtempSync(join(tmpdir(), "bm-turso-"));
  const target = join(dir, "target.db");

  let shim = await startShim(target);
  try {
    // --- 1. happy path ----------------------------------------------------
    const first = await runPush(shim.url, TOKEN, target);
    check("push exits 0", first.status === 0, `status ${first.status} ${first.stderr?.trim() ?? ""}`);
    check("push reports the masked target", /target|masked|http:\/\/127/.test(first.stdout ?? ""));

    const created = tableNames(shim.db);
    for (const table of TABLES) {
      check(`table ${table} created`, created.includes(table));
    }

    const indexes = shim.db
      .prepare("SELECT count(*) AS c FROM sqlite_master WHERE type='index' AND name LIKE 'sqlite_%'")
      .get();
    check("table shape looks right", created.length >= TABLES.length, `${created.length} tables`);

    // Columns Prisma expects, to prove the DDL was ours and not a stub.
    const eventCols = shim.db.prepare("PRAGMA table_info('Event')").all().map((r) => r.name);
    for (const col of ["createdAt", "siteId", "path", "visitorId", "country"]) {
      check(`Event.${col} exists`, eventCols.includes(col));
    }
    check("Event.city column retained but unused", eventCols.includes("city"));

    const authOk = shim.seenAuth.every((a) => a === `Bearer ${TOKEN}`);
    check("bearer token sent on every request", authOk, `${shim.seenAuth.length} requests`);

    // --- 2. idempotency ---------------------------------------------------
    const second = await runPush(shim.url, TOKEN, target);
    check("second push exits 0", second.status === 0, `status ${second.status}`);
    check("second push skips instead of failing", /already applied/i.test(second.stdout ?? ""), "");
    check("no duplicate tables after re-run", tableNames(shim.db).length === created.length);
  } finally {
    shim.close();
  }

  // --- 3. auth failure ---------------------------------------------------
  const target3 = join(dir, "t3.db");
  shim = await startShim(target3);
  try {
    const bad = await runPush(shim.url, "wrong-token", target3);
    check("wrong token fails loudly", bad.status !== 0, `status ${bad.status}`);
    check(
      "auth failure surfaces the server message",
      /unauthorized/i.test(`${bad.stdout}${bad.stderr}`),
      "",
    );
  } finally {
    shim.close();
  }

  // --- 4. SQL error path -------------------------------------------------
  const target4 = join(dir, "t4.db");
  shim = await startShim(target4, { failOn: "CREATE INDEX" });
  try {
    const broken = await runPush(shim.url, TOKEN, target4);
    check("SQL error fails loudly", broken.status !== 0, `status ${broken.status}`);
    check(
      "SQL error message is propagated",
      /syntax error/i.test(`${broken.stdout}${broken.stderr}`),
      "",
    );
  } finally {
    shim.close();
  }

  // --- 5. missing env ----------------------------------------------------
  const noEnv = await new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/turso-push.mjs"], {
      env: { ...process.env, TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "" },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (status) => resolve({ status, stdout: out }));
  });
  check("missing TURSO_DATABASE_URL exits non-zero", noEnv.status !== 0, `status ${noEnv.status}`);

  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* locked on Windows */
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
