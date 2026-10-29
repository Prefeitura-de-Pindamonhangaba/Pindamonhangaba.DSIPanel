import type { DsiTicket } from "../models/ticket-types";
import type { MunicipalContract } from "@/modules/contracts/models/contract-types";
import { normalizeName } from "@/shared/lib/integrations/normalization";
import { isContractCurrent } from "@/modules/contracts/services/contract-policy";
export function isOpenTicket(ticket: Pick<DsiTicket, "status">) {
  return [1, 2, 3, 4].includes(ticket.status);
}
export function hasSla(ticket: DsiTicket) {
  return ticket.resolutionSlaId > 0 || ticket.ownershipSlaId > 0;
}
export function isSlaOverdue(ticket: DsiTicket) {
  return (
    ticket.status !== 4 &&
    ((ticket.resolutionSlaId > 0 && ticket.resolutionOverdue === true) ||
      (ticket.ownershipSlaId > 0 && ticket.ownershipOverdue === true))
  );
}
export function ticketSlaState(ticket: DsiTicket) {
  if (!hasSla(ticket)) return "not_configured" as const;
  if (ticket.status === 4) return "pending" as const;
  if (isSlaOverdue(ticket)) return "overdue" as const;
  if (
    (ticket.resolutionSlaId > 0 && ticket.resolutionOverdue === null) ||
    (ticket.ownershipSlaId > 0 && ticket.ownershipOverdue === null)
  )
    return "unknown" as const;
  return "on_time" as const;
}
export function contractNumber(value: string) {
  const match = value.toUpperCase().match(/\b0*(\d+[A-Z]?)\s*\/\s*(\d{4})\b/);
  return match ? `${match[1]}/${match[2]}` : null;
}
export function matchTicketContract(
  ticket: DsiTicket,
  catalog: MunicipalContract[],
  today: string,
  manual?: string,
) {
  if (manual) {
    const contract = catalog.find((item) => item.sourceId === manual);
    return {
      contract: contract ?? null,
      reason: contract ? ("manual" as const) : ("unassigned" as const),
    };
  }
  const numbers = ticket.contracts
    .map((item) => contractNumber(item.number))
    .filter((value) => value !== null);
  const direct = catalog.filter((contract) => {
    const number = contractNumber(contract.number);
    return number !== null && numbers.includes(number);
  });
  if (direct.length === 1)
    return { contract: direct[0], reason: "glpi" as const };
  if (direct.length > 1)
    return { contract: null, reason: "ambiguous" as const };
  const current = catalog.filter((contract) =>
    isContractCurrent(contract, today),
  );
  const documents = ticket.suppliers
    .map((supplier) => supplier.document)
    .filter((value) => value !== null);
  const byDocument = current.filter(
    (contract) =>
      contract.supplierDocument &&
      documents.includes(contract.supplierDocument),
  );
  const names = ticket.suppliers
    .filter((supplier) => !supplier.document)
    .map((supplier) => normalizeName(supplier.name))
    .filter(Boolean);
  const matches = byDocument.length
    ? byDocument
    : current.filter((contract) =>
        names.includes(normalizeName(contract.supplierName)),
      );
  if (matches.length === 1)
    return { contract: matches[0], reason: "supplier" as const };
  return {
    contract: null,
    reason:
      matches.length > 1 ? ("ambiguous" as const) : ("unassigned" as const),
  };
}
