import { describe, expect, test } from "bun:test";
import { envSchema } from "../../src/shared/lib/env";

describe("configuração de ambiente", () => {
  test("aceita PostgreSQL e uma URL de aplicação válida", () => {
    expect(
      envSchema.safeParse({
        APP_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/test",
      }).success,
    ).toBe(true);
  });
  test("rejeita configurações ausentes e outros bancos", () => {
    expect(envSchema.safeParse({}).success).toBe(false);
    expect(
      envSchema.safeParse({
        APP_URL: "invalido",
        DATABASE_URL: "mysql://localhost/test",
      }).success,
    ).toBe(false);
  });
});
