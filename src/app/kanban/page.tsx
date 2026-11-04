import { kanbanPageController } from "@/modules/kanban/controllers/kanban-controller";
import { KanbanPage } from "@/modules/kanban/views/kanban-page";
export default async function Page() {
  return <KanbanPage data={await kanbanPageController()} />;
}
