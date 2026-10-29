import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseKeycloakEnvironment } from "../services/keycloak-config";
import { getPrincipal } from "./access-controller";
import { canAccess } from "../services/access-service";
import { z } from "zod";

export async function getLoginPageController(search: unknown) {
  const parsed = z
    .object({
      error: z.string().optional(),
      sso: z.string().optional(),
      access: z.string().optional(),
    })
    .safeParse(search);
  const keycloakEnabled = parseKeycloakEnvironment(process.env).enabled;
  const principal = await getPrincipal(await headers());
  if (canAccess(principal, "dashboard:read")) redirect("/");
  return {
    keycloakEnabled,
    denied:
      Boolean(principal) || (parsed.success && parsed.data.access === "denied"),
    failed:
      parsed.success &&
      (Boolean(parsed.data.error) || parsed.data.sso === "error"),
  };
}
