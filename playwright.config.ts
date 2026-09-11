import { defineConfig } from "@playwright/test";

/**
 * Testes de fumaça do workspace. Rode com o app no ar:
 *   GX_TEST_BASE_URL=https://... GX_TEST_EMAIL=... GX_TEST_PASSWORD=... npx playwright test
 * Sem GX_TEST_BASE_URL o alvo é http://localhost:3000.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.GX_TEST_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
