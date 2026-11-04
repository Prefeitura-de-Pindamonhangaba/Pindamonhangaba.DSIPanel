import { expect, test } from "bun:test";
import { createKanbanService } from "../../src/modules/kanban/services/kanban-service";
import type { KanbanRepository } from "../../src/modules/kanban/models/kanban-repository";
import type { KanbanCard } from "../../src/modules/kanban/models/kanban-types";
import { getTestPrincipal } from "../../src/modules/auth/services/test-access-service";
const actor = {
  id: crypto.randomUUID(),
  name: "Operador",
  enabled: true,
  permissions: ["dashboard:read", "kanban:write"],
};
const valid = {
  action: "create",
  title: " Revisar serviço ",
  description: "Detalhes",
  column: "todo",
  priority: "normal",
  dueOn: null,
};
const card: KanbanCard = {
  id: crypto.randomUUID(),
  title: "Revisar serviço",
  description: "Detalhes",
  column: "todo",
  priority: "normal",
  dueOn: null,
  archived: false,
  version: 1,
  updatedAt: new Date().toISOString(),
};
test("kanban impede escrita de visitantes e modo de teste antes de acessar o banco", async () => {
  let calls = 0;
  const repository: KanbanRepository = {
    list: async () => [],
    mutate: async () => {
      calls++;
      return card;
    },
  };
  const service = createKanbanService(repository);
  await expect(service.mutate(getTestPrincipal(), valid)).rejects.toThrow(
    "permissão",
  );
  await expect(
    service.mutate({ ...actor, enabled: false }, valid),
  ).rejects.toThrow("permissão");
  expect(calls).toBe(0);
});
test("kanban valida campos e rejeita etapas, versões e datas inválidas", async () => {
  let calls = 0;
  const service = createKanbanService({
    list: async () => [],
    mutate: async (input) => {
      calls++;
      expect(input.action).toBe("create");
      if (input.action === "create")
        expect(input.title).toBe("Revisar serviço");
      return card;
    },
  });
  for (const input of [
    { ...valid, title: " " },
    { ...valid, column: "unknown" },
    { ...valid, dueOn: "2026-02-30" },
    { ...valid, description: "x".repeat(4001) },
    { ...valid, extra: true },
    { action: "move", id: card.id, version: 0, column: "done" },
  ])
    await expect(service.mutate(actor, input)).rejects.toThrow("Confira");
  expect(calls).toBe(0);
  await service.mutate(actor, valid);
  expect(calls).toBe(1);
});
test("conflito de edição mantém o erro explícito e não informa sucesso", async () => {
  const service = createKanbanService({
    list: async () => [],
    mutate: async () => null,
  });
  await expect(
    service.mutate(actor, {
      action: "move",
      id: card.id,
      version: 1,
      column: "review",
    }),
  ).rejects.toThrow("outra pessoa");
});
