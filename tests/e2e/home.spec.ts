import { expect, test } from "@playwright/test";
test("página inicial e navegação interna", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("DSI Panel | Início");
  await expect(
    page.getByRole("heading", { name: "Nosso trabalho, mais conectado." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explorar o ambiente" }).click();
  await expect(page).toHaveURL(/#recursos$/);
  await expect(
    page.getByRole("heading", { name: "Ferramentas do DSI" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
