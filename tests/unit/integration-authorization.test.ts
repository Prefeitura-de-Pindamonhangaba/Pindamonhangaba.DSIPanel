import { afterAll, expect, mock, test } from "bun:test";
mock.module("server-only", () => ({}));
const { synchronizeIntegrationController } =
  await import("../../src/modules/dashboard/controllers/integration-sync-controller");
const { bindTicketContractController } =
  await import("../../src/modules/tickets/controllers/ticket-binding-controller");
const { synchronizeIntegration, SynchronizationBusyError } =
  await import("../../src/modules/dashboard/services/integration-sync-service");
const old = process.env.KEYCLOAK_ENABLED;
const oldBypass = process.env.AUTH_BYPASS_ENABLED;
afterAll(() => {
  if (oldBypass === undefined) delete process.env.AUTH_BYPASS_ENABLED;
  else process.env.AUTH_BYPASS_ENABLED = oldBypass;
  if (old === undefined) delete process.env.KEYCLOAK_ENABLED;
  else process.env.KEYCLOAK_ENABLED = old;
});
test("integrações e vínculos são negados antes de qualquer consulta sem autenticação", async () => {
  process.env.KEYCLOAK_ENABLED = "false";
  process.env.AUTH_BYPASS_ENABLED = "false";
  const request = () =>
    new Request("https://panel.example.test/api/integrations/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"source":"transparency"}',
    });
  expect((await synchronizeIntegrationController(request())).status).toBe(401);
  expect((await bindTicketContractController(request())).status).toBe(401);
});
test("sincronizações concorrentes da mesma fonte são recusadas e o bloqueio é liberado", async () => {
  const actor = {
    id: "fictitious",
    name: "Teste",
    enabled: true,
    permissions: ["integrations:manage"],
  };
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = synchronizeIntegration("transparency", actor, {
    synchronize: async () => pending,
  });
  await expect(
    synchronizeIntegration("transparency", actor, {
      synchronize: async () => undefined,
    }),
  ).rejects.toBeInstanceOf(SynchronizationBusyError);
  release();
  await first;
  expect(
    await synchronizeIntegration("transparency", actor, {
      synchronize: async () => "ok",
    }),
  ).toBe("ok");
  await expect(
    synchronizeIntegration(
      "transparency",
      { ...actor, permissions: [] },
      { synchronize: async () => "forbidden" },
    ),
  ).rejects.toThrow("Acesso não autorizado");
});
