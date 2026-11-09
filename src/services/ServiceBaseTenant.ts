import { ServiceBase } from "./ServiceBase";
import { IBaseTable } from "../interfaces/IBaseTable";
import { ITenantApp } from "../interfaces/IContextApp";
import { UtilTenantScope } from "../utils/UtilTenantScope";
import { eq, type InferInsertModel, type SQL } from "drizzle-orm";
import { type SelectedFields, type PgColumn } from "drizzle-orm/pg-core";
import type { Prettify } from "../types/TPrettify";

export abstract class ServiceBaseTenant<
  TTable extends IBaseTable & { tenantId: PgColumn },
  TId extends string | number = string,
  TInsertData = Prettify<
    Omit<
      InferInsertModel<TTable>,
      "id" | "tenantId" | "createdAt" | "updatedAt" | "isDeleted" | "deletedAt"
    >
  >,
> extends ServiceBase<TTable, TId, ITenantApp, TInsertData> {
  /**
   * Defense in depth [CORE-02]: besides RLS, every query of a non-super
   * user is filtered by its own tenant id.
   */
  protected override getFilters(c: ITenantApp, id?: TId): SQL[] {
    const filters = super.getFilters(c, id);
    if (!isSuperUser(c)) {
      filters.push(eq(this.table.tenantId, c.tenantId));
    }
    return filters;
  }

  async create(c: ITenantApp, data: TInsertData) {
    // The tenant always comes from the context, never from the payload.
    return await UtilTenantScope.tenantScope(c, async (tx) =>
      this.insertRow({ ...c, db: tx }, {
        ...(data as object),
        tenantId: c.tenantId,
      }),
    );
  }

  async update(
    c: ITenantApp,
    id: TId,
    data: Parameters<
      ServiceBase<TTable, TId, ITenantApp, TInsertData>["update"]
    >[2],
  ) {
    return await UtilTenantScope.tenantScope(c, async (tx) =>
      super.update({ ...c, db: tx }, id, data),
    );
  }

  async remove(c: ITenantApp, id: TId) {
    return await UtilTenantScope.tenantScope(c, async (tx) =>
      super.remove({ ...c, db: tx }, id),
    );
  }

  async getById<TSelection extends SelectedFields>(
    c: ITenantApp,
    id: TId,
    columns: TSelection,
  ) {
    return await UtilTenantScope.tenantScope(c, async (tx) =>
      super.getById({ ...c, db: tx }, id, columns),
    );
  }

  async getAll<TSelection extends SelectedFields>(
    c: ITenantApp,
    query: { limit: number; page: number },
    columns: TSelection,
  ) {
    return await UtilTenantScope.tenantScope(c, async (tx) =>
      super.getAll({ ...c, db: tx }, query, columns),
    );
  }
}

const isSuperUser = (c: ITenantApp): boolean =>
  "session" in c &&
  typeof c.session === "object" &&
  c.session !== null &&
  "isSuperUser" in c.session &&
  c.session.isSuperUser === true;
