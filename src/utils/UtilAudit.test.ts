import { describe, it, expect } from "bun:test";
import { UtilAudit } from "./UtilAudit";

const REDACTED = "********";

describe("UtilAudit.scrub", () => {
  it("[SEC-06] redacts every sensitive key pattern", () => {
    const keys = [
      "password",
      "passwd",
      "pwd",
      "secret",
      "token",
      "apiKey",
      "authorization",
      "cookie",
      "session",
      "creditCard",
      "cardNumber",
      "cvv",
      "cvc",
      "iban",
      "ssn",
      "otp",
      "pin",
    ];
    const input = Object.fromEntries(keys.map((k) => [k, "plaintext"]));
    const out = UtilAudit.scrub(input) as Record<string, unknown>;
    for (const k of keys) {
      expect(out[k]).toBe(REDACTED);
    }
  });

  it("[SEC-06] matches case and separator variants and keys that contain a pattern", () => {
    const out = UtilAudit.scrub({
      currentPassword: "a",
      CurrentPassword: "b",
      current_password: "c",
      "new-password": "d",
      NEW_PASSWORD: "e",
      clientSecret: "f",
      refreshToken: "g",
      x_api_key: "h",
      Authorization: "Bearer x",
      setCookie: "i",
      name: "Alice",
    }) as Record<string, unknown>;

    for (const key of [
      "currentPassword",
      "CurrentPassword",
      "current_password",
      "new-password",
      "NEW_PASSWORD",
      "clientSecret",
      "refreshToken",
      "x_api_key",
      "Authorization",
      "setCookie",
    ]) {
      expect(out[key]).toBe(REDACTED);
    }
    expect(out.name).toBe("Alice");
  });

  it("[SEC-06] scrubs inside nested objects and arrays", () => {
    const out = UtilAudit.scrub({
      users: [
        { name: "a", password: "p1" },
        [{ token: "t" }, { ok: 1 }],
      ],
      meta: { nested: { apiKey: "k", keep: true } },
    });
    expect(out).toEqual({
      users: [
        { name: "a", password: REDACTED },
        [{ token: REDACTED }, { ok: 1 }],
      ],
      meta: { nested: { apiKey: REDACTED, keep: true } },
    });
  });

  it("[SEC-06] serializes Date, Map and Set instead of dropping them to {}", () => {
    const date = new Date("2026-01-02T03:04:05.000Z");
    const out = UtilAudit.scrub({
      at: date,
      map: new Map<string, unknown>([
        ["visible", 1],
        ["password", "p"],
      ]),
      set: new Set(["a", { secret: "s" }]),
    });
    expect(out).toEqual({
      at: "2026-01-02T03:04:05.000Z",
      map: { visible: 1, password: REDACTED },
      set: ["a", { secret: REDACTED }],
    });
  });

  it("[SEC-06] replaces binary data with a size marker", () => {
    const out = UtilAudit.scrub({
      buf: Buffer.from("hello"),
      bytes: new Uint8Array(3),
      raw: new ArrayBuffer(8),
      view: new DataView(new ArrayBuffer(2)),
    });
    expect(out).toEqual({
      buf: "[BINARY 5 bytes]",
      bytes: "[BINARY 3 bytes]",
      raw: "[BINARY 8 bytes]",
      view: "[BINARY 2 bytes]",
    });
  });

  it("[SEC-06] keeps the file/blob marker", () => {
    const out = UtilAudit.scrub({
      file: new File(["x"], "avatar.png"),
      blob: new Blob(["y"]),
    });
    expect(out).toEqual({
      file: "[FILE/BLOB: avatar.png]",
      blob: "[FILE/BLOB: unknown_blob]",
    });
  });

  it("[SEC-06] marks circular references instead of recursing", () => {
    const a: Record<string, unknown> = { name: "a" };
    a.self = a;
    const shared = { v: 1 };
    const out = UtilAudit.scrub({ a, left: shared, right: shared });
    expect(out).toEqual({
      a: { name: "a", self: "[CIRCULAR]" },
      left: { v: 1 },
      right: { v: 1 },
    });
  });

  it("[SEC-06] accepts caller-provided extra keys", () => {
    const out = UtilAudit.scrub(
      { taxId: "123", Tax_Id: "456", name: "n" },
      { extraKeys: ["taxId"] },
    );
    expect(out).toEqual({ taxId: REDACTED, Tax_Id: REDACTED, name: "n" });
  });

  it("keeps the depth limit and primitives", () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } };
    expect(JSON.stringify(UtilAudit.scrub(deep))).toContain(
      "[MAX_DEPTH_REACHED]",
    );
    expect(UtilAudit.scrub("x")).toBe("x");
    expect(UtilAudit.scrub(null)).toBe(null);
    expect(UtilAudit.scrub(5)).toBe(5);
  });
});
