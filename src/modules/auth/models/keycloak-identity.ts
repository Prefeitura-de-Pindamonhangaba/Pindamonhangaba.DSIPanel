import type { KeycloakRole as Role } from "../services/keycloak-permissions";
export interface KeycloakIdentity {
  accountId: string;
  subject: string;
  role: Role;
  name: string;
  technicalEmail: string;
}
