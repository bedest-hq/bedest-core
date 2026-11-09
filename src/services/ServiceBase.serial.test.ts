import { describe, it, expect, beforeAll } from "bun:test";
import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { ServiceBase } from "./ServiceBase";
import { createTestDb, thrown } from "../test-support/TestDb";
import type { IApp } from "../interfaces/IContextApp";

const SCounter = pgTable("counters", {
  id: integer().primaryKey(),
  isDeleted: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp({ withTimezone: true }),
  name: varchar({ length: 20 }).notNull(),
});

class ServiceCounter extends ServiceBase<typeof SCounter, number> {
  constructor() {
    super(SCounter);
  }
}
const service = new ServiceCounter();
let c: IApp;

beforeAll(async () => {
  const { db } = await createTestDb(`
    CREATE TABLE counters (
      id integer PRIMARY KEY,
      "isDeleted" boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "deletedAt" timestamptz,
      name varchar(20) NOT NULL
    );
    INSERT INTO counters (id, name) VALUES (1, 'one'), (2, 'two');
  `);
  c = { db, nowDatetime: new Date() };
});

describe("ServiceBase with numeric ids", () => {
  it("[CORE-09] id 0 is an id: getById(0) → 404 instead of an arbitrary row", async () => {
    const err = await thrown(() => service.getById(c, 0, { name: SCounter.name }));
    expect(err).toMatchObject({ code: 404 });
  });

  it("[CORE-09] update(0) and remove(0) touch no row", async () => {
    expect(await thrown(() => service.update(c, 0, { name: "hacked" }))).toMatchObject({
      code: 404,
    });
    expect(await thrown(() => service.remove(c, 0))).toMatchObject({ code: 404 });
    expect((await service.getById(c, 1, { name: SCounter.name })).name).toBe("one");
    expect((await service.getById(c, 2, { name: SCounter.name })).name).toBe("two");
  });
});
