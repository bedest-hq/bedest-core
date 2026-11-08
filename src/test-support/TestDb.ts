import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import type { TDb } from "../types/TDb";

/**
 * Test-only: an in-memory Postgres typed as the library's `TDb`.
 *
 * Unavoidable cast: drizzle-orm 0.45 types `PgliteDatabase` and
 * `NodePgDatabase` (TDb) as unrelated classes (different query-result HKT
 * and `$client`) although they share the PgDatabase runtime (see CORE-10).
 */
const asTDb = (db: PgliteDatabase): TDb => db as unknown as TDb;

export const createTestDb = async (ddl: string) => {
  const client = new PGlite();
  await client.exec(ddl);
  const db = drizzle(client);
  return { client, db: asTDb(db), raw: db };
};

/** Runs `fn` and returns the thrown value (or "no-throw"). */
export const thrown = async (fn: () => Promise<unknown>): Promise<unknown> => {
  try {
    await fn();
    return "no-throw";
  } catch (err) {
    return err;
  }
};
