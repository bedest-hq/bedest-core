import type { TDb } from "../types/TDb";
import type { ISession } from "./ISession";

export interface IApp {
  db: TDb;
  nowDatetime: Date;
}

export interface IUserApp extends IApp {
  session: ISession;
}

export interface ITenantApp extends IApp {
  tenantId: string;
}

export interface ITenantUserApp extends IUserApp, ITenantApp {}

