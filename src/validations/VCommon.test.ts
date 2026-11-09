import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { VEmail, VId, VNumber, VQuery, VStr, VString } from "./VCommon";

describe("VStr [CORE-12]", () => {
  it("accepts strings within [min, max]", () => {
    const schema = VStr(5);
    expect(Value.Check(schema, "a")).toBe(true);
    expect(Value.Check(schema, "abcde")).toBe(true);
  });

  it("rejects strings longer than max (varchar(n) overflow)", () => {
    expect(Value.Check(VStr(5), "abcdef")).toBe(false);
  });

  it("rejects the empty string by default (min = 1)", () => {
    expect(Value.Check(VStr(5), "")).toBe(false);
  });

  it("honours an explicit min", () => {
    const schema = VStr(10, 3);
    expect(Value.Check(schema, "ab")).toBe(false);
    expect(Value.Check(schema, "abc")).toBe(true);
    expect(Value.Check(VStr(10, 0), "")).toBe(true);
  });

  it("carries the bounds in the schema (OpenAPI docs)", () => {
    expect(VStr(255)).toMatchObject({ type: "string", maxLength: 255, minLength: 1 });
  });

  it("refuses impossible bounds at definition time", () => {
    expect(() => VStr(0)).toThrow();
    expect(() => VStr(5, 6)).toThrow();
    expect(() => VStr(5, -1)).toThrow();
    expect(() => VStr(1.5)).toThrow();
  });
});

describe("validation primitives", () => {
  it("VEmail is bounded to 254 characters (RFC 5321) [CORE-12]", () => {
    expect(VEmail.maxLength).toBe(254);
    expect(Value.Check(VEmail, `${"a".repeat(64)}@${"b".repeat(185)}.com`)).toBe(true);
    expect(Value.Check(VEmail, `${"a".repeat(64)}@${"b".repeat(186)}.com`)).toBe(false);
  });

  it("VId requires a uuid", () => {
    expect(VId.format).toBe("uuid");
  });

  it("VNumber rejects negatives", () => {
    expect(Value.Check(VNumber, 0)).toBe(true);
    expect(Value.Check(VNumber, -1)).toBe(false);
  });

  it("VString stays a non-empty, unbounded string for backward compatibility", () => {
    expect(Value.Check(VString, "")).toBe(false);
    expect(Value.Check(VString, "x".repeat(10_000))).toBe(true);
  });

  it("VQuery bounds the page size and defaults paging", () => {
    expect(Value.Check(VQuery, { limit: 100, page: 1 })).toBe(true);
    expect(Value.Check(VQuery, { limit: 101, page: 1 })).toBe(false);
    expect(Value.Check(VQuery, { limit: 1, page: 0 })).toBe(false);
    expect(Value.Default(VQuery, {})).toEqual({ limit: 20, page: 1 });
  });
});
