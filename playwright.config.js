import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "docs/evidence/browser-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4325",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/test-server.mjs",
    url: "http://127.0.0.1:4325",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
