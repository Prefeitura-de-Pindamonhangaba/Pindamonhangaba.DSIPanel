import type { Principal } from "@/modules/auth/models/access-types";
import { canAccess } from "@/modules/auth/services/access-service";
const running = new Set<string>();
export class SynchronizationBusyError extends Error {}
export async function synchronizeIntegration(
  source: "transparency" | "glpi",
  actor: Principal,
  service: { synchronize(actor: Principal): Promise<unknown> },
) {
  if (!canAccess(actor, "integrations:manage"))
    throw new Error("Acesso não autorizado.");
  if (running.has(source))
    throw new SynchronizationBusyError("Uma atualização já está em andamento.");
  running.add(source);
  try {
    return await service.synchronize(actor);
  } finally {
    running.delete(source);
  }
}
