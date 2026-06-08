import { IUserApp } from "../interfaces/IContextApp";
import { status } from "elysia";

export type PlanChecker = (
  tenantId: string,
  nowDatetime: Date,
) => Promise<{ plan: string; planEnd: Date } | null | undefined>;

export const MacroPlanGuard = (plans: string[], checkPlan: PlanChecker) => ({
  async beforeHandle({ userRuntime }: { userRuntime?: IUserApp }) {
    if (!userRuntime) {
      throw status("Unauthorized");
    }

    const tenant = await checkPlan(
      userRuntime.tenantId,
      userRuntime.nowDatetime,
    );

    if (!tenant) {
      throw status("Not Found");
    }

    if (tenant.planEnd < userRuntime.nowDatetime) {
      throw status("Payment Required");
    }

    if (!plans.includes(tenant.plan)) {
      throw status("Upgrade Required");
    }
  },
});
