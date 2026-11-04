import type { KanbanRepository } from "../models/kanban-repository";
import type { Principal } from "@/modules/auth/models/access-types";
import { canAccess } from "@/modules/auth/services/access-service";
import { kanbanMutationSchema } from "../schemas/kanban-schema";
export class KanbanError extends Error {
  constructor(
    message: string,
    public readonly kind: "forbidden" | "invalid" | "conflict",
  ) {
    super(message);
  }
}
export function createKanbanService(repository: KanbanRepository) {
  return {
    async board(actor: Principal) {
      if (!canAccess(actor, "dashboard:read"))
        throw new KanbanError("Acesso não autorizado.", "forbidden");
      return repository.list();
    },
    async mutate(actor: Principal, raw: unknown) {
      if (!canAccess(actor, "kanban:write"))
        throw new KanbanError(
          "Você não possui permissão para alterar o quadro.",
          "forbidden",
        );
      const parsed = kanbanMutationSchema.safeParse(raw);
      if (!parsed.success)
        throw new KanbanError(
          "Confira os campos do cartão. O título é obrigatório (até 160 caracteres) e a descrição aceita até 4.000 caracteres.",
          "invalid",
        );
      const result = await repository.mutate(parsed.data, actor.id);
      if (!result)
        throw new KanbanError(
          "Este cartão foi alterado ou arquivado por outra pessoa. Atualize o quadro antes de continuar.",
          "conflict",
        );
      return result;
    },
  };
}
