import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { glpiTicket, ticketContractBinding } from "./ticket-schema";
import { integrationSync } from "@/shared/lib/integrations/sync-schema";
import { recordAdministrativeAudit } from "@/modules/auth/services/audit-service";
import type { DsiTicket } from "./ticket-types";
export function createTicketRepository(database: PostgresJsDatabase) {
  return {
    async list() {
      return (
        await database
          .select({ data: glpiTicket.data })
          .from(glpiTicket)
          .where(eq(glpiTicket.listed, true))
      ).map((row) => row.data);
    },
    async bindings() {
      return database
        .select({
          ticketId: ticketContractBinding.ticketId,
          contractSourceId: ticketContractBinding.contractSourceId,
        })
        .from(ticketContractBinding);
    },
    async syncState(): Promise<typeof integrationSync.$inferSelect | null> {
      const [state] = await database
        .select()
        .from(integrationSync)
        .where(eq(integrationSync.source, "glpi"));
      return state ?? null;
    },
    async saveSnapshot(
      tickets: DsiTicket[],
      group: { id: number; name: string },
      actorId?: string,
    ) {
      const now = new Date();
      await database.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(57300423)`);
        await tx.update(glpiTicket).set({ listed: false });
        for (const ticket of tickets)
          await tx
            .insert(glpiTicket)
            .values({
              sourceId: ticket.sourceId,
              data: ticket,
              listed: true,
              refreshedAt: now,
            })
            .onConflictDoUpdate({
              target: glpiTicket.sourceId,
              set: { data: ticket, listed: true, refreshedAt: now },
            });
        const values = {
          attemptedAt: now,
          succeededAt: now,
          status: "success",
          recordCount: tickets.length,
          details: { groupId: group.id, groupName: group.name },
        };
        await tx
          .insert(integrationSync)
          .values({ source: "glpi", ...values })
          .onConflictDoUpdate({ target: integrationSync.source, set: values });
        await recordAdministrativeAudit(tx, {
          actorId: actorId ?? null,
          operation: "integration.synchronized",
          entityType: "integration",
          entityId: "glpi",
          result: "success",
        });
      });
    },
    async markFailure(actorId?: string) {
      const now = new Date();
      await database.transaction(async (tx) => {
        await tx
          .insert(integrationSync)
          .values({ source: "glpi", attemptedAt: now, status: "failed" })
          .onConflictDoUpdate({
            target: integrationSync.source,
            set: { attemptedAt: now, status: "failed" },
          });
        await recordAdministrativeAudit(tx, {
          actorId: actorId ?? null,
          operation: "integration.synchronization_failed",
          entityType: "integration",
          entityId: "glpi",
          result: "failed",
        });
      });
    },
    async saveBinding(
      ticketId: number,
      contractSourceId: string | null,
      actorId: string,
    ) {
      await database.transaction(async (tx) => {
        if (contractSourceId)
          await tx
            .insert(ticketContractBinding)
            .values({
              ticketId,
              contractSourceId,
              actorId,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: ticketContractBinding.ticketId,
              set: { contractSourceId, actorId, updatedAt: new Date() },
            });
        else
          await tx
            .delete(ticketContractBinding)
            .where(eq(ticketContractBinding.ticketId, ticketId));
        await recordAdministrativeAudit(tx, {
          actorId,
          operation: contractSourceId
            ? "ticket.contract_linked"
            : "ticket.contract_unlinked",
          entityType: "ticket",
          entityId: String(ticketId),
          result: "success",
        });
      });
    },
  };
}
export type TicketRepository = ReturnType<typeof createTicketRepository>;
