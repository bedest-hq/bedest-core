import { describe, it, expect, beforeAll } from "bun:test";
import { MacroPlanGuard, type PlanChecker } from "./GuardPlan";
import { createTestDb, thrown } from "../test-support/TestDb";
import type { ITenantUserApp, TDb } from "../index";

let db: TDb;
beforeAll(async () => {
  ({ db } = await createTestDb("SELECT 1"));
});

const runtime = (tenantId = "t1"): ITenantUserApp => ({
  db,
  nowDatetime: new Date("2026-01-01T00:00:00Z"),
  tenantId,
  session: { userId: "u", sessionId: "s", role: "USER", isSuperUser: false },
});

const future = new Date("2027-01-01T00:00:00Z");
const past = new Date("2025-01-01T00:00:00Z");

const statusOf = (err: unknown) =>
  typeof err === "object" && err !== null && "code" in err
    ? { code: err.code, response: "response" in err ? err.response : undefined }
    : err;

describe("MacroPlanGuard", () => {
  const checker = (plan: { plan: string; planEnd: Date } | null): PlanChecker =>
    () => Promise.resolve(plan);

  it("[CORE-07] no runtime → 401", async () => {
    const guard = MacroPlanGuard(["PRO"], checker({ plan: "PRO", planEnd: future }));
    expect(statusOf(await thrown(async () => guard.beforeHandle({})))).toMatchObject({ code: 401 });
  });

  it("[CORE-07] unknown tenant → 404", async () => {
    const guard = MacroPlanGuard(["PRO"], checker(null));
    expect(
      statusOf(await thrown(async () => guard.beforeHandle({ userRuntime: runtime() }))),
    ).toMatchObject({ code: 404 });
  });

  it("[CORE-07] expired plan → 402", async () => {
    const guard = MacroPlanGuard(["PRO"], checker({ plan: "PRO", planEnd: past }));
    expect(
      statusOf(await thrown(async () => guard.beforeHandle({ userRuntime: runtime() }))),
    ).toMatchObject({ code: 402 });
  });

  it("[CORE-07] insufficient plan → 403 PLAN_UPGRADE_REQUIRED (never 426)", async () => {
    const guard = MacroPlanGuard(["PRO"], checker({ plan: "BASIC", planEnd: future }));
    expect(
      statusOf(await thrown(async () => guard.beforeHandle({ userRuntime: runtime() }))),
    ).toEqual({
      code: 403,
      response: { error: "Forbidden", message: "PLAN_UPGRADE_REQUIRED" },
    });
  });

  it("[CORE-07] allowed plan passes; with cacheTtlMs the plan is looked up once", async () => {
    let calls = 0;
    const counting: PlanChecker = () => {
      calls++;
      return Promise.resolve({ plan: "PRO", planEnd: future });
    };
    const guard = MacroPlanGuard(["PRO"], counting, { cacheTtlMs: 60_000 });
    expect(await thrown(async () => guard.beforeHandle({ userRuntime: runtime() }))).toBe("no-throw");
    expect(await thrown(async () => guard.beforeHandle({ userRuntime: runtime() }))).toBe("no-throw");
    expect(calls).toBe(1);

    // Different tenant → own cache entry.
    await guard.beforeHandle({ userRuntime: runtime("t2") });
    expect(calls).toBe(2);
  });
});
