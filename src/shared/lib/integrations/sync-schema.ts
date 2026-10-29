import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
export const integrationSync = pgTable("integration_syncs", {
  source: text("source").primaryKey(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull(),
  succeededAt: timestamp("succeeded_at", { withTimezone: true }),
  status: text("status").notNull(),
  recordCount: integer("record_count").default(0).notNull(),
  details: jsonb("details")
    .$type<{ groupId?: number; groupName?: string }>()
    .default({})
    .notNull(),
});
