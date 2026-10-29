import type { DsiTicket } from "../models/ticket-types";
import type { MunicipalContract } from "@/modules/contracts/models/contract-types";
import {
  municipalToday,
  normalizeName,
} from "@/shared/lib/integrations/normalization";
import {
  hasSla,
  isOpenTicket,
  isSlaOverdue,
  matchTicketContract,
  ticketSlaState,
} from "./ticket-policy";
export function prepareTicketDashboard(
  tickets: DsiTicket[],
  catalog: MunicipalContract[],
  bindings: { ticketId: number; contractSourceId: string }[],
  filters: {
    q: string;
    status: "open" | "all" | "overdue";
    group: string;
    page: number;
  },
  now = new Date(),
) {
  const manual = new Map(
    bindings.map((binding) => [binding.ticketId, binding.contractSourceId]),
  );
  const today = municipalToday(now);
  const rows = tickets.map((ticket) => {
    const match = matchTicketContract(
      ticket,
      catalog,
      today,
      manual.get(ticket.sourceId),
    );
    const groupKey = match.contract
      ? `contract:${match.contract.sourceId}`
      : ticket.suppliers.length
        ? `supplier:${ticket.suppliers
            .map((supplier) => supplier.id)
            .sort((a, b) => a - b)
            .join(",")}`
        : "unassigned";
    return {
      ...ticket,
      contract: match.contract
        ? {
            sourceId: match.contract.sourceId,
            number: match.contract.number,
            supplierName: match.contract.supplierName,
          }
        : null,
      matchReason: match.reason,
      manualContract: manual.get(ticket.sourceId) ?? null,
      overdue: isSlaOverdue(ticket),
      slaState: ticketSlaState(ticket),
      groupKey,
    };
  });
  const open = rows.filter(isOpenTicket);
  const recentSolved = rows.filter(
    (ticket) =>
      [5, 6].includes(ticket.status) &&
      ticket.solvedAt &&
      Date.parse(ticket.solvedAt) >= now.getTime() - 30 * 86400000,
  );
  const groups = new Map<
    string,
    {
      key: string;
      title: string;
      supplier: string;
      open: number;
      overdue: number;
      total: number;
    }
  >();
  for (const ticket of rows) {
    const group = groups.get(ticket.groupKey) ?? {
      key: ticket.groupKey,
      title: ticket.contract
        ? `Contrato ${ticket.contract.number}`
        : ticket.suppliers.map((supplier) => supplier.name).join(" / ") ||
          "Sem contrato ou fornecedor",
      supplier:
        ticket.contract?.supplierName ??
        ticket.suppliers.map((supplier) => supplier.name).join(" / "),
      open: 0,
      overdue: 0,
      total: 0,
    };
    group.total++;
    if (isOpenTicket(ticket)) {
      group.open++;
      if (ticket.overdue) group.overdue++;
    }
    groups.set(group.key, group);
  }
  const needle = normalizeName(filters.q);
  const filtered = rows
    .filter(
      (ticket) =>
        (filters.status === "all" ||
          (isOpenTicket(ticket) &&
            (filters.status !== "overdue" || ticket.overdue))) &&
        (!filters.group || filters.group === ticket.groupKey) &&
        (!needle ||
          normalizeName(
            `${ticket.sourceId} ${ticket.title} ${ticket.suppliers.map((supplier) => supplier.name).join(" ")} ${ticket.contract?.number ?? ""}`,
          ).includes(needle)),
    )
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        b.priority - a.priority ||
        a.openedAt.localeCompare(b.openedAt),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 50)),
    page = Math.min(filters.page, pages);
  return {
    summary: {
      total: rows.length,
      open: open.length,
      overdue: open.filter((ticket) => ticket.overdue).length,
      pending: open.filter((ticket) => ticket.status === 4).length,
      highPriority: open.filter((ticket) => ticket.priority >= 4).length,
      withoutSla: open.filter((ticket) => !hasSla(ticket)).length,
      slaUnknown: open.filter(
        (ticket) =>
          (ticket.resolutionSlaId > 0 && ticket.resolutionOverdue === null) ||
          (ticket.ownershipSlaId > 0 && ticket.ownershipOverdue === null),
      ).length,
      unlinked: open.filter((ticket) => !ticket.contract).length,
      solved30Days: recentSolved.length,
      averageAgeDays: open.length
        ? Math.round(
            open.reduce(
              (sum, ticket) =>
                sum +
                Math.max(
                  0,
                  (now.getTime() - Date.parse(ticket.openedAt)) / 86400000,
                ),
              0,
            ) / open.length,
          )
        : null,
    },
    groups: [...groups.values()].sort(
      (a, b) => b.open - a.open || b.overdue - a.overdue,
    ),
    tickets: filtered.slice((page - 1) * 50, page * 50),
    pagination: { page, pages, total: filtered.length },
  };
}
