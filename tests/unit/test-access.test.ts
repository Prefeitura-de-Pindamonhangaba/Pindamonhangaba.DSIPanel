import { expect, test } from "bun:test";
import {
  getTestPrincipal,
  isTestAccessEnabled,
} from "../../src/modules/auth/services/test-access-service";
import { canAccess } from "../../src/modules/auth/services/access-service";
test("acesso de teste é desativado por padrão e recusa flags inválidas e endereços externos", () => {
  expect(isTestAccessEnabled({})).toBe(false);
  expect(isTestAccessEnabled({ AUTH_BYPASS_ENABLED: "false" })).toBe(false);
  expect(() => isTestAccessEnabled({ AUTH_BYPASS_ENABLED: "1" })).toThrow();
  expect(() =>
    isTestAccessEnabled({
      AUTH_BYPASS_ENABLED: "true",
      APP_URL: "https://painel.example.org",
    }),
  ).toThrow();
  expect(
    isTestAccessEnabled({
      AUTH_BYPASS_ENABLED: "true",
      APP_URL: "http://localhost:3000",
      NODE_ENV: "production",
    }),
  ).toBe(true);
});
test("identidade de teste permite leitura e não concede administração", () => {
  const principal = getTestPrincipal();
  expect(canAccess(principal, "dashboard:read")).toBe(true);
  expect(canAccess(principal, "integrations:manage")).toBe(false);
  expect(canAccess(principal, "users:manage")).toBe(false);
});
