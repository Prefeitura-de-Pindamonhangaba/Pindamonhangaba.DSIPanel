import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";
import { createKanbanRepository } from "../../src/modules/kanban/models/kanban-repository";
import { createKanbanService } from "../../src/modules/kanban/services/kanban-service";
import { kanbanCard } from "../../src/modules/kanban/models/kanban-schema";
import {
  user,
  authAuditEvent,
} from "../../src/modules/auth/models/auth-schema";
const url = process.env.AUTH_TEST_DATABASE_URL;
if (
  !url ||
  !new URL(url).pathname.endsWith("_test") ||
  !["localhost", "127.0.0.1", "db-test"].includes(new URL(url).hostname)
)
  throw new Error("Exige banco de teste isolado.");
const client = postgres(url, { max: 3, onnotice: () => {} });
const db = drizzle(client);
const actor = {
  id: crypto.randomUUID(),
  name: "Kanban teste",
  enabled: true,
  permissions: ["dashboard:read", "kanban:write"],
};
const ids: string[] = [];
beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(user).values({
    id: actor.id,
    name: actor.name,
    email: `${actor.id}@example.test`,
  });
});
afterAll(async () => {
  for (const id of ids)
    await db.delete(kanbanCard).where(eq(kanbanCard.id, id));
  await db.delete(authAuditEvent).where(eq(authAuditEvent.actorId, actor.id));
  await db.delete(user).where(eq(user.id, actor.id));
  await client.end();
});
test("kanban persiste cartões, serializa edições concorrentes, arquiva/restaura e audita atomicamente", async () => {
  const repository = createKanbanRepository(db);
  const service = createKanbanService(repository);
  const created = await service.mutate(actor, {
    action: "create",
    title: "Preparar entrega",
    description: "Escopo da demanda",
    column: "todo",
    priority: "high",
    dueOn: "2026-12-10",
  });
  ids.push(created.id);
  expect(created.version).toBe(1);
  expect(created.dueOn).toBe("2026-12-10");
  const changes = await Promise.allSettled([
    service.mutate(actor, {
      action: "move",
      id: created.id,
      version: 1,
      column: "doing",
    }),
    service.mutate(actor, {
      action: "move",
      id: created.id,
      version: 1,
      column: "review",
    }),
  ]);
  expect(
    changes.filter((change) => change.status === "fulfilled"),
  ).toHaveLength(1);
  expect(changes.filter((change) => change.status === "rejected")).toHaveLength(
    1,
  );
  const updated = (await repository.list()).find(
    (card) => card.id === created.id,
  )!;
  expect(updated.version).toBe(2);
  const archived = await service.mutate(actor, {
    action: "archive",
    id: created.id,
    version: 2,
    archived: true,
  });
  expect(archived.archived).toBe(true);
  await expect(
    service.mutate(actor, {
      action: "move",
      id: created.id,
      version: 3,
      column: "done",
    }),
  ).rejects.toThrow("arquivado");
  const restored = await service.mutate(actor, {
    action: "archive",
    id: created.id,
    version: 3,
    archived: false,
  });
  expect(restored.archived).toBe(false);
  await expect(
    service.mutate(
      { ...actor, id: crypto.randomUUID() },
      {
        action: "edit",
        id: created.id,
        version: 4,
        title: "Não deve salvar",
        description: "",
        priority: "normal",
        dueOn: null,
      },
    ),
  ).rejects.toThrow();
  expect(
    (await repository.list()).find((card) => card.id === created.id)?.title,
  ).toBe("Preparar entrega");
  const audit = await db
    .select()
    .from(authAuditEvent)
    .where(eq(authAuditEvent.actorId, actor.id));
  expect(audit).toHaveLength(4);
});
