import { afterAll, beforeAll, expect, mock, test } from "bun:test";
mock.module("server-only", () => ({}));
const { handleAuthRequest } =
  await import("../../src/modules/auth/controllers/auth-controller");
const keys = [
  "APP_URL",
  "AUTH_BYPASS_ENABLED",
  "DATABASE_URL",
  "KEYCLOAK_ENABLED",
  "KEYCLOAK_ISSUER",
  "KEYCLOAK_CLIENT_ID",
  "KEYCLOAK_CLIENT_SECRET",
] as const;
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
beforeAll(() => {
  Object.assign(process.env, {
    AUTH_BYPASS_ENABLED: "false",
    APP_URL: "https://panel.example.test",
    DATABASE_URL: "postgresql://test:test@localhost/dsi_test",
    KEYCLOAK_ENABLED: "true",
    KEYCLOAK_ISSUER: "https://sso.example.test/realms/pinda",
    KEYCLOAK_CLIENT_ID: "panel",
    KEYCLOAK_CLIENT_SECRET: "fictitious",
  });
});
afterAll(() => {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});
function request(path: string, origin: string, body: unknown = {}) {
  return new Request(`https://panel.example.test/api/auth/${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
test("controller bloqueia senha local, cadastro e vinculação pública", async () => {
  for (const path of [
    "sign-in/email",
    "sign-up/email",
    "link-social",
    "update-user",
  ])
    expect(
      (await handleAuthRequest(request(path, "https://panel.example.test")))
        .status,
    ).toBe(404);
});
test("controller recusa origem externa e métodos incorretos", async () => {
  expect(
    (await handleAuthRequest(request("sign-in/social", "https://evil.test")))
      .status,
  ).toBe(403);
  expect(
    (
      await handleAuthRequest(
        new Request("https://panel.example.test/api/auth/sign-out"),
      )
    ).status,
  ).toBe(405);
});
test("origem HTTP ou porta diferente é recusada com orientação para a URL configurada", async () => {
  for (const origin of [
    "http://panel.example.test",
    "https://panel.example.test:3002",
    "null",
  ]) {
    const response = await handleAuthRequest(request("sign-in/social", origin));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      code: "AUTH_ORIGIN_MISMATCH",
      message: "Acesse o painel pelo endereço configurado para entrar.",
      loginURL: "https://panel.example.test/login",
    });
  }
  const allowed = await handleAuthRequest(
    request("sign-in/social", "https://panel.example.test"),
  );
  expect(allowed.status).toBe(400);
});
test("controller rejeita destinos externos e token direto antes de chamar o SDK", async () => {
  for (const extra of [
    { callbackURL: "https://evil.test" },
    { idToken: { token: "fake" } },
  ]) {
    const body = {
      provider: "keycloak",
      callbackURL: "/",
      errorCallbackURL: "/login?sso=error",
      ...extra,
    };
    expect(
      (
        await handleAuthRequest(
          request("sign-in/social", "https://panel.example.test", body),
        )
      ).status,
    ).toBe(400);
  }
});
