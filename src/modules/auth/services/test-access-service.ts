import { z } from "zod";
import type { Principal } from "../models/access-types";

export function isTestAccessEnabled(input: Record<string, string | undefined>) {
  const flag = z
    .enum(["true", "false"])
    .default("false")
    .parse(input.AUTH_BYPASS_ENABLED);
  if (flag === "false") return false;
  const url = z.url().parse(input.APP_URL);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
    throw new Error(
      "AUTH_BYPASS_ENABLED só pode ser utilizado com APP_URL local.",
    );
  }
  return true;
}

export function getTestPrincipal(): Principal {
  // Sem usuário persistido: não concede permissões de escrita ou administração.
  return {
    id: "local-test-viewer",
    name: "Teste local",
    enabled: true,
    permissions: ["dashboard:read"],
  };
}
