import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, getPrincipalService } from "@/shared/lib/auth/server";
import { parseKeycloakEnvironment } from "../services/keycloak-config";
import { canAccess } from "../services/access-service";
import type { Permission } from "../models/access-types";
import {
  getTestPrincipal,
  isTestAccessEnabled,
} from "../services/test-access-service";

// As permissões são lidas do banco em cada requisição, sem cache no cookie.
export async function getPrincipal(requestHeaders: Headers) {
  if (isTestAccessEnabled(process.env)) return getTestPrincipal();
  if (!parseKeycloakEnvironment(process.env).enabled) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  return getPrincipalService().resolve(session?.user.id);
}
export async function requirePageAccess(
  permission: Permission = "dashboard:read",
) {
  const principal = await getPrincipal(await headers());
  if (!principal) redirect("/login");
  if (!canAccess(principal, permission)) redirect("/login?access=denied");
  return principal;
}
