/**
 * Proves that swapping the Prisma transport to libSQL does not change the
 * storage format of `DateTime`, and therefore does not change any number the
 * dashboard reports.
 *
 * The aggregation in `lib/stats.ts` depends on Prisma storing `DateTime` in
 * SQLite as INTEGER epoch-milliseconds, because that is what makes
 * `strftime(createdAt / 1000, 'unixepoch')` work. If the driver adapter
 * serialised dates as ISO text instead, every bucket would come back NULL and
 * the traffic chart would silently render empty — the same failure class as the
 * two bugs already documented in the README.
 *
 * libSQL can open an ordinary SQLite file via a `file:` URL, so this runs the
 * real adapter against the real seeded database and diffs the results against
 * the classic engine. No Turso account and no network required.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SITE = "bm_acme_8f2k1";

/** Mirrors BUCKET_SQL in lib/stats.ts — the formats under test. */
const BUCKET_SQL: Record<string, string> = {
  hourly: "%Y-%m-%dT%H:00",
  daily: "%Y-%m-%d",
};

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ""}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`);
  }
};

type Row = Record<string, unknown>;

/** The series query exactly as getStats runs it, for one range shape. */
function seriesQuery(
  prisma: PrismaClient,
  format: string,
  fromMs: number,
  toMs: number,
) {
  return prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT
      strftime('${Prisma.raw(format)}', createdAt / 1000, 'unixepoch') AS bucket,
      COUNT(DISTINCT visitorId) AS visitors,
      COUNT(*) AS events,
      SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) AS pageviews
    FROM Event
    WHERE siteId = ${SITE} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);
}

/** The totals query exactly as getStats runs it. */
function totalsQuery(prisma: PrismaClient, fromMs: number, toMs: number) {
  return prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT
      COUNT(DISTINCT visitorId) AS visitors,
      COUNT(*) AS events,
      SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) AS pageviews,
      AVG(CASE WHEN duration IS NOT NULL AND duration > 0 THEN duration END) AS avgDuration
    FROM Event
    WHERE siteId = ${SITE} AND createdAt >= ${fromMs} AND createdAt < ${toMs}
  `);
}

const normalise = (rows: Row[]) =>
  rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        typeof v === "bigint" ? v.toString() : v === null ? null : String(v),
      ]),
    ),
  );

async function main() {
  const source = join(process.cwd(), "prisma", "dev.db");
  if (!existsSync(source)) {
    console.error("prisma/dev.db not found. Run `pnpm db:seed` first.");
    process.exit(1);
  }

  // Work on a copy so the real dev database is never touched.
  const dir = mkdtempSync(join(tmpdir(), "bm-libsql-"));
  const copy = join(dir, "probe.db");
  copyFileSync(source, copy);

  console.log("\n=== libSQL driver adapter vs classic SQLite engine ===\n");

  // Both clients MUST point at the same file. `new PrismaClient()` without an
  // explicit `datasourceUrl` silently falls back to DATABASE_URL — the real
  // dev.db — which would compare two separate databases and make every parity
  // assertion pass vacuously.
  const engine = new PrismaClient({ datasourceUrl: `file:${copy}` });
  const adapted = new PrismaClient({
    adapter: new PrismaLibSQL(
      { url: `file:${copy}` },
      // Must mirror lib/prisma.ts exactly. The default is ISO-8601 TEXT, which
      // SQLite sorts above every INTEGER and which breaks the dashboard's
      // window filter and every strftime() bucket.
      { timestampFormat: "unixepoch-ms" },
    ),
  });

  const now = Date.now();
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  try {
    // --- 1. WRITE format: the one that silently breaks production ----------
    // A row inserted through the adapter must be storable exactly like a row
    // inserted through the engine, or it is invisible to every aggregate query.
    const probeSite = "bm_turso_probe";
    await engine.$executeRawUnsafe(
      `INSERT OR IGNORE INTO User (id, email, password, plan, createdAt, updatedAt)
       VALUES ('bm_probe_user', 'bm_probe@local.test', 'x', 'hobby', ${now}, ${now})`,
    );
    await engine.site.upsert({
      where: { publicId: probeSite },
      create: {
        publicId: probeSite,
        name: "probe",
        domain: "probe.test",
        userId: "bm_probe_user",
      },
      update: {},
    });

    await engine.event.create({
      data: { siteId: probeSite, path: "/probe", visitorId: "v_engine" },
    });
    await adapted.event.create({
      data: { siteId: probeSite, path: "/probe", visitorId: "v_adapter" },
    });

    const written = await engine.$queryRaw<Row[]>(Prisma.sql`
      SELECT visitorId AS writer, typeof(createdAt) AS t,
             CAST(createdAt AS TEXT) AS asText
      FROM Event WHERE siteId = ${probeSite} ORDER BY writer ASC
    `);

    for (const row of written) {
      check(
        `write via ${String(row.writer)} stores DateTime as integer`,
        row.t === "integer" && /^\d{13}$/.test(String(row.asText)),
        `typeof=${String(row.t)} value=${String(row.asText)}`,
      );
    }

    const engineRow = written.find((r) => r.writer === "v_engine");
    const adapterRow = written.find((r) => r.writer === "v_adapter");
    check(
      "both transports use the identical storage format",
      engineRow?.t === adapterRow?.t,
      `engine=${String(engineRow?.t)} adapter=${String(adapterRow?.t)}`,
    );

    // The failure mode this guards: a row that exists but is excluded by the
    // dashboard's upper-bound filter, because TEXT > INTEGER in SQLite.
    const bounds = await engine.$queryRaw<Row[]>(Prisma.sql`
      SELECT visitorId AS writer,
             createdAt >= ${now - HOUR} AS aboveLower,
             createdAt <  ${now + HOUR} AS belowUpper
      FROM Event WHERE siteId = ${probeSite} ORDER BY writer ASC
    `);
    for (const row of bounds) {
      // The adapter surfaces raw integer expressions as BigInt, so compare
      // numerically rather than with `===`. lib/stats.ts coerces the same way.
      const above = Number(row.aboveLower);
      const below = Number(row.belowUpper);
      check(
        `row via ${String(row.writer)} falls inside the dashboard window`,
        above === 1 && below === 1,
        `>= lower: ${String(row.aboveLower)}, < upper: ${String(row.belowUpper)}`,
      );
    }

    // --- 2. read format ---------------------------------------------------
    const [raw] = await adapted.$queryRawUnsafe<Row[]>(
      `SELECT typeof(createdAt) AS t, CAST(createdAt AS TEXT) AS asText FROM Event WHERE siteId = '${SITE}' LIMIT 1;`,
    );

    check(
      "DateTime stored as integer through adapter",
      raw?.t === "integer",
      `typeof(createdAt) = ${String(raw?.t)}`,
    );
    check(
      "value is epoch milliseconds (13 digits)",
      /^\d{13}$/.test(String(raw?.asText ?? "")),
      `CAST(createdAt AS TEXT) = ${String(raw?.asText)}`,
    );

    // --- 3. the exact strftime forms the app depends on -------------------
    const [bucket] = await adapted.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        strftime('${Prisma.raw(BUCKET_SQL.daily)}', createdAt / 1000, 'unixepoch') AS day,
        COUNT(DISTINCT visitorId) AS visitors
      FROM Event
      WHERE siteId = ${SITE}
      GROUP BY day
      ORDER BY day DESC
      LIMIT 1
    `);
    check(
      "strftime(/1000, 'unixepoch') returns a real bucket",
      typeof bucket?.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(bucket.day)),
      `day = ${String(bucket?.day)}, visitors = ${String(bucket?.visitors)}`,
    );

    const [naive] = await adapted.$queryRawUnsafe<Row[]>(
      `SELECT strftime('%Y-%m-%d', createdAt) AS day FROM Event WHERE siteId = '${SITE}' LIMIT 1;`,
    );
    check(
      "bare strftime(createdAt) is still NULL (the trap we avoid)",
      naive?.day === null || naive?.day === undefined,
      `strftime(createdAt) = ${String(naive?.day)}`,
    );

    // --- 4. integer column types survive the adapter ----------------------
    // The libSQL adapter returns raw integer expressions as BigInt. lib/stats.ts
    // normalises with `toNumber`, which handles bigint, number and null; this
    // asserts that contract still holds.
    const [countRow] = await adapted.$queryRaw<Row[]>(Prisma.sql`
      SELECT COUNT(*) AS total FROM Event WHERE siteId = ${SITE}
    `);
    const total = countRow?.total;
    check(
      "COUNT is a number or bigint, never a string",
      typeof total === "number" || typeof total === "bigint",
      `typeof(COUNT(*)) = ${typeof total}`,
    );
    check("COUNT coerces to a finite number", Number.isFinite(Number(total)));

    // --- 5. city is never collected ---------------------------------------
    // The `city` column exists on Event for a future opt-in feature, but the
    // collector must never populate it. Assert at the storage layer so a
    // regression anywhere in the write path is caught, not just in the API
    // response.
    const [cityRow] = await engine.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN city IS NOT NULL AND city != '' THEN 1 ELSE 0 END) AS populated
      FROM Event
    `);
    const cityTotal = Number(cityRow?.total ?? 0);
    const cityPopulated = Number(cityRow?.populated ?? 0);
    check(
      "no Event row has a city value",
      cityPopulated === 0,
      `${cityPopulated} populated of ${cityTotal}`,
    );
    check("the table actually has rows to assert over", cityTotal > 0, `${cityTotal} events`);

    const sample = await engine.$queryRaw<Row[]>(Prisma.sql`
      SELECT visitorId AS writer, city
      FROM Event WHERE siteId = ${probeSite} ORDER BY writer ASC
    `);
    for (const row of sample) {
      check(
        `row via ${String(row.writer)} wrote no city`,
        row.city === null || row.city === undefined,
        `city = ${String(row.city)}`,
      );
    }

    // --- 6. every range shape returns byte-identical data ------------------
    console.log("\n  query parity (adapter vs classic engine):\n");

    const windows: Array<{ label: string; format: string; from: number; to: number }> = [
      {
        label: "24h (hourly buckets)",
        format: BUCKET_SQL.hourly,
        from: Math.floor(now / HOUR) * HOUR - 23 * HOUR,
        to: Math.floor(now / HOUR) * HOUR + HOUR,
      },
      {
        label: "7d  (daily buckets)",
        format: BUCKET_SQL.daily,
        from: Math.floor(now / DAY) * DAY - 6 * DAY,
        to: Math.floor(now / DAY) * DAY + DAY,
      },
      {
        label: "30d (daily buckets)",
        format: BUCKET_SQL.daily,
        from: Math.floor(now / DAY) * DAY - 29 * DAY,
        to: Math.floor(now / DAY) * DAY + DAY,
      },
    ];

    for (const w of windows) {
      const [aSeries, eSeries, aTotals, eTotals] = await Promise.all([
        seriesQuery(adapted, w.format, w.from, w.to),
        seriesQuery(engine, w.format, w.from, w.to),
        totalsQuery(adapted, w.from, w.to),
        totalsQuery(engine, w.from, w.to),
      ]);

      const seriesMatch =
        JSON.stringify(normalise(aSeries)) === JSON.stringify(normalise(eSeries));
      const totalsMatch =
        JSON.stringify(normalise(aTotals)) === JSON.stringify(normalise(eTotals));
      const populated = aSeries.filter((r) => Number(r.events) > 0).length;

      check(
        `${w.label}: series identical`,
        seriesMatch,
        `${aSeries.length} buckets, ${populated} populated`,
      );
      check(`${w.label}: totals identical`, totalsMatch);
      check(
        `${w.label}: buckets joined to real data`,
        populated > 0,
        `visitors = ${String(aTotals[0]?.visitors ?? 0)}`,
      );
    }
  } finally {
    await engine.$disconnect();
    await adapted.$disconnect();
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // A locked temp file on Windows is not a test failure.
    }
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
