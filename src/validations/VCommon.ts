import { t } from "elysia";

export const VId = t.String({ format: "uuid" });

// RFC 5321 limits an address to 254 characters [SEC-21][CORE-12].
export const VEmail = t.String({ format: "email", maxLength: 254 });

export const VNumber = t.Number({ minimum: 0 });

export const VString = t.String({ minLength: 1 });

export const VQuery = t.Object({
  limit: t.Numeric({ default: 20, minimum: 1, maximum: 100 }),
  page: t.Numeric({ default: 1, minimum: 1 }),
});
