import { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * The application database (node-postgres).
 *
 * Deliberately not the driver-generic
 * `PgDatabase<PgQueryResultHKT, Record<string, never>>` [CORE-10]: with the
 * generic result HKT every `execute()` / `update()` result becomes `unknown`
 * and drizzle's `migrate()` from `drizzle-orm/node-postgres` no longer
 * accepts the handle, which breaks consumers (both templates' DbManager,
 * Migrate and ProvisionRoles). Tests on PGlite convert once in their helper.
 */
export type TDb = NodePgDatabase;
