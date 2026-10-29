import { createDatabase } from "../src/shared/lib/db/client";
import { createContractRepository } from "../src/modules/contracts/models/contract-repository";
import { createContractService } from "../src/modules/contracts/services/contract-service";
const database = createDatabase();
try {
  const result = await createContractService(
    createContractRepository(database.db),
  ).synchronize();
  console.log(JSON.stringify({ message: "Contratos atualizados.", ...result }));
} catch {
  console.error(
    "Não foi possível atualizar os contratos. Verifique o acesso ao portal e as migrações; a captura anterior foi preservada.",
  );
  process.exitCode = 1;
} finally {
  await database.close();
}
