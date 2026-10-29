import { expect, test } from "bun:test";
import { createGlpiAdapter } from "../../src/modules/tickets/services/glpi-adapter";
import { parseGlpiEnvironment } from "../../src/modules/tickets/services/glpi-config";
const settings = {
  GLPI_API_URL: "https://glpi.example.test/apirest.php/",
  GLPI_APP_TOKEN: "fictitious-app",
  GLPI_USER_TOKEN: "fictitious-user",
};
function mockGlpi(mode: "valid" | "failed" | "duplicate-group" = "valid") {
  const calls: string[] = [];
  const fetcher = Object.assign(
    async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const url = new URL(String(input)),
        path = url.pathname.replace("/apirest.php/", "");
      calls.push(path);
      const headers = new Headers(init?.headers);
      expect(headers.get("App-Token")).toBe("fictitious-app");
      if (path === "initSession") {
        expect(headers.get("Authorization")).toBe("user_token fictitious-user");
        return Response.json({ session_token: "fictitious-session" });
      }
      expect(headers.has("Authorization")).toBe(false);
      expect(headers.get("Session-Token")).toBe("fictitious-session");
      if (path === "killSession") return Response.json(true);
      if (path === "Group")
        return Response.json(
          mode === "duplicate-group"
            ? [
                { id: 1, name: "DSI" },
                { id: 2, name: "DSI" },
              ]
            : [{ id: 1, name: "DSI" }],
        );
      if (path === "Group/1/Group_Ticket") {
        const first = url.searchParams.get("range") === "0-99";
        return Response.json(
          first
            ? [
                { groups_id: 1, tickets_id: 10, type: 2 },
                { groups_id: 1, tickets_id: 10, type: 3 },
              ]
            : [
                { groups_id: 1, tickets_id: 11, type: 3 },
                { groups_id: 1, tickets_id: 12, type: 1 },
              ],
          {
            status: first ? 206 : 200,
            headers: { "Content-Range": first ? "0-1/4" : "2-3/4" },
          },
        );
      }
      if (path === "listSearchOptions/Ticket")
        return Response.json({
          "8": { table: "glpi_groups", field: "completename" },
          "65": { table: "glpi_groups", field: "completename" },
          "82": { table: "glpi_tickets", field: "sla_ttr_is_late" },
          "159": { table: "glpi_tickets", field: "sla_tto_is_late" },
        });
      if (path === "search/Ticket") {
        expect(url.searchParams.get("criteria[1][link]")).toBe("OR");
        expect(url.searchParams.get("criteria[1][field]")).toBe("65");
        return Response.json({
          totalcount: 3,
          data: [
            { "2": 10, "82": 1, "159": 0 },
            { "2": 11, "82": "Sim", "159": "Não" },
            { "2": 12, "82": 1, "159": 0 },
          ],
        });
      }
      if (path === "Ticket/10" || path === "Ticket/11") {
        const id = Number(path.split("/")[1]);
        return Response.json({
          id,
          name: `Chamado fictício ${id}`,
          status: id === 10 ? 2 : 4,
          priority: 4,
          date: "2026-10-01 09:00:00",
          date_mod: "2026-10-29 09:00:00",
          solvedate: null,
          time_to_resolve: "2026-10-28 09:00:00",
          time_to_own: null,
          slas_id_ttr: 1,
          slas_id_tto: 0,
          is_deleted: 0,
          content: "Conteúdo privado que não deve ser persistido",
          users_id_recipient: 777,
          _contracts: id === 10 ? [{ contracts_id: 5 }] : [],
        });
      }
      if (
        path === "Ticket/10/Supplier_Ticket" ||
        path === "Ticket/11/Supplier_Ticket"
      ) {
        if (mode === "failed")
          return Response.json({ error: "permission denied" }, { status: 403 });
        return Response.json([
          { tickets_id: Number(path.split("/")[1]), suppliers_id: 1, type: 2 },
        ]);
      }
      if (path === "Supplier/1")
        return Response.json({
          id: 1,
          name: "Fornecedor fictício",
          registration_number: "12.345.678/0001-90",
        });
      if (path === "Contract/5")
        return Response.json({
          id: 5,
          name: "Contrato fictício",
          num: "001/2026",
        });
      throw new Error(`Requisição inesperada: ${path}`);
    },
    { preconnect: fetch.preconnect },
  );
  const config = parseGlpiEnvironment(settings);
  if (!config.enabled) throw new Error("Configuração fictícia inválida.");
  return { calls, adapter: createGlpiAdapter(config, fetcher) };
}
test("GLPI pagina relações, inclui atribuído/observador e exclui solicitante apenas", async () => {
  const mock = mockGlpi();
  const result = await mock.adapter.capture();
  expect(result.tickets).toHaveLength(2);
  expect(result.tickets[0].groupRoles).toEqual(["assigned", "observer"]);
  expect(result.tickets[1].groupRoles).toEqual(["observer"]);
  expect(result.tickets[0].contracts[0].number).toBe("001/2026");
  expect(result.tickets[0].suppliers[0].document).toBe("12345678000190");
  expect(result.tickets[0].openedAt).toBe("2026-10-01T12:00:00.000Z");
  expect(JSON.stringify(result.tickets)).not.toContain("Conteúdo privado");
  expect(JSON.stringify(result.tickets)).not.toContain("users_id_recipient");
  expect(
    mock.calls.filter((call) => call === "Group/1/Group_Ticket"),
  ).toHaveLength(2);
  expect(mock.calls.filter((call) => call === "Supplier/1")).toHaveLength(1);
  expect(mock.calls).not.toContain("Ticket/12");
  expect(mock.calls.at(-1)).toBe("killSession");
});
test("falha de permissão interrompe captura e encerra a sessão do GLPI", async () => {
  const mock = mockGlpi("failed");
  await expect(mock.adapter.capture()).rejects.toThrow("GLPI");
  expect(mock.calls.at(-1)).toBe("killSession");
});
test("grupo DSI ambíguo exige identificar o grupo na configuração", async () => {
  const mock = mockGlpi("duplicate-group");
  await expect(mock.adapter.capture()).rejects.toThrow("GLPI");
  expect(mock.calls).not.toContain("search/Ticket");
  expect(mock.calls.at(-1)).toBe("killSession");
});
