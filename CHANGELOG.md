# Changelog

## Unreleased

### ⚠ Breaking changes (2.0.0)

* `ServiceBase.getFilters(id?)` → `getFilters(c, id?)`; `ServiceBaseTenant` always filters by `c.tenantId` for non-super users [CORE-02].
* `MacroPlanGuard`: insufficient plan → `403 { message: "PLAN_UPGRADE_REQUIRED" }` instead of `426` (402 for expired plans unchanged) [CORE-07].
* `update()` with no defined fields → `400` [BUG-02]; `getAll`/`getById` results typed from the selected columns [CORE-01].
* Partial-index predicates are table-qualified (regenerate migrations once) [CORE-03]; `IBaseTable` requires `updatedAt` [CORE-08].
* ESM only, `engines.bun >= 1.2.20`, peers `elysia ^1.3.0` and `drizzle-orm >=0.41.0 <0.46.0` [CORE-04][CORE-05].
* `UtilAudit.scrub()` redacts by normalized key fragments (more keys) [SEC-06].

### Features and fixes

* `TDbOrTx` / `TTx` types; `TTransaction` deprecated [CORE-10]; `VStr(max)` bounded strings.
* `exports` map with a `default` condition (drizzle-kit can load the package) [NEW-05]; `sideEffects: false`, license and repository metadata.
* Publish pipeline runs the full CI before `npm publish --provenance` [OPS-07]; coverage gate ≥ 90 % lines [CORE-11].

## [2.0.0](https://github.com/bedest-hq/bedest-core/compare/v1.0.2...v2.0.0) (2026-11-09)


### ⚠ BREAKING CHANGES

* **release:** getFilters(c, id?) signature, tenant filter in ServiceBaseTenant, plan guard 403 PLAN_UPGRADE_REQUIRED instead of 426, empty update payload 400, typed select results, table-qualified partial index predicates, IBaseTable requires updatedAt, ESM-only exports, Bun >= 1.3 and bounded peer ranges. See README "Upgrading from 1.x".
* **guard:** clients must treat 403 PLAN_UPGRADE_REQUIRED instead of 426 as the upgrade signal.
* **service:** subclasses overriding getFilters must accept the context as first argument.

### Features

* decouple IUserApp from ITenantApp, add updatedAt to baseColumns, and harden service methods ([de6b145](https://github.com/bedest-hq/bedest-core/commit/de6b145ce1c9dcbaa907a316cdad7043bdd5c6bf))
* decouple IUserApp from ITenantApp, add updatedAt to baseColumns… ([9c84668](https://github.com/bedest-hq/bedest-core/commit/9c84668e60b4742c9f2c30694d51dff4bad464bc))
* **service:** tenant filter in ServiceBaseTenant as defense in depth [CORE-02] ([b97a500](https://github.com/bedest-hq/bedest-core/commit/b97a50012fa1b50b359695b038e7fced12838bbf))
* **validation:** add bounded VStr(max, min = 1) helper [CORE-12] ([c86b12b](https://github.com/bedest-hq/bedest-core/commit/c86b12b79973cbdae23cdefd8abce5d673b34b5c))


### Bug Fixes

* **audit:** redact sensitive keys by normalized fragment [SEC-06] ([ce4b627](https://github.com/bedest-hq/bedest-core/commit/ce4b627197f73e4a6d6d3752318369f36ada60ab))
* **guard:** insufficient plan is 403 PLAN_UPGRADE_REQUIRED, with optional cache [CORE-07] ([e0ccea2](https://github.com/bedest-hq/bedest-core/commit/e0ccea2db83052c1259ace2b336ba51b7525c12b))
* **package:** add a default export condition for CommonJS loaders [CORE-04][NEW-05] ([a63e161](https://github.com/bedest-hq/bedest-core/commit/a63e16132eab3f361ecca767b86165c9f84f42ac))
* **package:** bound peer dependency ranges to verified versions [CORE-05] ([40b5fad](https://github.com/bedest-hq/bedest-core/commit/40b5fadbd897dc0dae3bd0d63ee01dadb294ff51))
* **package:** correct exports map and add package metadata [CORE-04] ([160ea8d](https://github.com/bedest-hq/bedest-core/commit/160ea8d2d305e4b67a417873a59b22dfa4947647))
* **package:** require Bun &gt;= 1.2.20, the tested and pinned version [NEW-01] ([6c7f807](https://github.com/bedest-hq/bedest-core/commit/6c7f807808ca9417f5b48b1ae0ca0def02da6976))
* **schema:** partial indexes reference the isDeleted column [CORE-03] ([70839ea](https://github.com/bedest-hq/bedest-core/commit/70839ea782181e945568093441a8134daf5be434))
* **service:** empty update payload is a 400, not a driver error [BUG-02] ([813f7f3](https://github.com/bedest-hq/bedest-core/commit/813f7f3c6ff7efc6a7f2121749fd1622124d4459))
* **service:** id 0 is a valid id [CORE-09] ([f08fcf7](https://github.com/bedest-hq/bedest-core/commit/f08fcf7a9fe0067f8e1af81600a3918dbb140cc3))
* **service:** type getAll/getById results from the selected columns [CORE-01] ([f786ff9](https://github.com/bedest-hq/bedest-core/commit/f786ff9b5286848825bc189eb1aa004a281518c0))
* **types:** IBaseTable includes updatedAt like baseColumns [CORE-08] ([afccc67](https://github.com/bedest-hq/bedest-core/commit/afccc6792215e91f795b74a73c9ddef44fd43517))
* **validation:** bound VEmail to 254 characters [CORE-12][SEC-21] ([8088969](https://github.com/bedest-hq/bedest-core/commit/80889695658188baf0f1fcbc001fa10bee3a2360))


### Miscellaneous Chores

* **release:** bump bedest-core to 2.0.0 ([2ec79e9](https://github.com/bedest-hq/bedest-core/commit/2ec79e9f35e37a77cc2aa576e4bd19a387d56952))

## [1.1.0](https://github.com/bedest-hq/bedest-core/compare/v1.0.2...v1.1.0) (2026-10-09)


### Features

* decouple IUserApp from ITenantApp, add updatedAt to baseColumns, and harden service methods ([de6b145](https://github.com/bedest-hq/bedest-core/commit/de6b145ce1c9dcbaa907a316cdad7043bdd5c6bf))

## [1.0.2](https://github.com/bedest-hq/bedest-core/compare/v1.0.1...v1.0.2) (2026-06-09)


### Bug Fixes

* npm 2fa bypass token updated ([6c0bf32](https://github.com/bedest-hq/bedest-core/commit/6c0bf327890fa2248a86da3ca48dcf3fd180a99b))

## [1.0.1](https://github.com/bedest-hq/bedest-core/compare/v1.0.0...v1.0.1) (2026-06-09)


### Bug Fixes

* publis is moved into the release please ([15c5a61](https://github.com/bedest-hq/bedest-core/commit/15c5a614c8e55adafbe3f8bc6226d3b3dc6d6fd4))

## 1.0.0 (2026-06-09)


### Features

* npm pub ci-cd implementation ([f2b030c](https://github.com/bedest-hq/bedest-core/commit/f2b030cb36928fab035e3747a1e046bbf6bceca2))
* release please implementation ([603f168](https://github.com/bedest-hq/bedest-core/commit/603f168616e102d3e570351b79f0679bbb3db2ec))
