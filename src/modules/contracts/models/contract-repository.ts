import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { transparencyContract } from "./contract-schema";
import { integrationSync } from "@/shared/lib/integrations/sync-schema";
import type { MunicipalContract } from "./contract-types";
import { recordAdministrativeAudit } from "@/modules/auth/services/audit-service";
export function createContractRepository(database: PostgresJsDatabase) {
  return {
    async list() {
      return (
        await database
          .select({ data: transparencyContract.data })
          .from(transparencyContract)
          .where(eq(transparencyContract.listed, true))
      ).map((row) => row.data);
    },
    async syncState(): Promise<typeof integrationSync.$inferSelect | null> {
      const [state] = await database
        .select()
        .from(integrationSync)
        .where(eq(integrationSync.source, "transparency"));
      return state ?? null;
    },
    async saveSnapshot(contracts: MunicipalContract[], actorId?: string) {
      const now = new Date();
      await database.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(57300422)`);
        await tx.update(transparencyContract).set({ listed: false });
        for (const contract of contracts) {
          await tx
            .insert(transparencyContract)
            .values({
              sourceId: contract.sourceId,
              data: contract,
              listed: true,
              refreshedAt: now,
            })
            .onConflictDoUpdate({
              target: transparencyContract.sourceId,
              set: { data: contract, listed: true, refreshedAt: now },
            });
        }
        await tx
          .insert(integrationSync)
          .values({
            source: "transparency",
            attemptedAt: now,
            succeededAt: now,
            status: "success",
            recordCount: contracts.length,
          })
          .onConflictDoUpdate({
            target: integrationSync.source,
            set: {
              attemptedAt: now,
              succeededAt: now,
              status: "success",
              recordCount: contracts.length,
            },
          });
        await recordAdministrativeAudit(tx, {
          actorId: actorId ?? null,
          operation: "integration.synchronized",
          entityType: "integration",
          entityId: "transparency",
          result: "success",
        });
      });
    },
    async markFailure(actorId?: string) {
      const now = new Date();
      await database.transaction(async (tx) => {
        await tx
          .insert(integrationSync)
          .values({
            source: "transparency",
            attemptedAt: now,
            status: "failed",
          })
          .onConflictDoUpdate({
            target: integrationSync.source,
            set: { attemptedAt: now, status: "failed" },
          });
        await recordAdministrativeAudit(tx, {
          actorId: actorId ?? null,
          operation: "integration.synchronization_failed",
          entityType: "integration",
          entityId: "transparency",
          result: "failed",
        });
      });
    },
  };
}
export type ContractRepository = ReturnType<typeof createContractRepository>;
