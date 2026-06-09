
# bedest-core

[![NPM Version](https://img.shields.io/npm/v/bedest-core)](https://www.npmjs.com/package/bedest-core)
[![NPM Downloads](https://img.shields.io/npm/dt/bedest-core)](https://www.npmjs.com/package/bedest-core)

Core abstractions for the **Bedest** BED stack (**Bun + Elysia + Drizzle**).



## Installation

```bash
bun add bedest-core
```

## Peer Dependencies

```bash
bun add elysia drizzle-orm
```

---

## Included Exports

| Export                                          | Description                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ServiceBase`                                   | Generic CRUD base class (`create`, `getAll`, `getById`, `update`, `remove`)         |
| `ServiceBaseTenant`                             | Tenant-scoped CRUD service. All operations run inside an RLS transaction.           |
| `UtilTenantScope`                               | `tenantScope` and `systemScope` transaction wrappers for configuring RLS context.   |
| `UtilDbSchema`                                  | Schema helpers: `tenantIsolationPolicy`, `activeIndex`, `activeUniqueIndex`.        |
| `UtilRouter`                                    | `defPaginatedSchema` — paginated response wrapper for Elysia schemas.               |
| `UtilAudit`                                     | `scrub()` — removes sensitive fields from audit logs.                               |
| `MacroRoleGuard`                                | Elysia macro for role-based access control.                                         |
| `MacroPlanGuard`                                | Elysia macro for tenant plan-based access control (`checkPlan` injection required). |
| `baseColumns`                                   | Common Drizzle columns: `id`, `isDeleted`, `createdAt`, `deletedAt`.                |
| `VId`, `VEmail`, `VString`, `VQuery`, `VNumber` | Reusable Elysia/TypeBox validation primitives.                                      |
| `IApp`, `ITenantApp`, `IUserApp`                | Application context interfaces.                                                     |
| `ISession`                                      | Session contract: `userId`, `sessionId`, `role`, `isSuperUser`.                     |
| `IBaseTable`                                    | Base Drizzle table type constraint.                                                 |
| `TDb`                                           | `NodePgDatabase` type alias.                                                        |

---

## Usage

### 1. ISession — `isSuperUser`

The `role` property is now typed as a plain `string`, removing any enum dependency.

The `isSuperUser` flag should be resolved in your application's `Context.ts`:

```ts
// src/app/Context.ts
import { ISession, IUserApp } from "bedest-core";
import { EUserRole } from "@f/user/enums/EUserRole";

const session: ISession = {
  userId: payload.userId,
  sessionId: payload.sessionId,
  role: payload.role,
  isSuperUser: payload.role === EUserRole.SYSTEM,
};
```

### 2. MacroRoleGuard

Register the macro in your application context:

```ts
import { MacroRoleGuard } from "bedest-core";

.macro("RoleGuard", MacroRoleGuard)
```

Use it in routes:

```ts
{
  RoleGuard: [EUserRole.ADMIN, EUserRole.SYSTEM]
}
```

Since `EUserRole` extends `string`, route definitions remain fully type-safe.

### 3. MacroPlanGuard

Bind a `checkPlan` function once in `Context.ts`:

```ts
import { MacroPlanGuard, PlanChecker } from "bedest-core";
import ServiceTenant from "@f/tenant/services/ServiceTenant";
import { ETenantPlan } from "@f/tenant/enums/ETenantPlan";

const planChecker: PlanChecker = (tenantId, nowDatetime) =>
  ServiceTenant.checkPlan({ db, nowDatetime }, tenantId);

.macro(
  "PlanGuard",
  (plans: ETenantPlan[]) => MacroPlanGuard(plans, planChecker)
);
```

Use it in routes:

```ts
{
  PlanGuard: [ETenantPlan.PROFESSIONAL]
}
```

### 4. ServiceBase / ServiceBaseTenant

```ts
import { ServiceBaseTenant } from "bedest-core";
import { SMyTable } from "../schemas/SMyTable";

class ServiceMyEntity extends ServiceBaseTenant<typeof SMyTable> {
  constructor() {
    super(SMyTable);
  }
}

export default new ServiceMyEntity();
```

### 5. UtilDbSchema

```ts
import { baseColumns, UtilDbSchema } from "bedest-core";

export const SMyTable = pgTable(
  "my_table",
  {
    ...baseColumns,
    tenantId: uuid().notNull(),
    name: varchar({ length: 255 }).notNull(),
  },
  (t) => [
    UtilDbSchema.activeIndex("idx_my_table_active", t.id),
    UtilDbSchema.tenantIsolationPolicy(t.tenantId),
  ]
).enableRLS();
```

---

## Peer Dependencies

```json
{
  "peerDependencies": {
    "drizzle-orm": ">=0.41",
    "elysia": ">=1.1"
  }
}
```
