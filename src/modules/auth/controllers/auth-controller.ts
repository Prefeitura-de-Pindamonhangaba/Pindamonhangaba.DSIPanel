import "server-only";
import { getAuth } from "@/shared/lib/auth/server";
import { parseKeycloakEnvironment } from "../services/keycloak-config";
import {
  keycloakSignInSchema,
  signOutSchema,
} from "../schemas/auth-request-schema";
import { readJson } from "@/shared/lib/security/read-json";
import { getEnv } from "@/shared/lib/env";

const endpoints = new Map([
  ["/api/auth/sign-in/social", "POST"],
  ["/api/auth/callback/keycloak", "GET"],
  ["/api/auth/sign-out", "POST"],
]);
function json(message: string, status: number) {
  return Response.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function handleAuthRequest(request: Request) {
  const path = new URL(request.url).pathname;
  const method = endpoints.get(path);
  if (!method) return json("Recurso indisponível.", 404);
  if (request.method !== method) return json("Método não permitido.", 405);
  try {
    if (!parseKeycloakEnvironment(process.env).enabled)
      return json("Acesso institucional indisponível.", 503);
    if (request.method === "POST") {
      if (request.headers.get("origin") !== new URL(getEnv().APP_URL).origin)
        return json("Origem não autorizada.", 403);
      try {
        const body = await readJson(request.clone());
        const schema = path.endsWith("/social")
          ? keycloakSignInSchema
          : signOutSchema;
        if (!schema.safeParse(body).success)
          return json("Solicitação inválida.", 400);
      } catch {
        return json("Solicitação inválida.", 400);
      }
    }
    const response = await getAuth().handler(request);
    if (response.status === 429) {
      const result = json(
        "Muitas tentativas. Aguarde um minuto e tente novamente.",
        429,
      );
      result.headers.set(
        "Retry-After",
        response.headers.get("X-Retry-After") ?? "60",
      );
      return result;
    }
    if (
      path.endsWith("/sign-out") &&
      response.ok &&
      (await getAuth().api.getSession({ headers: request.headers }))
    )
      throw new Error("Sessão não revogada.");
    response.headers.set("Cache-Control", "no-store");
    if (response.status >= 400)
      return json("Não foi possível concluir a autenticação.", response.status);
    return response;
  } catch {
    console.error(JSON.stringify({ event: "auth.request_unavailable" }));
    return json("Não foi possível acessar o serviço de autenticação.", 503);
  }
}
