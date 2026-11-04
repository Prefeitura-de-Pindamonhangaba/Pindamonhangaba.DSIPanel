import "server-only";
import { getDatabase } from "@/shared/lib/db/client";
import { createKanbanRepository } from "../models/kanban-repository";
import { createKanbanService } from "./kanban-service";
export function getKanbanService() {
  return createKanbanService(createKanbanRepository(getDatabase()));
}
