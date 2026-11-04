import { describe, expect, test } from "bun:test";
import { envSchema, getEnv } from "../../src/shared/lib/env";

describe("configuração de ambiente", () => {
  test("modo sem login exige publicação local", () => {
    const keys = [
      "APP_URL",
      "DATABASE_URL",
      "AUTH_BYPASS_ENABLED",
      "APP_BIND_ADDRESS",
    ] as const;
    const previous = Object.fromEntries(
      keys.map((key) => [key, process.env[key]]),
    );
    try {
      Object.assign(process.env, {
        APP_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://test:test@db:5432/test",
        AUTH_BYPASS_ENABLED: "true",
        APP_BIND_ADDRESS: "0.0.0.0",
      });
      expect(() => getEnv()).toThrow("APP_BIND_ADDRESS");
      process.env.APP_BIND_ADDRESS = "127.0.0.1";
      expect(getEnv().APP_BIND_ADDRESS).toBe("127.0.0.1");
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });
  test("aceita URL de rede e porta publicada sem alterar a porta interna", () => {
    const configured = envSchema.parse({
      APP_URL: "http://10.0.0.16:3002",
      APP_BIND_ADDRESS: "0.0.0.0",
      APP_PORT: "3002",
      DATABASE_URL: "postgresql://user:password@db:5432/test",
    });
    expect(configured.APP_PORT).toBe(3002);
    expect(configured.APP_URL).toBe("http://10.0.0.16:3002");
    for (const change of [
      { APP_PORT: "70000" },
      { APP_BIND_ADDRESS: "http://localhost" },
      { APP_URL: "https://example.test/path" },
      { APP_URL: "https://user:secret@example.test" },
      { APP_URL: "ftp://example.test" },
    ])
      expect(envSchema.safeParse({ ...configured, ...change }).success).toBe(
        false,
      );
  });
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
