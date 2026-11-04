import { and, asc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { kanbanCard } from "./kanban-schema";
import type { KanbanCard, KanbanMutation } from "./kanban-types";
import { recordAdministrativeAudit } from "@/modules/auth/services/audit-service";
function toCard(row: typeof kanbanCard.$inferSelect): KanbanCard {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}
export function createKanbanRepository(database: PostgresJsDatabase) {
  return {
    async list() {
      return (
        await database
          .select()
          .from(kanbanCard)
          .orderBy(asc(kanbanCard.createdAt), asc(kanbanCard.id))
      ).map(toCard);
    },
    async mutate(
      input: KanbanMutation,
      actorId: string,
    ): Promise<KanbanCard | null> {
      return database.transaction(async (tx) => {
        let changed: typeof kanbanCard.$inferSelect | undefined;
        if (input.action === "create") {
          [changed] = await tx
            .insert(kanbanCard)
            .values({
              title: input.title,
              description: input.description,
              priority: input.priority,
              dueOn: input.dueOn,
              column: input.column,
            })
            .returning();
        } else {
          const values =
            input.action === "edit"
              ? {
                  title: input.title,
                  description: input.description,
                  priority: input.priority,
                  dueOn: input.dueOn,
                }
              : input.action === "move"
                ? { column: input.column }
                : { archived: input.archived };
          [changed] = await tx
            .update(kanbanCard)
            .set({
              ...values,
              updatedAt: new Date(),
              version: sql`${kanbanCard.version}+1`,
            })
            .where(
              and(
                eq(kanbanCard.id, input.id),
                eq(kanbanCard.version, input.version),
                ...(input.action === "archive"
                  ? []
                  : [eq(kanbanCard.archived, false)]),
              ),
            )
            .returning();
        }
        if (!changed) return null;
        await recordAdministrativeAudit(tx, {
          actorId,
          operation: `kanban.${input.action}`,
          entityType: "kanban_card",
          entityId: changed.id,
          result: "success",
        });
        return toCard(changed);
      });
    },
  };
}
export type KanbanRepository = ReturnType<typeof createKanbanRepository>;
