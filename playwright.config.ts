import { defineConfig, devices } from "@playwright/test";
const externalBaseURL = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: "./tests/e2e",
  // O Playwright remove a saída antes de iniciar; preserve a raiz do volume montado.
  outputDir: "./test-results/artifacts",
  use: {
    baseURL: externalBaseURL ?? "http://127.0.0.1:3000",
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        env: { KEYCLOAK_ENABLED: "false" },
      },
});
