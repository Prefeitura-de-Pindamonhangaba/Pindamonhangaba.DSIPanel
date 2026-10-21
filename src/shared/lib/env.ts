import { z } from "zod";
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url(),
  DATABASE_URL: z
    .url()
    .refine(
      (value) => /^postgres(ql)?:/.test(value),
      "Utilize uma URL PostgreSQL.",
    ),
});
export function getEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success)
    throw new Error("Configuração inválida: verifique APP_URL e DATABASE_URL.");
  return result.data;
}
