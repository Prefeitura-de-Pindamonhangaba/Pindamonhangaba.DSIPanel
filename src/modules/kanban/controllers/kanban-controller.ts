import {
  getPrincipal,
  requirePageAccess,
} from "@/modules/auth/controllers/access-controller";
import { canAccess } from "@/modules/auth/services/access-service";
import { getEnv } from "@/shared/lib/env";
import { readJson } from "@/shared/lib/security/read-json";
import { getKanbanService } from "../services/kanban-server";
import { KanbanError } from "../services/kanban-service";
export async function kanbanPageController() {
  const actor = await requirePageAccess();
  return {
    cards: await getKanbanService().board(actor),
    userName: actor.name,
    canWrite: canAccess(actor, "kanban:write"),
  };
}
export async function mutateKanbanController(request: Request) {
  try {
    const actor = await getPrincipal(request.headers);
    if (!actor)
      return Response.json(
        { message: "Entre com sua conta institucional." },
        { status: 401 },
      );
    if (!canAccess(actor, "kanban:write"))
      return Response.json(
        { message: "Você não possui permissão para alterar o quadro." },
        { status: 403 },
      );
    if (request.headers.get("origin") !== new URL(getEnv().APP_URL).origin)
      return Response.json(
        { message: "Origem não autorizada." },
        { status: 403 },
      );
    let input: unknown;
    try {
      input = await readJson(request, 24576);
    } catch {
      return Response.json(
        { message: "Solicitação inválida." },
        { status: 400 },
      );
    }
    const card = await getKanbanService().mutate(actor, input);
    return Response.json(
      { card },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof KanbanError)
      return Response.json(
        { message: error.message },
        { status: { forbidden: 403, invalid: 400, conflict: 409 }[error.kind] },
      );
    console.error(JSON.stringify({ event: "kanban.request_failed" }));
    return Response.json(
      { message: "Não foi possível salvar o cartão. Tente novamente." },
      { status: 503 },
    );
  }
}
