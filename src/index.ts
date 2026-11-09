// Interfaces
export type { ISession } from "./interfaces/ISession";
export type {
  IApp,
  ITenantApp,
  IUserApp,
  ITenantUserApp,
} from "./interfaces/IContextApp";
export type { IBaseTable } from "./interfaces/IBaseTable";

// Types
export type { TDb } from "./types/TDb";
import type { TDbOrTx } from "./utils/UtilTenantScope";
export type { TDbOrTx, TTx } from "./utils/UtilTenantScope";
/**
 * Old name of `TDbOrTx`: it never meant "a transaction" only [CORE-10].
 * @deprecated Use `TDbOrTx`; removed in the next major.
 */
export type TTransaction = TDbOrTx;

// Services
export { ServiceBase } from "./services/ServiceBase";
export { ServiceBaseTenant } from "./services/ServiceBaseTenant";

// Utils
export { UtilTenantScope } from "./utils/UtilTenantScope";
export { UtilDbSchema } from "./utils/UtilDbSchema";
export { UtilRouter } from "./utils/UtilRouter";
export { UtilAudit } from "./utils/UtilAudit";
export type { IScrubOptions } from "./utils/UtilAudit";

// Guards
export { MacroRoleGuard } from "./guards/GuardRole";
export { MacroPlanGuard } from "./guards/GuardPlan";
export type { PlanChecker, IPlanGuardOptions } from "./guards/GuardPlan";

// Schemas
export { baseColumns } from "./schemas/SBase";

// Validations
export {
  VId,
  VEmail,
  VNumber,
  VStr,
  VString,
  VQuery,
} from "./validations/VCommon";
