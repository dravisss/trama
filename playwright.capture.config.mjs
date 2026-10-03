import { defineConfig } from "@playwright/test";

const outputDir = new URL("./artifacts/ui-capture/", import.meta.url).pathname;

export default defineConfig({
  testDir: "./e2e/capture",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: `${outputDir}/.playwright`,
  globalSetup: "./e2e/support/global-setup.mjs",
  use: {
    channel: process.env.TRAMA_PLAYWRIGHT_CHANNEL || process.env.LOOPVIEWER_PLAYWRIGHT_CHANNEL || undefined,
    screenshot: "off",
    trace: "off",
    video: "off"
  }
});
