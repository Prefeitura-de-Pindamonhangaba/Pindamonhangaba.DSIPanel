import type { Permission } from "../models/access-types";
export type KeycloakRole = "viewer" | "operator" | "admin";
export const keycloakRolePermissions: Record<
  KeycloakRole,
  readonly Permission[]
> = {
  viewer: ["dashboard:read"],
  operator: ["dashboard:read", "integrations:manage"],
  admin: ["dashboard:read", "integrations:manage", "users:manage"],
};
