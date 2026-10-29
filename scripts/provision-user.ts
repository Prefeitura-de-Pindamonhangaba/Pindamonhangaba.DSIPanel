import { z } from "zod";
import { createDatabase } from "../src/shared/lib/db/client";
import { createProvisioningRepository } from "../src/modules/auth/models/provisioning-repository";
import { provisionUserSchema } from "../src/modules/auth/schemas/provision-user-schema";
import { provisionUser } from "../src/modules/auth/services/provision-user-service";

const database = createDatabase();
try {
  const raw = await Bun.stdin.text();
  if (raw.length > 4096) throw new Error("Entrada inválida.");
  const input = provisionUserSchema.parse(JSON.parse(raw));
  const issuer =
    input.action === "provision"
      ? z
          .url()
          .refine((value) => {
            if (!URL.canParse(value)) return false;
            const url = new URL(value);
            return (
              url.protocol === "https:" &&
              !url.username &&
              !url.password &&
              !url.search &&
              !url.hash &&
              /\/realms\/[^/]+\/?$/.test(url.pathname)
            );
          })
          .parse(process.env.KEYCLOAK_ISSUER)
          .replace(/\/$/, "")
      : undefined;
  const created = await provisionUser(
    createProvisioningRepository(database.db),
    input,
    issuer,
  );
  console.log(
    JSON.stringify({ id: created.id, message: "Operação concluída." }),
  );
} catch {
  // Nunca imprimir dados pessoais, secrets ou erros SQL do provisionamento.
  console.error(
    "Operação não concluída. Verifique a configuração, os dados, a identidade única e a autorização do administrador.",
  );
  process.exitCode = 1;
} finally {
  await database.close();
}
