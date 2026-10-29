export type Permission =
  "dashboard:read" | "users:manage" | "integrations:manage";
export type Role = "member" | "admin";
export interface Principal {
  id: string;
  name: string;
  enabled: boolean;
  permissions: string[];
}
