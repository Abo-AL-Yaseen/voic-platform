import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 30_000,
  outputDir: ".tmp/playwright-results",
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:8443", channel: "chrome", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "node dist/main.js",
      cwd: "../backend",
      url: "http://127.0.0.1:3000/api/v1/health/live",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "pnpm.cmd dev --host 127.0.0.1",
      url: "http://127.0.0.1:8443",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
