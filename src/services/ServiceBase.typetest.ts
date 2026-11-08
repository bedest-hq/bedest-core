/**
 * Type-level tests (checked by `bun run typecheck`, excluded from the build)
 * [CORE-01]: results are typed from the selected columns.
 */
import { pgTable, varchar } from "drizzle-orm/pg-core";
import { baseColumns } from "../schemas/SBase";
import { ServiceBase } from "./ServiceBase";
import type { IApp } from "../interfaces/IContextApp";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

const SItem = pgTable("items", {
  ...baseColumns,
  name: varchar({ length: 50 }).notNull(),
  secret: varchar({ length: 50 }),
});

class ServiceItem extends ServiceBase<typeof SItem> {
  constructor() {
    super(SItem);
  }
  byId(c: IApp, id: string) {
    return this.getById(c, id, { id: SItem.id });
  }
  list(c: IApp) {
    return this.getAll(c, { limit: 10, page: 1 }, { id: SItem.id, name: SItem.name });
  }
}

type ById = Awaited<ReturnType<ServiceItem["byId"]>>;
type List = Awaited<ReturnType<ServiceItem["list"]>>["data"];

export type CoreTypeTests = [
  // Selecting { id } yields exactly { id: string }.
  Expect<Equal<ById, { id: string }>>,
  // getAll rows contain the selected columns only (no `secret`).
  Expect<Equal<List, { id: string; name: string }[]>>,
];
