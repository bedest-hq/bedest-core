import { describe, it, expect, beforeAll } from "bun:test";
import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { UtilTenantScope, type TDbOrTx } from "./UtilTenantScope";
import { createTestDb, thrown } from "../test-support/TestDb";
import type { ITenantApp, ITenantUserApp } from "../interfaces/IContextApp";
import type { TDb } from "../types/TDb";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const SDoc = pgTable("docs", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid().notNull(),
  title: varchar({ length: 50 }).notNull(),
});

let db: TDb;

beforeAll(async () => {
  // Same predicate as UtilDbSchema.tenantIsolationPolicy, FORCE'd, and the
  // suite runs as a non-owner, non-superuser role so the policy applies.
  let client;
  ({ db, client } = await createTestDb(`
    CREATE TABLE docs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId" uuid NOT NULL,
      title varchar(50) NOT NULL
    );
    INSERT INTO docs ("tenantId", title) VALUES
      ('${A}', 'a1'), ('${A}', 'a2'), ('${B}', 'b1');
    ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE docs FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation ON docs AS PERMISSIVE FOR ALL USING (
      current_setting('app.bypass_rls', true) = 'on'
      OR "tenantId" = nullif(current_setting('app.current_tenant', true), '')::uuid
    );
    CREATE ROLE scope_app NOLOGIN;
    GRANT SELECT, INSERT, UPDATE, DELETE ON docs TO scope_app;
  `));
  await client.exec("SET ROLE scope_app");
});

const tenantApp = (tenantId: string): ITenantApp => ({
  db,
  nowDatetime: new Date(),
  tenantId,
});

const userApp = (tenantId: string, isSuperUser: boolean): ITenantUserApp => ({
  ...tenantApp(tenantId),
  session: { userId: "u", sessionId: "s", role: "USER", isSuperUser },
});

const settings = async (tx: TDbOrTx) => {
  const res = await tx.execute<{ tenant: string | null; bypass: string | null }>(
    sql`SELECT current_setting('app.current_tenant', true) AS tenant,
               current_setting('app.bypass_rls', true) AS bypass`,
  );
  return res.rows[0];
};

const titles = async (tx: TDbOrTx) =>
  (await tx.select({ title: SDoc.title }).from(SDoc)).map((r) => r.title).sort();

describe("UtilTenantScope.tenantScope", () => {
  it("sets the tenant and bypass off for a tenant context", async () => {
    const s = await UtilTenantScope.tenantScope(tenantApp(A), settings);
    expect(s).toEqual({ tenant: A, bypass: "off" });
  });

  it("a regular user sees only its tenant's rows", async () => {
    expect(await UtilTenantScope.tenantScope(userApp(A, false), titles)).toEqual(["a1", "a2"]);
    expect(await UtilTenantScope.tenantScope(userApp(B, false), titles)).toEqual(["b1"]);
  });

  it("a super user session turns the bypass flag on and sees every tenant", async () => {
    expect(await UtilTenantScope.tenantScope(userApp(A, true), settings)).toEqual({
      tenant: A,
      bypass: "on",
    });
    expect(await UtilTenantScope.tenantScope(userApp(A, true), titles)).toEqual([
      "a1",
      "a2",
      "b1",
    ]);
  });

  it("an empty tenant id matches no row (nullif → NULL)", async () => {
    expect(await UtilTenantScope.tenantScope(tenantApp(""), titles)).toEqual([]);
  });

  it("the policy also checks writes: a row for another tenant is refused", async () => {
    const err = await thrown(() =>
      UtilTenantScope.tenantScope(tenantApp(A), (tx) =>
        tx.insert(SDoc).values({ tenantId: B, title: "intruder" }),
      ),
    );
    expect(err).toBeInstanceOf(Error);
    expect(await UtilTenantScope.tenantScope(userApp(A, true), titles)).not.toContain("intruder");
  });

  it("settings are transaction-local and gone after the scope", async () => {
    await UtilTenantScope.tenantScope(userApp(A, true), titles);
    const after = await settings(db);
    expect(after.bypass ?? "").not.toBe("on");
    expect(after.tenant ?? "").toBe("");
    expect(await titles(db)).toEqual([]);
  });

  it("a failing callback rolls the transaction back", async () => {
    const err = await thrown(() =>
      UtilTenantScope.tenantScope(tenantApp(A), async (tx) => {
        await tx.insert(SDoc).values({ tenantId: A, title: "rolled-back" });
        throw new Error("boom");
      }),
    );
    expect(err).toBeInstanceOf(Error);
    expect(await UtilTenantScope.tenantScope(tenantApp(A), titles)).not.toContain("rolled-back");
  });
});

describe("UtilTenantScope.systemScope", () => {
  it("turns the bypass flag on without a tenant and sees every row", async () => {
    expect(await UtilTenantScope.systemScope(db, settings)).toMatchObject({ bypass: "on" });
    expect(await UtilTenantScope.systemScope(db, titles)).toEqual(["a1", "a2", "b1"]);
  });

  it("the bypass does not leak to later statements", async () => {
    await UtilTenantScope.systemScope(db, titles);
    expect(await titles(db)).toEqual([]);
  });
});
