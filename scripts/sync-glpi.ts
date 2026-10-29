import { createDatabase } from "../src/shared/lib/db/client";
import { createTicketRepository } from "../src/modules/tickets/models/ticket-repository";
import { createTicketService } from "../src/modules/tickets/services/ticket-service";
import { createContractRepository } from "../src/modules/contracts/models/contract-repository";
import { createContractService } from "../src/modules/contracts/services/contract-service";
const database = createDatabase();
try {
  const contracts = createContractService(
    createContractRepository(database.db),
  );
  const result = await createTicketService(
    createTicketRepository(database.db),
    contracts,
  ).synchronize();
  console.log(JSON.stringify({ message: "Chamados atualizados.", ...result }));
} catch {
  console.error(
    "Não foi possível atualizar o GLPI. Confira as variáveis, os acessos da conta, o grupo DSI e as migrações. A captura anterior foi preservada.",
  );
  process.exitCode = 1;
} finally {
  await database.close();
}
