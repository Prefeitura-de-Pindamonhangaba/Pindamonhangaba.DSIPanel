import type { ContractRepository } from "../models/contract-repository";
import { createTransparencyAdapter } from "./transparency-adapter";
import { isContractCurrent, orderContractDocuments } from "./contract-policy";
import {
  municipalToday,
  normalizeName,
} from "@/shared/lib/integrations/normalization";
import { canAccess } from "@/modules/auth/services/access-service";
import type { Principal } from "@/modules/auth/models/access-types";

export function createContractService(
  repository: ContractRepository,
  adapter = createTransparencyAdapter(),
) {
  return {
    async synchronize(actor?: Principal) {
      if (actor && !canAccess(actor, "integrations:manage"))
        throw new Error("Acesso não autorizado.");
      try {
        const result = await adapter.capture(municipalToday());
        await repository.saveSnapshot(result.contracts, actor?.id);
        return {
          examined: result.examined,
          department: result.departmentCount,
          current: result.currentCount,
        };
      } catch {
        await repository.markFailure(actor?.id);
        throw new Error(
          "Não foi possível atualizar os contratos. A última captura foi preservada.",
        );
      }
    },
    async catalog() {
      return repository.list();
    },
    async listCurrent(query = "") {
      const today = municipalToday();
      const [catalog, sync] = await Promise.all([
        repository.list(),
        repository.syncState(),
      ]);
      const current = catalog.filter((contract) =>
        isContractCurrent(contract, today),
      );
      const needle = normalizeName(query);
      return {
        contracts: current
          .filter((contract) =>
            normalizeName(
              `${contract.number} ${contract.supplierName} ${contract.object}`,
            ).includes(needle),
          )
          .sort((a, b) => a.endsOn!.localeCompare(b.endsOn!))
          .map((contract) => ({
            ...contract,
            documents: orderContractDocuments(contract.documents),
          })),
        summary: {
          total: current.length,
          suppliers: new Set(
            current.map(
              (contract) =>
                contract.supplierDocument ??
                normalizeName(contract.supplierName),
            ),
          ).size,
          expiringSoon: current.filter(
            (contract) =>
              (Date.parse(contract.endsOn!) - Date.parse(today)) / 86400000 <=
              90,
          ).length,
        },
        sync: sync
          ? {
              status: sync.status,
              succeededAt: sync.succeededAt?.toISOString() ?? null,
            }
          : null,
      };
    },
  };
}
