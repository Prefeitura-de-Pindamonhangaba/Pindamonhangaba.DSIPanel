import { z } from "zod";
import { parseKeycloakEnvironment } from "@/modules/auth/services/keycloak-config";
import { isTestAccessEnabled } from "@/modules/auth/services/test-access-service";
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_BIND_ADDRESS: z.union([z.ipv4(), z.ipv6()]).default("127.0.0.1"),
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/" &&
      (url.protocol === "https:" || url.protocol === "http:")
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
  const testAccess = isTestAccessEnabled(process.env);
  const result = envSchema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      "Configuração inválida: verifique APP_URL, APP_BIND_ADDRESS, APP_PORT e DATABASE_URL.",
    );
  if (
    testAccess &&
    !["127.0.0.1", "::1"].includes(result.data.APP_BIND_ADDRESS)
  )
    throw new Error("Modo sem login exige APP_BIND_ADDRESS=127.0.0.1 ou ::1.");
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
