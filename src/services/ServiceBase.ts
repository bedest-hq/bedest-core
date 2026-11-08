import {
  and,
  eq,
  getTableColumns,
  type SQL,
  type InferInsertModel,
  count,
  desc,
} from "drizzle-orm";
import {
  type PgTable,
  type SelectedFields,
  type PgUpdateSetSource,
} from "drizzle-orm/pg-core";
import type { SelectResultFields } from "drizzle-orm/query-builders/select.types";
import { type IBaseTable } from "../interfaces/IBaseTable";
import type { Prettify } from "../types/TPrettify";
import { IApp } from "../interfaces/IContextApp";
import { status } from "elysia";

export abstract class ServiceBase<
  TTable extends IBaseTable,
  TId extends string | number = string,
  TContext extends IApp = IApp,
  TInsertData = Prettify<
    Omit<
      InferInsertModel<TTable>,
      "id" | "createdAt" | "updatedAt" | "isDeleted" | "deletedAt"
    >
  >,
> {
  constructor(protected table: TTable) {}

  /**
   * The table widened to PgTable: drizzle's from() overload cannot check a
   * generic table type, the widening needs no cast [CORE-01].
   */
  private get selectable(): PgTable {
    return this.table;
  }

  protected get columns() {
    return getTableColumns(this.table);
  }

  /**
   * WHERE predicates of every query. Receives the context so subclasses can
   * scope by it (ServiceBaseTenant adds the tenant) [CORE-02].
   */
  protected getFilters(c: TContext, id?: TId): SQL[] {
    const filters: SQL[] = [eq(this.table.isDeleted, false)];

    // `0` is a valid id: only "no id" skips the filter [CORE-09].
    if (id !== undefined) {
      filters.push(eq(this.table.id, id));
    }

    return filters;
  }

  protected getOrderBy(): SQL[] {
    return [desc(this.table.createdAt)];
  }

  async create(c: TContext, data: TInsertData): Promise<{ id: TId }> {
    const payload = {
      ...(data as object),
      createdAt: c.nowDatetime,
      isDeleted: false,
    } as InferInsertModel<TTable>;

    const [res] = await c.db
      .insert(this.table)
      .values(payload)
      .returning({ id: this.table.id });

    if (!res) {
      throw status("Internal Server Error");
    }
    return res as { id: TId };
  }

  async getAll<TSelection extends SelectedFields>(
    c: TContext,
    query: { limit: number; page: number },
    columns: TSelection,
  ): Promise<{
    data: SelectResultFields<TSelection>[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const offset = (query.page - 1) * query.limit;
    const filters = this.getFilters(c);

    return await c.db.transaction(async (tx) => {
      const [totalRes] = await tx
        .select({ count: count() })
        .from(this.selectable)
        .where(and(...filters));

      const total = Number(totalRes.count);

      const data: SelectResultFields<TSelection>[] = await tx
        .select(columns)
        .from(this.selectable)
        .where(and(...filters))
        .$dynamic()
        .limit(query.limit)
        .offset(offset)
        .orderBy(...this.getOrderBy());

      return {
        data,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async getById<TSelection extends SelectedFields>(
    c: TContext,
    id: TId,
    columns: TSelection,
  ): Promise<SelectResultFields<TSelection>> {
    const rows: SelectResultFields<TSelection>[] = await c.db
      .select(columns)
      .from(this.selectable)
      .where(and(...this.getFilters(c, id)));

    const [res] = rows;
    if (!res) {
      throw status("Not Found");
    }
    return res;
  }

  async update(
    c: TContext,
    id: TId,
    data: Prettify<
      Partial<
        Omit<
          InferInsertModel<TTable>,
          "id" | "tenantId" | "createdAt" | "isDeleted" | "deletedAt"
        >
      >
    >,
  ): Promise<{ success: boolean }> {
    // Undefined fields are "not provided"; nothing left → 400, never a
    // driver error ("No values to set" → 500) [BUG-02].
    const values = Object.fromEntries(
      Object.entries(data as Record<string, unknown>).filter(
        ([, value]) => value !== undefined,
      ),
    );
    if (Object.keys(values).length === 0) {
      throw status(400, {
        error: "Bad Request",
        message: "No fields to update",
      });
    }

    const update = await c.db
      .update(this.table)
      .set(values as PgUpdateSetSource<TTable>)
      .where(and(...this.getFilters(c, id)));

    const count =
      update.rowCount ?? (update as { affectedRows?: number }).affectedRows;
    if (count === 0) {
      throw status("Not Found");
    }

    return { success: true };
  }

  async remove(c: TContext, id: TId): Promise<{ success: boolean }> {
    const payload = {
      isDeleted: true,
      deletedAt: c.nowDatetime,
    } as PgUpdateSetSource<TTable>;

    const update = await c.db
      .update(this.table)
      .set(payload)
      .where(and(...this.getFilters(c, id)));

    const count =
      update.rowCount ?? (update as { affectedRows?: number }).affectedRows;
    if (count === 0) {
      throw status("Not Found");
    }

    return { success: true };
  }
}
