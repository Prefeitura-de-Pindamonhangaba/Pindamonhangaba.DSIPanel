import { z } from "zod";
import { parseKeycloakEnvironment } from "@/modules/auth/services/keycloak-config";
import { isTestAccessEnabled } from "@/modules/auth/services/test-access-service";
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/" &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  }),
  DATABASE_URL: z
    .url()
    .refine(
      (value) => /^postgres(ql)?:/.test(value),
      "Utilize uma URL PostgreSQL.",
    ),
});
export function getEnv() {
  isTestAccessEnabled(process.env);
  const result = envSchema.safeParse(process.env);
  if (!result.success)
    throw new Error("Configuração inválida: verifique APP_URL e DATABASE_URL.");
  return result.data;
}

export function parseAuthEnvironment(
  input: Record<string, string | undefined>,
) {
  const base = envSchema.safeParse(input);
  const secret = z.string().min(32).safeParse(input.BETTER_AUTH_SECRET);
  if (!base.success || !secret.success)
    throw new Error(
      "Configuração inválida: verifique APP_URL, DATABASE_URL e BETTER_AUTH_SECRET (mínimo de 32 caracteres).",
    );
  return {
    ...base.data,
    BETTER_AUTH_SECRET: secret.data,
    keycloak: parseKeycloakEnvironment(input),
  };
}
