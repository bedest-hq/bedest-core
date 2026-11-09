import { getTableColumns, sql } from "drizzle-orm";
import { index, PgColumn, pgPolicy, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * `<isDeleted> = false` for the table the column belongs to. The column is
 * referenced (not its name hard-coded), so drizzle applies the configured
 * casing, e.g. "is_deleted" with casing: "snake_case" [CORE-03].
 */
const activeOnly = (column: PgColumn) => {
  const isDeleted = getTableColumns(column.table).isDeleted;
  if (!isDeleted) {
    throw new Error(
      `UtilDbSchema: table of column "${column.name}" has no isDeleted column (use baseColumns).`,
    );
  }
  return sql`${isDeleted} = false`;
};

export class UtilDbSchema {
  static tenantIsolationPolicy(tenantColumn: PgColumn) {
    return pgPolicy("tenant_isolation", {
      as: "permissive",
      for: "all",
      using: sql`
      current_setting('app.bypass_rls', true) = 'on'
      OR
      ${tenantColumn} = nullif(current_setting('app.current_tenant', true), '')::uuid
    `,
    });
  }

  /** Index over active (not soft-deleted) rows only. */
  static activeIndex(
    indexName: string,
    column: PgColumn,
    ...extraColumns: PgColumn[]
  ) {
    return index(indexName)
      .on(column, ...extraColumns)
      .where(activeOnly(column));
  }

  /** Unique index over active (not soft-deleted) rows only. */
  static activeUniqueIndex(
    indexName: string,
    column: PgColumn,
    ...extraColumns: PgColumn[]
  ) {
    return uniqueIndex(indexName)
      .on(column, ...extraColumns)
      .where(activeOnly(column));
  }
}
