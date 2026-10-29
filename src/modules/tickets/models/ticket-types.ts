export interface TicketSupplier {
  id: number;
  name: string;
  document: string | null;
}
export interface GlpiContract {
  id: number;
  number: string;
  name: string;
}
export interface DsiTicket {
  sourceId: number;
  title: string;
  status: number;
  priority: number;
  openedAt: string;
  updatedAt: string;
  solvedAt: string | null;
  resolutionDueAt: string | null;
  ownershipDueAt: string | null;
  resolutionSlaId: number;
  ownershipSlaId: number;
  resolutionOverdue: boolean | null;
  ownershipOverdue: boolean | null;
  groupRoles: ("assigned" | "observer")[];
  suppliers: TicketSupplier[];
  contracts: GlpiContract[];
  url: string;
}
