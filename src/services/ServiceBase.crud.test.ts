import { describe, it, expect, beforeEach } from "bun:test";
import { pgTable, varchar } from "drizzle-orm/pg-core";
import { baseColumns } from "../schemas/SBase";
import { ServiceBase } from "./ServiceBase";
import { createTestDb, thrown } from "../test-support/TestDb";
import type { IApp } from "../interfaces/IContextApp";

const SItem = pgTable("items", { ...baseColumns, name: varchar({ length: 50 }).notNull() });

const DDL = `
  CREATE TABLE items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "isDeleted" boolean NOT NULL DEFAULT false,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    "deletedAt" timestamptz,
    name varchar(50) NOT NULL
  );
`;

class ServiceItem extends ServiceBase<typeof SItem> {
  constructor() {
    super(SItem);
  }
  columnNames() {
    return Object.keys(this.columns).sort();
  }
}
const service = new ServiceItem();

let c: IApp;
let tick = 0;
// Deterministic, strictly increasing creation times (ordering assertions).
const at = () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++));

beforeEach(async () => {
  const { db } = await createTestDb(DDL);
  c = { db, nowDatetime: at() };
});

const createNamed = async (name: string) => {
  c = { ...c, nowDatetime: at() };
  return service.create(c, { name });
};

const codeOf = (err: unknown) =>
  typeof err === "object" && err !== null && "code" in err ? err.code : err;

describe("ServiceBase CRUD", () => {
  it("create stores the row with the context time and returns its id", async () => {
    const { id } = await createNamed("a");
    const row = await service.getById(c, id, {
      name: SItem.name,
      createdAt: SItem.createdAt,
      isDeleted: SItem.isDeleted,
    });
    expect(row).toEqual({ name: "a", createdAt: c.nowDatetime, isDeleted: false });
  });

  it("getAll pages newest first and reports meta", async () => {
    for (const name of ["a", "b", "c"]) {
      await createNamed(name);
    }
    const first = await service.getAll(c, { limit: 2, page: 1 }, { name: SItem.name });
    expect(first).toEqual({
      data: [{ name: "c" }, { name: "b" }],
      meta: { total: 3, page: 1, limit: 2, totalPages: 2 },
    });
    const second = await service.getAll(c, { limit: 2, page: 2 }, { name: SItem.name });
    expect(second.data).toEqual([{ name: "a" }]);
  });

  it("getById of an unknown id → 404", async () => {
    expect(codeOf(await thrown(() => service.getById(c, crypto.randomUUID(), { id: SItem.id })))).toBe(
      404,
    );
  });

  it("remove soft-deletes: the row is hidden from reads, update and a second remove", async () => {
    const { id } = await createNamed("gone");
    await createNamed("kept");
    expect(await service.remove(c, id)).toEqual({ success: true });

    expect(codeOf(await thrown(() => service.getById(c, id, { id: SItem.id })))).toBe(404);
    expect(codeOf(await thrown(() => service.update(c, id, { name: "x" })))).toBe(404);
    expect(codeOf(await thrown(() => service.remove(c, id)))).toBe(404);
    const all = await service.getAll(c, { limit: 10, page: 1 }, { name: SItem.name });
    expect(all.data).toEqual([{ name: "kept" }]);
    expect(all.meta.total).toBe(1);

    const raw = await c.db
      .select({ isDeleted: SItem.isDeleted, deletedAt: SItem.deletedAt })
      .from(SItem);
    expect(raw).toContainEqual({ isDeleted: true, deletedAt: c.nowDatetime });
  });

  it("update of an unknown id → 404", async () => {
    expect(codeOf(await thrown(() => service.update(c, crypto.randomUUID(), { name: "x" })))).toBe(
      404,
    );
  });

  it("subclasses see the table columns", () => {
    expect(service.columnNames()).toEqual([
      "createdAt",
      "deletedAt",
      "id",
      "isDeleted",
      "name",
      "updatedAt",
    ]);
  });
});
