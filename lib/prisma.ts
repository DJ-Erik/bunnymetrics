import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * Prisma client singleton.
 *
 * Two transports, one client:
 *
 * - **Turso / libSQL (production preview).** When `TURSO_DATABASE_URL` is set,
 *   queries go through the libSQL driver adapter over HTTP. Turso speaks the
 *   SQLite dialect, so every query in `lib/stats.ts` — including
 *   `strftime(createdAt / 1000, 'unixepoch')` and the `BUCKET_SQL` map — is
 *   unchanged. Verified against a real libSQL file by
 *   `scripts/verify-libsql-adapter.ts`.
 *
 * - **Plain SQLite (local dev and CI).** With `TURSO_DATABASE_URL` absent the
 *   classic driver engine is used against `DATABASE_URL`, so the existing
 *   `db:push` / `db:seed` / `verify.sh` flow is untouched.
 *
 * Vercel serverless functions are stateless, so nothing is cached across
 * invocations in production; the global cache below is for dev hot-reload only.
 */

const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

const LOG = (
  process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
) as ("warn" | "error")[];

function createPrismaClient(): PrismaClient {
  if (tursoUrl) {
    // The adapter owns the libSQL client: passing a pre-built client also
    // requires `datasourceUrl`, and omitting it makes the adapter try to create
    // a second client from `undefined`.
    return new PrismaClient({
      adapter: new PrismaLibSQL(
        {
          url: tursoUrl,
          // Omitted for a local libSQL file, which needs no token.
          ...(tursoToken ? { authToken: tursoToken } : {}),
        },
        // CRITICAL, and placement-sensitive.
        //
        // Without this option the adapter writes `DateTime` as ISO-8601 TEXT
        // ("2026-09-29T14:20:45.811+00:00") while the classic engine writes
        // INTEGER epoch-milliseconds (1790691623861). SQLite orders all TEXT
        // above every INTEGER, so every adapter-written row fails the
        // dashboard's `createdAt < <ms>` upper bound and every `strftime()`
        // bucket returns NULL. The symptom is a dashboard that still renders
        // pre-seeded traffic while collecting nothing new — silently, and only
        // in the production transport. See bug 5 in the README.
        //
        // It MUST be the second argument. Placing `timestampFormat` inside the
        // config object — which reads naturally and type-checks only with a
        // cast — is silently ignored, because the config is forwarded verbatim
        // to `createClient()`, which does not know the option. Measured on
        // @prisma/adapter-libsql 6.19.3:
        //
        //   inside config object -> typeof(createdAt) = text     (NOT honoured)
        //   second argument       -> typeof(createdAt) = integer  (honoured)
        //   omitted               -> typeof(createdAt) = text     (the bug)
        { timestampFormat: "unixepoch-ms" },
      ),
      log: LOG,
    });
  }

  return new PrismaClient({ log: LOG });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** True when this process is talking to Turso rather than a local SQLite file. */
export const usingTurso = Boolean(tursoUrl);

export default prisma;
