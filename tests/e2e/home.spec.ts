import { expect, test } from "@playwright/test";
const testAccess = process.env.E2E_AUTH_BYPASS_ENABLED === "true";
test("painel exige login e mostra acesso institucional ainda não configurado", async ({
  page,
}) => {
  test.skip(testAccess, "Login ignorado no modo de teste local.");
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle("Login | DSI Panel");
  const municipalLogo = page.getByRole("img", {
    name: "Prefeitura Municipal de Pindamonhangaba",
  });
  await expect(municipalLogo).toBeVisible();
  await expect(municipalLogo).toHaveJSProperty("complete", true);
  expect(
    (await page.request.get("/brand/prefeitura-pindamonhangaba.svg")).ok(),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Acesse o DSI Panel" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("alert").filter({ hasText: "indisponível" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/login-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("endpoints locais de senha e cadastro não estão expostos", async ({
  request,
}) => {
  for (const path of ["sign-in/email", "sign-up/email", "link-social"]) {
    const response = await request.post(`/api/auth/${path}`, { data: {} });
    expect(response.status()).toBe(404);
  }
});

test("contratos e chamados exigem acesso institucional", async ({
  request,
}) => {
  test.skip(testAccess, "Login ignorado no modo de teste local.");
  for (const path of ["/contracts", "/tickets"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("/login");
  }
  for (const path of ["/api/integrations/sync", "/api/tickets/contract"]) {
    expect((await request.post(path, { data: {} })).status()).toBe(401);
  }
});

test("modo de teste libera navegação sem conceder escrita", async ({
  page,
  request,
}) => {
  test.skip(!testAccess, "Modo de teste local desativado.");
  for (const path of ["/", "/contracts", "/tickets"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByText("Modo de teste · somente leitura"),
    ).toBeVisible();
  }
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);
  for (const path of ["/api/integrations/sync", "/api/tickets/contract"]) {
    expect((await request.post(path, { data: {} })).status()).toBe(403);
  }
});
