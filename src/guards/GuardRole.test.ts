import { describe, it, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { MacroRoleGuard } from "./GuardRole";
import { createTestDb, thrown } from "../test-support/TestDb";
import type { IUserApp, TDb } from "../index";

let db: TDb;
beforeAll(async () => {
  ({ db } = await createTestDb("SELECT 1"));
});

const runtime = (role: string): IUserApp => ({
  db,
  nowDatetime: new Date("2026-01-01T00:00:00Z"),
  session: { userId: "u", sessionId: "s", role, isSuperUser: false },
});

// beforeHandle is synchronous: run it inside a promise so a throw is captured.
const attempt = (fn: () => void) => thrown(() => Promise.resolve().then(fn));

const codeOf = (err: unknown) =>
  typeof err === "object" && err !== null && "code" in err ? err.code : err;

describe("MacroRoleGuard", () => {
  const guard = MacroRoleGuard(["ADMIN", "OWNER"]);

  it("no runtime → 401", async () => {
    expect(codeOf(await attempt(() => guard.beforeHandle({})))).toBe(401);
  });

  it("a role outside the list → 403", async () => {
    expect(
      codeOf(await attempt(() => guard.beforeHandle({ userRuntime: runtime("USER") }))),
    ).toBe(403);
  });

  it("every listed role passes", async () => {
    for (const role of ["ADMIN", "OWNER"]) {
      expect(await attempt(() => guard.beforeHandle({ userRuntime: runtime(role) }))).toBe(
        "no-throw",
      );
    }
  });

  it("an empty list refuses everyone", async () => {
    const none = MacroRoleGuard([]);
    expect(
      codeOf(await attempt(() => none.beforeHandle({ userRuntime: runtime("ADMIN") }))),
    ).toBe(403);
  });

  it("works as route hooks in an Elysia app (status codes reach the client)", async () => {
    const app = (role?: string) =>
      new Elysia()
        .derive(() => (role ? { userRuntime: runtime(role) } : {}))
        .get("/admin", () => "ok", MacroRoleGuard(["ADMIN"]));

    const call = (role?: string) =>
      app(role).handle(new Request("http://localhost/admin")).then((r) => r.status);

    expect(await call()).toBe(401);
    expect(await call("USER")).toBe(403);
    expect(await call("ADMIN")).toBe(200);
  });
});
