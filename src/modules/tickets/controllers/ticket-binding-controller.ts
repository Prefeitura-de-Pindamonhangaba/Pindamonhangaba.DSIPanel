import { z } from "zod";
import { authorizeIntegrationRequest } from "@/shared/lib/security/integration-request";
import { readJson } from "@/shared/lib/security/read-json";
import { getTicketService } from "@/shared/lib/integrations/server";
import { TicketBindingError } from "../services/ticket-service";
export async function bindTicketContractController(request: Request) {
  try {
    const access = await authorizeIntegrationRequest(request);
    if (access.error) return access.error;
    let input: { ticketId: number; contractSourceId: string | null };
    try {
      input = z
        .strictObject({
          ticketId: z.number().int().positive(),
          contractSourceId: z.string().regex(/^\d+$/).nullable(),
        })
        .parse(await readJson(request));
    } catch {
      return Response.json({ message: "Vínculo inválido." }, { status: 400 });
    }
    await getTicketService().assignContract(
      access.principal,
      input.ticketId,
      input.contractSourceId,
    );
    return Response.json(
      { message: "Vínculo atualizado." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof TicketBindingError
            ? error.message
            : "Não foi possível atualizar o vínculo.",
      },
      { status: error instanceof TicketBindingError ? 400 : 503 },
    );
  }
}
