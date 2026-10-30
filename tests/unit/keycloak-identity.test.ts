import { expect, test } from "bun:test";
import { parseKeycloakIdentity } from "../../src/modules/auth/services/keycloak-identity";
import { keycloakRolePermissions } from "../../src/modules/auth/services/keycloak-permissions";
const issuer = "https://sso.example.test/realms/pinda";
test("identidade exige papel do próprio cliente e não usa e-mail como vínculo", () => {
  const profile = {
    iss: issuer,
    sub: "stable",
    email: "same@example.test",
    realm_access: { roles: ["admin"] },
  };
  expect(parseKeycloakIdentity(profile, issuer, "dsi")).toBeNull();
  expect(
    parseKeycloakIdentity(
      { ...profile, resource_access: { other: { roles: ["admin"] } } },
      issuer,
      "dsi",
    ),
  ).toBeNull();
  const local = parseKeycloakIdentity(
    {
      ...profile,
      resource_access: { dsi: { roles: ["viewer", "admin", "operator"] } },
    },
    issuer,
    "dsi",
  );
  expect(local?.role).toBe("admin");
  expect(local?.technicalEmail).toEndWith("@identity.invalid");
  expect(local?.technicalEmail).not.toBe(profile.email);
  expect(
    parseKeycloakIdentity(
      {
        ...profile,
        iss: "https://evil.test",
        resource_access: { dsi: { roles: ["admin"] } },
      },
      issuer,
      "dsi",
    ),
  ).toBeNull();
  expect(
    parseKeycloakIdentity(
      { ...profile, resource_access: { dsi: { roles: ["unknown"] } } },
      issuer,
      "dsi",
    ),
  ).toBeNull();
});
test("papéis institucionais seguem menor privilégio no painel", () => {
  expect(keycloakRolePermissions.viewer).toEqual(["dashboard:read"]);
  expect(keycloakRolePermissions.operator).toContain("integrations:manage");
  expect(keycloakRolePermissions.operator).not.toContain("users:manage");
  expect(keycloakRolePermissions.admin).toContain("users:manage");
});
