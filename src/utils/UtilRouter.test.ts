import { describe, it, expect } from "bun:test";
import { t } from "elysia";
import { Value } from "@sinclair/typebox/value";
import { UtilRouter } from "./UtilRouter";

describe("UtilRouter.defPaginatedSchema", () => {
  const schema = UtilRouter.defPaginatedSchema(t.Object({ id: t.String() }));
  const meta = { total: 1, page: 1, limit: 20, totalPages: 1 };

  it("accepts the shape returned by ServiceBase.getAll", () => {
    expect(Value.Check(schema, { data: [{ id: "x" }], meta })).toBe(true);
    expect(Value.Check(schema, { data: [], meta: { ...meta, total: 0, totalPages: 0 } })).toBe(
      true,
    );
  });

  it("validates every item with the given schema", () => {
    expect(Value.Check(schema, { data: [{ id: 1 }], meta })).toBe(false);
  });

  it("requires every meta field", () => {
    const partial = { total: 1, page: 1, limit: 20 };
    expect(Value.Check(schema, { data: [], meta: partial })).toBe(false);
  });
});
