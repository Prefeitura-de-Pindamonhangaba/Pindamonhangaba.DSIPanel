import { getPrincipal } from "@/modules/auth/controllers/access-controller";
import { canAccess } from "@/modules/auth/services/access-service";
import { getEnv } from "@/shared/lib/env";
export async function authorizeIntegrationRequest(request: Request) {
  const principal = await getPrincipal(request.headers);
  if (!principal)
    return {
      error: Response.json(
        { message: "Entre com sua conta institucional." },
        { status: 401 },
      ),
    };
  if (!canAccess(principal, "integrations:manage"))
    return {
      error: Response.json(
        { message: "Acesso não autorizado." },
        { status: 403 },
      ),
    };
  if (request.headers.get("origin") !== new URL(getEnv().APP_URL).origin)
    return {
      error: Response.json(
        { message: "Origem não autorizada." },
        { status: 403 },
      ),
    };
  return { principal };
}
