import { IUserApp } from "../interfaces/IContextApp";
import { status } from "elysia";

export const MacroRoleGuard = (roles: string[]) => ({
  beforeHandle({ userRuntime }: { userRuntime?: IUserApp }) {
    if (!userRuntime) {
      throw status("Unauthorized");
    }

    if (!roles.includes(userRuntime.session.role)) {
      throw status("Forbidden");
    }
  },
});
