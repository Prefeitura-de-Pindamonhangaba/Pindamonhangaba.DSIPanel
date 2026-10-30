import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getIdentityService } from "@/shared/lib/auth/server";
import { parseKeycloakEnvironment } from "../services/keycloak-config";
import { canAccess } from "../services/access-service";
import type { Permission } from "../models/access-types";
import {
  getTestPrincipal,
  isTestAccessEnabled,
} from "../services/test-access-service";

// O Keycloak é a autoridade dos papéis; o banco mantém apenas o espelho local.
export async function getPrincipal(requestHeaders: Headers) {
  if (isTestAccessEnabled(process.env)) return getTestPrincipal();
  if (!parseKeycloakEnvironment(process.env).enabled) return null;
  return getIdentityService()?.getPrincipal(requestHeaders) ?? null;
}
export async function requirePageAccess(
  permission: Permission = "dashboard:read",
) {
  const principal = await getPrincipal(await headers());
  if (!principal) redirect("/login");
  if (!canAccess(principal, permission)) redirect("/login?access=denied");
  return principal;
}
