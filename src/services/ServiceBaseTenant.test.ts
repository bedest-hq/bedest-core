import { describe, it, expect, beforeAll } from "bun:test";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { baseColumns } from "../schemas/SBase";
import { ServiceBaseTenant } from "./ServiceBaseTenant";
import { createTestDb, thrown } from "../test-support/TestDb";
import type { ITenantApp, ITenantUserApp } from "../interfaces/IContextApp";
import type { TDb } from "../types/TDb";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const SNote = pgTable("notes", {
  ...baseColumns,
  tenantId: uuid().notNull(),
  title: varchar({ length: 50 }).notNull(),
});

class ServiceNote extends ServiceBaseTenant<typeof SNote> {
  constructor() {
    super(SNote);
  }
}
const service = new ServiceNote();

let db: TDb;
let noteB = "";

beforeAll(async () => {
  // Deliberately WITHOUT row-level security: the application filter alone
  // must keep tenants apart (defense in depth) [CORE-02].
  ({ db } = await createTestDb(`
    CREATE TABLE notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "isDeleted" boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "deletedAt" timestamptz,
      "tenantId" uuid NOT NULL,
      title varchar(50) NOT NULL
    );
  `));
  await service.create({ db, nowDatetime: new Date(), tenantId: A }, { title: "a" });
  noteB = (
    await service.create({ db, nowDatetime: new Date(), tenantId: B }, { title: "b" })
  ).id;
});

const tenantA = (): ITenantApp => ({ db, nowDatetime: new Date(), tenantId: A });
const superUser = (): ITenantUserApp => ({
  ...tenantA(),
  session: { userId: A, sessionId: A, role: "SYSTEM", isSuperUser: true },
});

describe("ServiceBaseTenant tenant filter", () => {
  it("[CORE-02] tenant A cannot list, read, update or delete tenant B rows without RLS", async () => {
    const list = await service.getAll(tenantA(), { limit: 10, page: 1 }, { title: SNote.title });
    expect(list.data).toEqual([{ title: "a" }]);
    expect(list.meta.total).toBe(1);

    expect(await thrown(() => service.getById(tenantA(), noteB, { title: SNote.title }))).toMatchObject({ code: 404 });
    expect(await thrown(() => service.update(tenantA(), noteB, { title: "x" }))).toMatchObject({ code: 404 });
    expect(await thrown(() => service.remove(tenantA(), noteB))).toMatchObject({ code: 404 });
  });

  it("[CORE-02] a super user is not restricted to its own tenant", async () => {
    const list = await service.getAll(superUser(), { limit: 10, page: 1 }, { title: SNote.title });
    expect(list.meta.total).toBe(2);
    expect((await service.getById(superUser(), noteB, { title: SNote.title })).title).toBe("b");
  });
});
