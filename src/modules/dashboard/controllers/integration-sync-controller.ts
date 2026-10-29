import { z } from "zod";
import { readJson } from "@/shared/lib/security/read-json";
import { authorizeIntegrationRequest } from "@/shared/lib/security/integration-request";
import {
  getContractService,
  getTicketService,
} from "@/shared/lib/integrations/server";
import {
  SynchronizationBusyError,
  synchronizeIntegration,
} from "../services/integration-sync-service";
export async function synchronizeIntegrationController(request: Request) {
  try {
    const access = await authorizeIntegrationRequest(request);
    if (access.error) return access.error;
    let source: "transparency" | "glpi";
    try {
      source = z
        .strictObject({ source: z.enum(["transparency", "glpi"]) })
        .parse(await readJson(request)).source;
    } catch {
      return Response.json(
        { message: "Solicitação inválida." },
        { status: 400 },
      );
    }
    const result = await synchronizeIntegration(
      source,
      access.principal,
      source === "transparency" ? getContractService() : getTicketService(),
    );
    return Response.json(
      { message: "Atualização concluída.", result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SynchronizationBusyError)
      return Response.json(
        { message: "Atualização já em andamento." },
        { status: 409 },
      );
    console.error(JSON.stringify({ event: "integration.sync_failed" }));
    return Response.json(
      {
        message:
          "Não foi possível atualizar. A captura anterior foi preservada.",
      },
      { status: 503 },
    );
  }
}
