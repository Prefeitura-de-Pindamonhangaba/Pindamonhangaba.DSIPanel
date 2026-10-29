import "server-only";
import { getDatabase } from "@/shared/lib/db/client";
import { parseAuthEnvironment } from "@/shared/lib/env";
import { createAuthService } from "@/modules/auth/services/auth-service";
import { createPrincipalService } from "@/modules/auth/services/principal-service";
import { createKeycloakSessionService } from "@/modules/auth/services/keycloak-session-service";
import { createKeycloakIdentityRepository } from "@/modules/auth/models/keycloak-identity-repository";
let auth: ReturnType<typeof createAuthService> | undefined;
export function getAuth() {
  auth ??= createAuthService(getDatabase(), parseAuthEnvironment(process.env));
  return auth;
}
export function getPrincipalService() {
  return createPrincipalService(getDatabase());
}
let identity: ReturnType<typeof createKeycloakSessionService> | undefined;
export function getIdentityService() {
  if (!parseAuthEnvironment(process.env).keycloak.enabled) return null;
  identity ??= createKeycloakSessionService(
    getAuth(),
    createKeycloakIdentityRepository(getDatabase()),
  );
  return identity;
}
