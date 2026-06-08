import { t } from "elysia";

export const VId = t.String({ format: "uuid" });

export const VEmail = t.String({ format: "email" });

export const VNumber = t.Number({ minimum: 0 });

export const VString = t.String({ minLength: 1 });

export const VQuery = t.Object({
  limit: t.Numeric({ default: 20, minimum: 1, maximum: 100 }),
  page: t.Numeric({ default: 1, minimum: 1 }),
});
