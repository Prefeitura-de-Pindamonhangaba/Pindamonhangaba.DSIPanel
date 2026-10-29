import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { MunicipalContract } from "./contract-types";
export const transparencyContract = pgTable("transparency_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: text("source_id").notNull().unique(),
  data: jsonb("data").$type<MunicipalContract>().notNull(),
  listed: boolean("listed").default(true).notNull(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
});
