import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { authAuditEvent } from "../models/auth-schema";
export async function recordAdministrativeAudit(
  database: Pick<PostgresJsDatabase, "insert">,
  event: {
    actorId: string | null;
    operation: string;
    entityType: string;
    entityId: string;
    result: "success" | "failed";
  },
) {
  await database.insert(authAuditEvent).values({
    actorId: event.actorId,
    userId: event.actorId,
    operation: event.operation,
    entityType: event.entityType,
    entityId: event.entityId,
    result: event.result,
  });
}
