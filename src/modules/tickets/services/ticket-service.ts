import type { TicketRepository } from "../models/ticket-repository";
import type { MunicipalContract } from "@/modules/contracts/models/contract-types";
import type { Principal } from "@/modules/auth/models/access-types";
import { canAccess } from "@/modules/auth/services/access-service";
import { isContractCurrent } from "@/modules/contracts/services/contract-policy";
import { municipalToday } from "@/shared/lib/integrations/normalization";
import { parseGlpiEnvironment } from "./glpi-config";
import { createGlpiAdapter } from "./glpi-adapter";
import { prepareTicketDashboard } from "./ticket-dashboard";
export class TicketBindingError extends Error {}
export function createTicketService(
  repository: TicketRepository,
  contracts: { catalog(): Promise<MunicipalContract[]> },
  environment: Record<string, string | undefined> = process.env,
) {
  return {
    async synchronize(actor?: Principal) {
      if (actor && !canAccess(actor, "integrations:manage"))
        throw new Error("Acesso não autorizado.");
      try {
        const config = parseGlpiEnvironment(environment);
        if (!config.enabled) throw new Error("GLPI não configurado.");
        const captured = await createGlpiAdapter(config).capture();
        await repository.saveSnapshot(
          captured.tickets,
          captured.group,
          actor?.id,
        );
        return { total: captured.tickets.length };
      } catch {
        await repository.markFailure(actor?.id);
        throw new Error(
          "Não foi possível atualizar o GLPI. A captura anterior foi preservada.",
        );
      }
    },
    async dashboard(filters: {
      q: string;
      status: "open" | "all" | "overdue";
      group: string;
      page: number;
    }) {
      let configured = false,
        configurationError = false;
      try {
        configured = parseGlpiEnvironment(environment).enabled;
      } catch {
        configurationError = true;
      }
      const [tickets, catalog, bindings, sync] = await Promise.all([
        repository.list(),
        contracts.catalog(),
        repository.bindings(),
        repository.syncState(),
      ]);
      return {
        ...prepareTicketDashboard(tickets, catalog, bindings, filters),
        configured,
        configurationError,
        contractOptions: catalog
          .filter((contract) => isContractCurrent(contract, municipalToday()))
          .map((contract) => ({
            id: contract.sourceId,
            label: `${contract.number} · ${contract.supplierName}`,
          })),
        sync: sync
          ? {
              status: sync.status,
              succeededAt: sync.succeededAt?.toISOString() ?? null,
            }
          : null,
        groupName: sync?.details.groupName ?? "DSI",
        groupId: sync?.details.groupId ?? null,
      };
    },
    async assignContract(
      actor: Principal,
      ticketId: number,
      contractSourceId: string | null,
    ) {
      if (!canAccess(actor, "integrations:manage"))
        throw new TicketBindingError("Acesso não autorizado.");
      const [tickets, catalog] = await Promise.all([
        repository.list(),
        contracts.catalog(),
      ]);
      if (!tickets.some((ticket) => ticket.sourceId === ticketId))
        throw new TicketBindingError(
          "Chamado não encontrado na captura atual do DSI.",
        );
      if (
        contractSourceId &&
        !catalog.some(
          (contract) =>
            contract.sourceId === contractSourceId &&
            isContractCurrent(contract, municipalToday()),
        )
      )
        throw new TicketBindingError(
          "Selecione um contrato vigente da secretaria.",
        );
      await repository.saveBinding(ticketId, contractSourceId, actor.id);
    },
  };
}
