import { describe, expect, test } from "bun:test";
import {
  parseKeycloakEnvironment,
  keycloakAccountId,
} from "../../src/modules/auth/services/keycloak-config";
import { parseAuthEnvironment } from "../../src/shared/lib/env";
import { canAccess } from "../../src/modules/auth/services/access-service";
import { resolvePrincipal } from "../../src/modules/auth/services/principal-service";
import { keycloakSignInSchema } from "../../src/modules/auth/schemas/auth-request-schema";
import { readJson } from "../../src/shared/lib/security/read-json";
import { provisionUser } from "../../src/modules/auth/services/provision-user-service";
import type { ProvisioningTransaction } from "../../src/modules/auth/models/provisioning-repository";

const settings = {
  APP_URL: "https://panel.example.test",
  DATABASE_URL: "postgresql://test:test@localhost/dsi_test",
  BETTER_AUTH_SECRET: "a-fictitious-secret-for-tests-with-32-characters",
  KEYCLOAK_ENABLED: "true",
  KEYCLOAK_ISSUER: "https://sso.example.test/realms/pinda/",
  KEYCLOAK_CLIENT_ID: "panel",
  KEYCLOAK_CLIENT_SECRET: "fictitious",
};
describe("autenticação institucional", () => {
  test("desabilitada não exige credenciais; habilitada valida configurações sem revelar valores", () => {
    expect(parseKeycloakEnvironment({}).enabled).toBe(false);
    expect(parseAuthEnvironment(settings).keycloak.enabled).toBe(true);
    for (const issuer of [
      "invalid",
      "http://sso.example.test/realms/pinda",
      "https://u:password@sso.example.test/realms/pinda",
      "https://sso.example.test/realms/pinda?token=secret",
    ]) {
      expect(() =>
        parseKeycloakEnvironment({ ...settings, KEYCLOAK_ISSUER: issuer }),
      ).toThrow("KEYCLOAK_ISSUER");
    }
    expect(() =>
      parseAuthEnvironment({ ...settings, BETTER_AUTH_SECRET: "" }),
    ).toThrow("BETTER_AUTH_SECRET");
  });
  test("identidade usa realm e subject, sem vinculação por e-mail", () => {
    expect(
      keycloakAccountId("https://one.test/realms/a", "same-subject"),
    ).not.toBe(keycloakAccountId("https://two.test/realms/a", "same-subject"));
    expect(() =>
      keycloakAccountId(settings.KEYCLOAK_ISSUER, "bad subject"),
    ).toThrow();
  });
  test("recusa redirecionamentos externos, tokens diretos e campos adicionais", () => {
    const valid = {
      provider: "keycloak",
      callbackURL: "/",
      errorCallbackURL: "/login?sso=error",
    };
    expect(keycloakSignInSchema.safeParse(valid).success).toBe(true);
    expect(
      keycloakSignInSchema.safeParse({
        ...valid,
        callbackURL: "https://evil.test",
      }).success,
    ).toBe(false);
    expect(
      keycloakSignInSchema.safeParse({ ...valid, idToken: { token: "forged" } })
        .success,
    ).toBe(false);
  });
  test("RBAC nega usuários ausentes, inativos e sem permissão", async () => {
    const principal = {
      id: "user",
      name: "Usuário",
      enabled: true,
      permissions: ["dashboard:read"],
    };
    expect(canAccess(null, "dashboard:read")).toBe(false);
    expect(canAccess({ ...principal, enabled: false }, "dashboard:read")).toBe(
      false,
    );
    expect(canAccess(principal, "users:manage")).toBe(false);
    expect(canAccess(principal, "dashboard:read")).toBe(true);
    let enabled = true;
    const repository = {
      getPrincipal: async () => ({ ...principal, enabled }),
    };
    expect(await resolvePrincipal("user", repository)).not.toBeNull();
    enabled = false;
    expect(await resolvePrincipal("user", repository)).toBeNull();
  });
  test("limita corpo de requisição e rejeita JSON inválido", async () => {
    const request = (body: string) =>
      new Request("https://panel.example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
    expect(await readJson(request('{"ok":true}'))).toEqual({ ok: true });
    await expect(readJson(request("x"))).rejects.toThrow();
    await expect(
      readJson(request(JSON.stringify({ payload: "a".repeat(5000) }))),
    ).rejects.toThrow("grande");
  });
});

describe("provisionamento administrativo", () => {
  function fake(users = 0, admin = false) {
    const operations: string[] = [];
    const tx: ProvisioningTransaction = {
      countUsers: async () => users,
      hasAdmin: async () => admin,
      countAdmins: async () => 1,
      provision: async () => {
        operations.push("provision");
        return { id: "created" };
      },
      deactivate: async () => {
        operations.push("deactivate");
        return true;
      },
      record: async () => {
        operations.push("audit");
      },
    };
    return {
      operations,
      transaction: async <T>(
        work: (tx: ProvisioningTransaction) => Promise<T>,
      ) => work(tx),
    };
  }
  const input = {
    action: "provision" as const,
    name: "Usuário",
    email: "user@example.test",
    subject: "subject",
    role: "admin" as const,
  };
  test("bootstrap exige primeiro administrador e gera auditoria", async () => {
    const repository = fake();
    await expect(
      provisionUser(
        repository,
        { ...input, role: "member" },
        settings.KEYCLOAK_ISSUER,
      ),
    ).rejects.toThrow("primeira");
    expect(repository.operations).toEqual([]);
    await provisionUser(repository, input, settings.KEYCLOAK_ISSUER);
    expect(repository.operations).toEqual(["provision", "audit"]);
  });
  test("contas seguintes exigem administrador e último administrador é preservado", async () => {
    await expect(
      provisionUser(fake(1), input, settings.KEYCLOAK_ISSUER),
    ).rejects.toThrow("administrador local");
    const repository = fake(1, true);
    await expect(
      provisionUser(repository, {
        action: "deactivate",
        actorId: "actor",
        userId: "actor",
      }),
    ).rejects.toThrow("último administrador");
    expect(repository.operations).toEqual([]);
  });
});
