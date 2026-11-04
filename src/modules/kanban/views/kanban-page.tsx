import { PanelShell } from "@/shared/components/panel-shell";
import { KanbanBoard } from "./kanban-board";
import type { KanbanCard } from "../models/kanban-types";
export function KanbanPage({
  data,
}: {
  data: { cards: KanbanCard[]; userName: string; canWrite: boolean };
}) {
  return (
    <PanelShell title="Quadro Kanban" active="kanban" userName={data.userName}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ORGANIZAÇÃO DO DEPARTAMENTO</p>
          <h1>Quadro do DSI</h1>
        </div>
        <span className="phase-tag">Kanban · Quadro compartilhado</span>
      </div>
      <p className="page-description">
        Organize as demandas da equipe, acompanhe o trabalho em andamento e
        registre as entregas.
      </p>
      <KanbanBoard
        key={data.cards.map((card) => `${card.id}:${card.version}`).join(",")}
        initialCards={data.cards}
        canWrite={data.canWrite}
      />
    </PanelShell>
  );
}
