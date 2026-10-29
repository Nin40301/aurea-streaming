import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "evidence/e2e-results.json" }],
    ["html", { open: "never" }],
  ],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
});
