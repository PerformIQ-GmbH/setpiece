import { defineConfig, devices } from "@playwright/test";
import { STATE_PATH } from "./tests/e2e/paths";

const domain = process.env.REPLIT_DEV_DOMAIN;
if (!domain) {
  throw new Error("REPLIT_DEV_DOMAIN must be set to run the e2e suite.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `https://${domain}`,
    storageState: STATE_PATH,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
