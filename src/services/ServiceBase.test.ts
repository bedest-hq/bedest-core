import { describe, it, expect, beforeAll } from "bun:test";
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
}
const service = new ServiceItem();

let c: IApp;

beforeAll(async () => {
  const { db } = await createTestDb(DDL);
  c = { db, nowDatetime: new Date() };
});

const statusOf = (err: unknown) =>
  typeof err === "object" && err !== null && "code" in err && "response" in err
    ? { code: err.code, response: err.response }
    : err;

describe("ServiceBase.update", () => {
  it("[BUG-02] an empty payload → 400 { error: Bad Request, message: No fields to update }", async () => {
    const { id } = await service.create(c, { name: "a" });
    expect(statusOf(await thrown(() => service.update(c, id, {})))).toEqual({
      code: 400,
      response: { error: "Bad Request", message: "No fields to update" },
    });
  });

  it("[BUG-02] a payload with only undefined values is empty too", async () => {
    const { id } = await service.create(c, { name: "a" });
    expect(
      statusOf(await thrown(() => service.update(c, id, { name: undefined }))),
    ).toEqual({
      code: 400,
      response: { error: "Bad Request", message: "No fields to update" },
    });
  });

  it("[BUG-02] a real change still succeeds", async () => {
    const { id } = await service.create(c, { name: "a" });
    expect(await service.update(c, id, { name: "b" })).toEqual({ success: true });
    expect((await service.getById(c, id, { name: SItem.name })).name).toBe("b");
  });
});
