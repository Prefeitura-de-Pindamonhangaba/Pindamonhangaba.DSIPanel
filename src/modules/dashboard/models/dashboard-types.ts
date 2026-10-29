export interface DashboardData {
  currentUser?: { name: string };
  overview?: {
    contracts: number | null;
    openTickets: number | null;
    overdueTickets: number | null;
  };
  resources: {
    title: string;
    description: string;
    icon: "tools" | "book" | "users";
    status: string;
    href?: string;
  }[];
  milestones: { title: string; description: string; current: boolean }[];
}
