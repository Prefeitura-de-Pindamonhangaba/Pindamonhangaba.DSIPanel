export interface DashboardData {
  resources: {
    title: string;
    description: string;
    icon: "tools" | "book" | "users";
    status: string;
  }[];
  milestones: { title: string; description: string; current: boolean }[];
}
