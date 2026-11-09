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
