import { expect, test } from "@playwright/test";
test("login por outra origem orienta o usuário antes de enviar a autenticação", async ({
  page,
}) => {
  test.skip(
    process.env.E2E_AUTH_BYPASS_ENABLED === "true" ||
      process.env.E2E_KEYCLOAK_ENABLED !== "true",
    "Exige login institucional habilitado.",
  );
  let requests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/sign-in/social")
      requests++;
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Este endereço difere" }),
  ).toBeVisible();
  const link = page.getByRole("link", {
    name: "Abrir endereço configurado",
    exact: true,
  });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  if (!href) throw new Error("Endereço de login ausente.");
  const target = new URL(href);
  expect(target.pathname).toBe("/login");
  expect(target.origin).not.toBe(new URL(page.url()).origin);
  expect(requests).toBe(0);
});
