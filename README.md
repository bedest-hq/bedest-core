# bedest-core

[![NPM Version](https://img.shields.io/npm/v/bedest-core)](https://www.npmjs.com/package/bedest-core)
[![NPM Downloads](https://img.shields.io/npm/dt/bedest-core)](https://www.npmjs.com/package/bedest-core)

Core abstractions for the **Bedest** BED stack (**Bun + Elysia + Drizzle**): CRUD base services with soft delete, tenant scoping for Postgres row-level security (RLS), schema helpers, guards and validation primitives.

The package has no runtime dependencies of its own; `elysia` and `drizzle-orm` are **peer dependencies** you install next to it.

## Requirements

| Package       | Supported range     | Notes                                                    |
| ------------- | ------------------- | -------------------------------------------------------- |
| Bun           | `>= 1.3`            | `engines.bun`; the package ships ESM only.               |
| `elysia`      | `^1.3.0`            | 1.2 and older lack the `status()` helper the guards use. |
| `drizzle-orm` | `>=0.41.0 <0.46.0`  | Verified against 0.41.0 to 0.45.x.                       |

## Installation

```bash
bun add bedest-core elysia drizzle-orm
```

---

## Exports

| Export                                                   | Description                                                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ServiceBase`                                            | Generic CRUD base class (`create`, `getAll`, `getById`, `update`, `remove`) with soft delete and typed results.   |
| `ServiceBaseTenant`                                      | Tenant-scoped CRUD: every call runs in `UtilTenantScope.tenantScope` and is also filtered by `tenantId`.          |
| `UtilTenantScope`                                        | `tenantScope` and `systemScope` transaction wrappers that set the RLS settings.                                   |
| `UtilDbSchema`                                           | Schema helpers: `tenantIsolationPolicy`, `activeIndex`, `activeUniqueIndex`.                                      |
| `UtilRouter`                                             | `defPaginatedSchema`: paginated response schema matching `ServiceBase.getAll`.                                    |
| `UtilAudit`                                              | `scrub()` removes secrets from audit payloads (`IScrubOptions.extraKeys` adds key fragments).                     |
| `MacroRoleGuard`                                         | Route hooks for role-based access control.                                                                        |
| `MacroPlanGuard`                                         | Route hooks for tenant-plan access control (`PlanChecker` injection, optional cache via `IPlanGuardOptions`).     |
| `baseColumns`                                            | Common Drizzle columns: `id`, `isDeleted`, `createdAt`, `updatedAt`, `deletedAt`.                                 |
| `VId`, `VEmail`, `VStr`, `VString`, `VQuery`, `VNumber`  | Elysia/TypeBox validation primitives (see [Validation](#7-validation)).                                           |
| `IApp`, `ITenantApp`, `IUserApp`, `ITenantUserApp`       | Application context interfaces.                                                                                   |
| `ISession`                                               | Session contract: `userId`, `sessionId`, `role`, `isSuperUser`.                                                   |
| `IBaseTable`                                             | Table constraint for the base services (the `baseColumns` columns).                                               |
| `TDb`                                                    | The application database: `NodePgDatabase`.                                                                       |
| `TTx`, `TDbOrTx`                                         | A transaction on a `TDb`; a database handle or a transaction.                                                     |
| `TTransaction`                                           | Deprecated alias of `TDbOrTx`; removed in the next major.                                                         |

---

## Usage

### 1. ISession: `isSuperUser`

`role` is a plain `string`. Resolve `isSuperUser` in your application's context:

```ts
// src/app/Context.ts
import { ISession } from "bedest-core";
import { EUserRole } from "@f/user/enums/EUserRole";

const session: ISession = {
  userId: payload.userId,
  sessionId: payload.sessionId,
  role: payload.role,
  isSuperUser: payload.role === EUserRole.SYSTEM,
};
```

### 2. MacroRoleGuard

`MacroRoleGuard(roles)` returns route hooks (`beforeHandle`) that read `userRuntime` from the context: no runtime gives `401`, a role outside `roles` gives `403`.

```ts
import { MacroRoleGuard } from "bedest-core";

app.macro("RoleGuard", MacroRoleGuard);

// in a route
{ RoleGuard: [EUserRole.ADMIN, EUserRole.SYSTEM] }
```

### 3. MacroPlanGuard

Bind a `PlanChecker` once:

```ts
import { MacroPlanGuard, type PlanChecker } from "bedest-core";

const planChecker: PlanChecker = (tenantId, nowDatetime) =>
  ServiceTenant.checkPlan({ db, nowDatetime }, tenantId);

app.macro("PlanGuard", (plans: ETenantPlan[]) =>
  MacroPlanGuard(plans, planChecker, { cacheTtlMs: 30_000 }),
);

// in a route
{ PlanGuard: [ETenantPlan.PROFESSIONAL] }
```

| Situation                         | Response                                                       |
| --------------------------------- | -------------------------------------------------------------- |
| no `userRuntime`                  | `401`                                                          |
| `PlanChecker` returns no tenant   | `404`                                                          |
| `planEnd` is in the past          | `402`                                                          |
| plan not in the list              | `403` `{ "error": "Forbidden", "message": "PLAN_UPGRADE_REQUIRED" }` |

`cacheTtlMs` (default: no cache) caches each tenant's plan in memory for that long, so guarded requests do not query the database every time. A plan change is then visible after at most `cacheTtlMs`.

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

- `getAll(c, { limit, page }, columns)` and `getById(c, id, columns)` return rows typed from `columns` (only the selected fields).
- `update(c, id, data)` ignores `undefined` fields; when nothing is left it throws `400 { "error": "Bad Request", "message": "No fields to update" }`. Unknown or soft-deleted ids give `404`.
- `remove(c, id)` is a soft delete (`isDeleted = true`, `deletedAt = c.nowDatetime`); removed rows are invisible to every other method.
- Numeric ids work, including `0`.
- `ServiceBaseTenant` sets `tenantId` from the context on `create` (never from the payload) and adds `tenantId = c.tenantId` to every query unless the session is a super user, on top of RLS.
- Override `getFilters(c, id?)` to add your own predicates; always start from `super.getFilters(c, id)`.

### 5. UtilTenantScope

```ts
await UtilTenantScope.tenantScope(c, async (tx) => {
  // app.current_tenant = c.tenantId; app.bypass_rls = 'on' only for a super-user session
});

await UtilTenantScope.systemScope(db, async (tx) => {
  // app.bypass_rls = 'on': for jobs and system tasks only
});
```

Both settings are transaction-local (`set_config(..., true)`), so they never leak into other requests sharing a pooled connection. RLS only protects you if the application connects as a role that is not the table owner and not a superuser, and the tables use `FORCE ROW LEVEL SECURITY`.

### 6. UtilDbSchema

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
  ],
).enableRLS();
```

`activeIndex` / `activeUniqueIndex` build partial indexes over non-deleted rows. The `WHERE` clause references the table's `isDeleted` column, so drizzle's `casing` option applies (e.g. `"is_deleted" = false` with `casing: "snake_case"`). A table without `isDeleted` fails when its config is built.

### 7. Validation

| Primitive        | Schema                                                         |
| ---------------- | -------------------------------------------------------------- |
| `VId`            | uuid string                                                    |
| `VEmail`         | e-mail, at most 254 characters                                 |
| `VStr(max, min)` | string of `min` (default 1) to `max` characters                |
| `VString`        | non-empty string, **unbounded** (kept for backward compatibility) |
| `VNumber`        | number `>= 0`                                                  |
| `VQuery`         | `{ limit: 1..100 = 20, page: >= 1 = 1 }`                       |

Every request field written to a `varchar(n)` column **must** use `VStr(n)`, so an oversized value is rejected by validation instead of failing in the database.

---

## Upgrading from 1.x to 2.0

- `ServiceBase.getFilters(id?)` is now `getFilters(c, id?)`. Subclasses that override it must accept the context and call `super.getFilters(c, id)`.
- `ServiceBaseTenant` always filters by `c.tenantId` for non-super users (previously RLS alone).
- `MacroPlanGuard` answers an insufficient plan with `403` and `PLAN_UPGRADE_REQUIRED` instead of `426`. Update clients that checked for `426`.
- `update()` with no defined fields throws `400` instead of a driver error.
- `getAll()` / `getById()` results are typed from the selected columns; code that relied on the old loose types may need adjusting.
- The partial-index `WHERE` clause is generated from the column (table-qualified); run `drizzle-kit generate` once, it produces a migration that recreates those indexes.
- `IBaseTable` now requires `updatedAt` (part of `baseColumns` since 1.1).
- `UtilAudit.scrub()` redacts more keys (normalized matching of `password`, `token`, `secret`, `cookie`, `session`, …).
- The package is ESM only (the `require` condition pointed at an ESM file and is gone), requires Bun `>= 1.3`, and the peer ranges are bounded (see [Requirements](#requirements)).
- `TTransaction` is deprecated in favour of `TDbOrTx`.

---

## Development

```bash
bun install --frozen-lockfile
bun run check      # typecheck + lint
bun run test       # PGlite-backed tests, no external services
bun run coverage   # fails below 90 % lines per src/ file
bun run build      # dist/ (ESM + .d.ts)
npm pack --dry-run # dist/, README.md, LICENSE, package.json only
```

## Publishing

Releases are cut by [release-please](https://github.com/googleapis/release-please-action). When a release is created, the workflow first runs the full CI (`check`, `coverage`, `build`, `npm pack --dry-run`) and only then publishes with `npm publish --provenance --access public` (`id-token: write`).

The publish step still authenticates with the `NPM_TOKEN` secret. To remove the long-lived token, configure [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) for `bedest-core` (GitHub Actions, workflow `release-please.yml`), then delete the `NODE_AUTH_TOKEN` line and the `NPM_TOKEN` secret. Until then, use a granular, publish-only automation token and rotate it.
