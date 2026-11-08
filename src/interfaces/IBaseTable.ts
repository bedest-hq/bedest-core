import { PgColumn, PgTable } from "drizzle-orm/pg-core";

export type IBaseTable = PgTable & {
  id: PgColumn;
  createdAt: PgColumn;
  updatedAt: PgColumn;
  isDeleted: PgColumn;
  deletedAt: PgColumn;
  tenantId?: PgColumn;
};
