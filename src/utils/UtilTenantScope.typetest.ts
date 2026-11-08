/**
 * Type-level tests (checked by `bun run typecheck`, excluded from the build)
 * [CORE-10]: `TDbOrTx` is the handle-or-transaction union and scope
 * callbacks receive a transaction. (`TTransaction` is a plain alias of
 * `TDbOrTx`; it is @deprecated, so it is not referenced here.)
 */
import type { TDb } from "../types/TDb";
import { UtilTenantScope, type TDbOrTx, type TTx } from "./UtilTenantScope";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

export type Checks = [
  Expect<Equal<TDbOrTx, TDb | TTx>>,
  Expect<
    Equal<Parameters<Parameters<typeof UtilTenantScope.systemScope>[1]>[0], TTx>
  >,
];

// Helpers typed with the wide union (handle or transaction) fit a callback.
declare const db: TDb;
const helper = async (tx: TDbOrTx) => tx;
export const usesHelper = () => UtilTenantScope.systemScope(db, helper);
