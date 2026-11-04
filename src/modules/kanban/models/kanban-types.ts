export const KANBAN_COLUMNS = [
  { id: "todo", name: "A fazer", color: "blue" },
  { id: "doing", name: "Em andamento", color: "yellow" },
  { id: "review", name: "Em revisão", color: "purple" },
  { id: "done", name: "Concluído", color: "green" },
] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number]["id"];
export type KanbanPriority = "low" | "normal" | "high";
export const PRIORITY_LABELS: Record<KanbanPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
};
export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  column: KanbanColumn;
  priority: KanbanPriority;
  dueOn: string | null;
  archived: boolean;
  version: number;
  updatedAt: string;
}
export interface CardFields {
  title: string;
  description: string;
  priority: KanbanPriority;
  dueOn: string | null;
}
export type KanbanMutation =
  | ({ action: "create"; column: KanbanColumn } & CardFields)
  | ({ action: "edit"; id: string; version: number } & CardFields)
  | { action: "move"; id: string; version: number; column: KanbanColumn }
  | { action: "archive"; id: string; version: number; archived: boolean };
