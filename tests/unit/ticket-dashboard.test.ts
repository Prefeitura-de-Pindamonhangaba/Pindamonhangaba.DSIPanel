import { expect, test } from "bun:test";
import { contractFixture, ticketFixture } from "../fixtures/integration-data";
import { prepareTicketDashboard } from "../../src/modules/tickets/services/ticket-dashboard";
import {
  matchTicketContract,
  ticketSlaState,
} from "../../src/modules/tickets/services/ticket-policy";
import { parseGlpiDate } from "../../src/modules/tickets/services/glpi-date";
import { parseGlpiEnvironment } from "../../src/modules/tickets/services/glpi-config";
const today = "2026-10-29",
  now = new Date(`${today}T12:00:00Z`);
test("vínculo prioriza contrato explícito e manual, preservando ambiguidades", () => {
  const first = contractFixture(),
    second = contractFixture({ sourceId: "101", number: "002 / 2026" });
  expect(matchTicketContract(ticketFixture(), [first], today).reason).toBe(
    "supplier",
  );
  expect(
    matchTicketContract(ticketFixture(), [first, second], today).reason,
  ).toBe("ambiguous");
  expect(
    matchTicketContract(
      ticketFixture({
        contracts: [{ id: 5, number: "0001/2026", name: "Fictício" }],
      }),
      [first, second],
      today,
    ).contract?.sourceId,
  ).toBe("100");
  expect(
    matchTicketContract(ticketFixture(), [first, second], today, "101").contract
      ?.sourceId,
  ).toBe("101");
  expect(
    matchTicketContract(
      ticketFixture({
        suppliers: [
          { id: 1, name: first.supplierName, document: "99999999000199" },
        ],
      }),
      [first],
      today,
    ).contract,
  ).toBeNull();
});
test("dashboard conta cada chamado uma vez e distingue pendência, sem SLA e fechados", () => {
  const tickets = [
    ticketFixture(),
    ticketFixture({ sourceId: 11, status: 4 }),
    ticketFixture({
      sourceId: 12,
      resolutionSlaId: 0,
      resolutionOverdue: true,
      suppliers: [],
    }),
    ticketFixture({
      sourceId: 13,
      status: 6,
      solvedAt: "2026-10-28T12:00:00Z",
    }),
  ];
  const result = prepareTicketDashboard(
    tickets,
    [contractFixture()],
    [],
    { q: "", status: "open", group: "", page: 1 },
    now,
  );
  expect(result.summary.open).toBe(3);
  expect(result.summary.overdue).toBe(1);
  expect(result.summary.pending).toBe(1);
  expect(result.summary.withoutSla).toBe(1);
  expect(result.summary.solved30Days).toBe(1);
  expect(result.groups.reduce((sum, group) => sum + group.open, 0)).toBe(3);
  expect(result.tickets).toHaveLength(3);
  expect(ticketSlaState(tickets[1])).toBe("pending");
  expect(ticketSlaState(tickets[2])).toBe("not_configured");
});
test("GLPI desabilitado não pede credenciais e datas usam o fuso configurado", () => {
  expect(parseGlpiEnvironment({}).enabled).toBe(false);
  expect(() => parseGlpiEnvironment({ GLPI_APP_TOKEN: "partial" })).toThrow(
    "Configuração GLPI",
  );
  expect(parseGlpiDate("2026-10-29 09:00:00", "America/Sao_Paulo")).toBe(
    "2026-10-29T12:00:00.000Z",
  );
  expect(() =>
    parseGlpiDate("2026-02-31 09:00:00", "America/Sao_Paulo"),
  ).toThrow();
});
