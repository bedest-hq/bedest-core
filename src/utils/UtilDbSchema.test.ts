import { describe, it, expect } from "bun:test";
import { pgTable, uuid, varchar, PgDialect, getTableConfig } from "drizzle-orm/pg-core";
import { baseColumns } from "../schemas/SBase";
import { UtilDbSchema } from "./UtilDbSchema";

const STable = pgTable(
  "items",
  {
    ...baseColumns,
    tenantId: uuid().notNull(),
    email: varchar({ length: 255 }).notNull(),
  },
  (t) => [
    UtilDbSchema.activeIndex("idx_items_active", t.id),
    UtilDbSchema.activeUniqueIndex("idx_items_email", t.email),
    UtilDbSchema.tenantIsolationPolicy(t.tenantId),
  ],
);

const whereSql = (dialect: PgDialect, name: string) => {
  const index = getTableConfig(STable).indexes.find((i) => i.config.name === name);
  const where = index?.config.where;
  return where ? dialect.sqlToQuery(where).sql : "";
};

describe("UtilDbSchema", () => {
  it("[CORE-03] partial indexes reference the isDeleted column and honour casing: snake_case", () => {
    const snake = new PgDialect({ casing: "snake_case" });
    for (const name of ["idx_items_active", "idx_items_email"]) {
      const sql = whereSql(snake, name);
      expect(sql).toContain('"is_deleted" = false');
      expect(sql).not.toContain("isDeleted");
    }
  });

  it("[CORE-03] without casing the column keeps its camelCase name", () => {
    expect(whereSql(new PgDialect(), "idx_items_active")).toContain('"isDeleted" = false');
  });

  it("unique flag and the tenant isolation policy", () => {
    const config = getTableConfig(STable);
    expect(config.indexes.find((i) => i.config.name === "idx_items_email")?.config.unique).toBe(true);
    const policy = config.policies[0];
    expect(policy?.name).toBe("tenant_isolation");
    const using = policy?.using ? new PgDialect().sqlToQuery(policy.using).sql : "";
    expect(using).toContain("current_setting('app.bypass_rls', true) = 'on'");
    expect(using).toContain('"tenantId"');
  });
});
