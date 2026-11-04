import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { KanbanColumn, KanbanPriority } from "./kanban-types";
export const kanbanCard = pgTable(
  "kanban_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    column: text("column").$type<KanbanColumn>().notNull().default("todo"),
    priority: text("priority")
      .$type<KanbanPriority>()
      .notNull()
      .default("normal"),
    dueOn: date("due_on"),
    archived: boolean("archived").notNull().default(false),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("kanban_cards_board_idx").on(
      table.archived,
      table.column,
      table.createdAt,
    ),
    check(
      "kanban_cards_column_check",
      sql`${table.column} in ('todo','doing','review','done')`,
    ),
    check(
      "kanban_cards_priority_check",
      sql`${table.priority} in ('low','normal','high')`,
    ),
    check(
      "kanban_cards_title_check",
      sql`char_length(trim(${table.title})) between 1 and 160`,
    ),
    check(
      "kanban_cards_description_check",
      sql`char_length(${table.description}) <= 4000`,
    ),
    check("kanban_cards_version_check", sql`${table.version} > 0`),
  ],
);
