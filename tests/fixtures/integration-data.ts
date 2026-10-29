import type { MunicipalContract } from "../../src/modules/contracts/models/contract-types";
import type { DsiTicket } from "../../src/modules/tickets/models/ticket-types";
export function contractFixture(
  overrides: Partial<MunicipalContract> = {},
): MunicipalContract {
  return {
    sourceId: "100",
    number: "001 / 2026",
    object: "Serviço fictício de suporte de sistemas para testes.",
    department: "SECRETARIA MUNICIPAL DE TECNOLOGIA, INOVAÇÃO E PROJETOS",
    supplierName: "Fornecedor Fictício LTDA",
    supplierDocument: "12345678000190",
    startsOn: "2026-01-01",
    endsOn: "2030-12-31",
    status: "Em andamento",
    totalValue: "123456.78",
    procurement: "123 / 2026",
    procurementType: "Pregão Eletrônico - 1 / 2026",
    procurementId: "200",
    documents: [
      {
        id: "document-1",
        title: "Contrato fictício",
        filename: "contrato.pdf",
        url: "https://portal.example.test/contrato.pdf",
        kind: "contract",
        publishedAt: "2026-01-01",
      },
      {
        id: "document-2",
        title: "Edital completo fictício",
        filename: "edital.pdf",
        url: "https://portal.example.test/edital.pdf",
        kind: "notice",
        publishedAt: "2026-01-01",
      },
    ],
    sourceUrl: "https://portal.example.test/contracts/100",
    issues: [],
    ...overrides,
  };
}
export function ticketFixture(overrides: Partial<DsiTicket> = {}): DsiTicket {
  return {
    sourceId: 10,
    title: "Chamado fictício de teste",
    status: 2,
    priority: 4,
    openedAt: "2026-10-01T12:00:00Z",
    updatedAt: "2026-10-29T12:00:00Z",
    solvedAt: null,
    resolutionDueAt: "2026-10-27T12:00:00Z",
    ownershipDueAt: null,
    resolutionSlaId: 1,
    ownershipSlaId: 0,
    resolutionOverdue: true,
    ownershipOverdue: false,
    groupRoles: ["assigned", "observer"],
    suppliers: [
      { id: 1, name: "Fornecedor Fictício LTDA", document: "12345678000190" },
    ],
    contracts: [],
    url: "https://glpi.example.test/front/ticket.form.php?id=10",
    ...overrides,
  };
}
