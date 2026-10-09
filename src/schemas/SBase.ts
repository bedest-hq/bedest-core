import { uuid, timestamp, boolean } from "drizzle-orm/pg-core";

export const baseColumns = {
  id: uuid().defaultRandom().primaryKey(),
  isDeleted: boolean().default(false).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp({ withTimezone: true }),
};
