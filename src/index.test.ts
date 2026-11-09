import { describe, it, expect } from "bun:test";
import * as core from "./index";

describe("public API", () => {
  it("exports exactly the documented runtime values", () => {
    expect(Object.keys(core).sort()).toEqual([
      "MacroPlanGuard",
      "MacroRoleGuard",
      "ServiceBase",
      "ServiceBaseTenant",
      "UtilAudit",
      "UtilDbSchema",
      "UtilRouter",
      "UtilTenantScope",
      "VEmail",
      "VId",
      "VNumber",
      "VQuery",
      "VStr",
      "VString",
      "baseColumns",
    ]);
  });
});
