import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";
import {
  authAuditEvent,
  permission,
  user,
} from "../../src/modules/auth/models/auth-schema";
import { createContractRepository } from "../../src/modules/contracts/models/contract-repository";
import { createContractService } from "../../src/modules/contracts/services/contract-service";
import { createTicketRepository } from "../../src/modules/tickets/models/ticket-repository";
import { ticketContractBinding } from "../../src/modules/tickets/models/ticket-schema";
import { createTicketService } from "../../src/modules/tickets/services/ticket-service";
import { contractFixture, ticketFixture } from "../fixtures/integration-data";
const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !new URL(databaseUrl).pathname.endsWith("_test") ||
  !["localhost", "127.0.0.1", "db-test"].includes(new URL(databaseUrl).hostname)
)
  throw new Error("Exige banco local isolado com sufixo _test.");
const client = postgres(databaseUrl, { max: 5, onnotice: () => {} }),
  db = drizzle(client);
const contractRepository = createContractRepository(db),
  ticketRepository = createTicketRepository(db);
const contracts = createContractService(contractRepository),
  tickets = createTicketService(ticketRepository, contracts, {});
const actor = {
  id: crypto.randomUUID(),
  name: "Administrador fictício",
  enabled: true,
  permissions: ["integrations:manage"],
};
beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(user).values({
    id: actor.id,
    name: actor.name,
    email: `${actor.id}@example.test`,
    enabled: true,
  });
});
afterAll(async () => {
  await db
    .delete(ticketContractBinding)
    .where(eq(ticketContractBinding.actorId, actor.id));
  await db.delete(authAuditEvent).where(eq(authAuditEvent.actorId, actor.id));
  await db.delete(user).where(eq(user.id, actor.id));
  await client.end();
});
test("capturas persistem de forma idempotente, preservam falhas e auditam vínculos", async () => {
  expect(
    await db
      .select()
      .from(permission)
      .where(eq(permission.name, "integrations:manage")),
  ).toHaveLength(1);
  const contract = contractFixture({ endsOn: "2099-12-31" });
  await contractRepository.saveSnapshot([contract], actor.id);
  await contractRepository.saveSnapshot([contract], actor.id);
  expect(await contractRepository.list()).toHaveLength(1);
  await ticketRepository.saveSnapshot(
    [ticketFixture()],
    { id: 1, name: "DSI" },
    actor.id,
  );
  await tickets.assignContract(actor, 10, "100");
  expect((await ticketRepository.bindings())[0].contractSourceId).toBe("100");
  expect(
    (await tickets.dashboard({ q: "", status: "open", group: "", page: 1 }))
      .summary.open,
  ).toBe(1);
  await contractRepository.markFailure(actor.id);
  expect(await contractRepository.list()).toHaveLength(1);
  expect((await contractRepository.syncState())?.status).toBe("failed");
  expect((await contractRepository.syncState())?.succeededAt).not.toBeNull();
  const audit = () =>
    db
      .select()
      .from(authAuditEvent)
      .where(eq(authAuditEvent.operation, "ticket.contract_linked"));
  expect(await audit()).toHaveLength(1);
  await expect(
    ticketRepository.saveBinding(10, "100", crypto.randomUUID()),
  ).rejects.toThrow();
  expect(await audit()).toHaveLength(1);
  await expect(
    tickets.assignContract({ ...actor, permissions: [] }, 10, null),
  ).rejects.toThrow("Acesso não autorizado");
  await tickets.assignContract(actor, 10, null);
  expect(await ticketRepository.bindings()).toHaveLength(0);
  await ticketRepository.saveSnapshot(
    [ticketFixture({ status: 5, solvedAt: new Date().toISOString() })],
    { id: 1, name: "DSI" },
  );
  expect(
    (await tickets.dashboard({ q: "", status: "open", group: "", page: 1 }))
      .summary.open,
  ).toBe(0);
});
