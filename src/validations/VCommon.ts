import { t } from "elysia";

export const VId = t.String({ format: "uuid" });

// RFC 5321 limits an address to 254 characters [SEC-21][CORE-12].
export const VEmail = t.String({ format: "email", maxLength: 254 });

export const VNumber = t.Number({ minimum: 0 });

/**
 * A bounded string: `min` (default 1) to `max` characters [CORE-12].
 * Every route field written to a `varchar(n)` column MUST use `VStr(n)` so
 * an oversized value is a 422, never a database error.
 */
export const VStr = (max: number, min = 1) => {
  if (!Number.isInteger(max) || !Number.isInteger(min) || min < 0 || max < 1 || min > max) {
    throw new RangeError(`VStr: invalid bounds (min ${String(min)}, max ${String(max)})`);
  }
  return t.String({ minLength: min, maxLength: max });
};

/**
 * Non-empty and unbounded; kept for backward compatibility. Do not use it
 * for fields stored in `varchar(n)`: use `VStr(n)` [CORE-12].
 */
export const VString = t.String({ minLength: 1 });

export const VQuery = t.Object({
  limit: t.Numeric({ default: 20, minimum: 1, maximum: 100 }),
  page: t.Numeric({ default: 1, minimum: 1 }),
});
