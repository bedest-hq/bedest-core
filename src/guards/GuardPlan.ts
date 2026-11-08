import { ITenantUserApp } from "../interfaces/IContextApp";
import { status } from "elysia";

export type PlanChecker = (
  tenantId: string,
  nowDatetime: Date,
) => Promise<{ plan: string; planEnd: Date } | null | undefined>;

export interface IPlanGuardOptions {
  /** Cache plan lookups per tenant for this long (default: no cache). */
  cacheTtlMs?: number;
}

/**
 * Plan gate for tenant routes:
 * - 401 without a user runtime,
 * - 404 when the tenant is unknown,
 * - 402 when the plan has expired,
 * - 403 { error: "Forbidden", message: "PLAN_UPGRADE_REQUIRED" } when the
 *   plan is not one of `plans` (426 is for protocol upgrades) [CORE-07].
 */
export const MacroPlanGuard = (
  plans: string[],
  checkPlan: PlanChecker,
  options: IPlanGuardOptions = {},
) => {
  const cache = new Map<
    string,
    { value: { plan: string; planEnd: Date } | null | undefined; expiresAt: number }
  >();

  const lookup = async (tenantId: string, nowDatetime: Date) => {
    const ttl = options.cacheTtlMs ?? 0;
    if (ttl <= 0) {
      return await checkPlan(tenantId, nowDatetime);
    }
    const now = Date.now();
    const hit = cache.get(tenantId);
    if (hit && hit.expiresAt > now) {
      return hit.value;
    }
    const value = await checkPlan(tenantId, nowDatetime);
    cache.set(tenantId, { value, expiresAt: now + ttl });
    return value;
  };

  return {
    async beforeHandle({ userRuntime }: { userRuntime?: ITenantUserApp }) {
      if (!userRuntime) {
        throw status("Unauthorized");
      }

      const tenant = await lookup(userRuntime.tenantId, userRuntime.nowDatetime);

      if (!tenant) {
        throw status("Not Found");
      }

      if (tenant.planEnd < userRuntime.nowDatetime) {
        throw status("Payment Required");
      }

      if (!plans.includes(tenant.plan)) {
        throw status(403, {
          error: "Forbidden",
          message: "PLAN_UPGRADE_REQUIRED",
        });
      }
    },
  };
};
