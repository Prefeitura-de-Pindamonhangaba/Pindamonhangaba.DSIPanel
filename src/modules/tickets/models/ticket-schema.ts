import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { DsiTicket } from "./ticket-types";
import { transparencyContract } from "@/modules/contracts/models/contract-schema";
import { user } from "@/modules/auth/models/auth-schema";
export const glpiTicket = pgTable("glpi_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: integer("source_id").notNull().unique(),
  data: jsonb("data").$type<DsiTicket>().notNull(),
  listed: boolean("listed").default(true).notNull(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
});
export const ticketContractBinding = pgTable("ticket_contract_bindings", {
  ticketId: integer("ticket_id")
    .primaryKey()
    .references(() => glpiTicket.sourceId),
  contractSourceId: text("contract_source_id")
    .notNull()
    .references(() => transparencyContract.sourceId),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
