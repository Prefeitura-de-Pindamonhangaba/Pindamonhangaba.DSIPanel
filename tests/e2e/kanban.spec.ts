import { test, expect } from "@playwright/test";
test("quadro Kanban exibe etapas e preserva navegação em celular", async ({
  page,
}) => {
  test.skip(
    process.env.E2E_AUTH_BYPASS_ENABLED !== "true",
    "Teste de visualização local.",
  );
  await page.goto("/kanban");
  await expect(
    page.getByRole("heading", { name: "Quadro do DSI" }),
  ).toBeVisible();
  for (const name of ["A fazer", "Em andamento", "Em revisão", "Concluído"])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByText("Você está visualizando o quadro.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Novo cartão" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: /Arquivados/ }).click();
  await expect(
    page.getByRole("heading", { name: "Cartões arquivados" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar ao quadro" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/kanban-${test.info().project.name}.png`,
    fullPage: true,
  });
});
