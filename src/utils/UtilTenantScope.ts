import { ExtractTablesWithRelations, sql } from "drizzle-orm";
import { ITenantApp, ITenantUserApp } from "../interfaces/IContextApp";
import { type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { PgTransaction } from "drizzle-orm/pg-core";
import { TDb } from "../types/TDb";

/** A transaction opened on a `TDb`. */
export type TTx = PgTransaction<
  NodePgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

/** Either a database handle or an open transaction [CORE-10]. */
export type TDbOrTx = TDb | TTx;

export class UtilTenantScope {
  static async tenantScope<T>(
    c: ITenantApp | ITenantUserApp,
    callback: (tx: TTx) => Promise<T>,
  ): Promise<T> {
    return await c.db.transaction(async (tx) => {
      const currentTenant = c.tenantId || "";
      const isSystem =
        "session" in c && (c as ITenantUserApp).session.isSuperUser === true;
      const bypassRls = isSystem ? "on" : "off";
      await tx.execute(
        sql`SELECT set_config('app.current_tenant', ${currentTenant}, true), set_config('app.bypass_rls', ${bypassRls}, true)`,
      );
      return callback(tx);
    });
  }

  static async systemScope<T>(
    db: TDb,
    callback: (tx: TTx) => Promise<T>,
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.bypass_rls', 'on', true)`);
      return callback(tx);
    });
  }
}
