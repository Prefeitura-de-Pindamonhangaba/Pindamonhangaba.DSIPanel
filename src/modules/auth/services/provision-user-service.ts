import type { z } from "zod";
import type { ProvisioningTransaction } from "../models/provisioning-repository";
import type { provisionUserSchema } from "../schemas/provision-user-schema";
import { keycloakAccountId } from "./keycloak-config";
export async function provisionUser(
  repository: {
    transaction<T>(
      work: (tx: ProvisioningTransaction) => Promise<T>,
    ): Promise<T>;
  },
  input: z.infer<typeof provisionUserSchema>,
  issuer?: string,
) {
  return repository.transaction(async (tx) => {
    const bootstrap = (await tx.countUsers()) === 0;
    if (
      bootstrap &&
      (input.action !== "provision" || input.role !== "admin" || input.actorId)
    )
      throw new Error("A primeira conta deve ser administradora, sem actorId.");
    if (!bootstrap && (!input.actorId || !(await tx.hasAdmin(input.actorId))))
      throw new Error("É necessário um administrador local ativo.");
    if (input.action === "deactivate") {
      if ((await tx.hasAdmin(input.userId)) && (await tx.countAdmins()) <= 1)
        throw new Error("Não é possível desativar o último administrador.");
      if (!(await tx.deactivate(input.userId)))
        throw new Error("Usuário não encontrado.");
      await tx.record(input.actorId, input.userId, "user.deactivated");
      return { id: input.userId };
    }
    if (!issuer)
      throw new Error("Configure KEYCLOAK_ISSUER antes de provisionar.");
    const created = await tx.provision({
      name: input.name,
      email: input.email,
      role: input.role,
      accountId: keycloakAccountId(issuer, input.subject),
    });
    await tx.record(
      input.actorId ?? created.id,
      created.id,
      bootstrap ? "user.bootstrap" : "user.provisioned",
    );
    return created;
  });
}
