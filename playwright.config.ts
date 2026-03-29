import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000, // Increased from 30s to 60s
  fullyParallel: false,
  retries: 1,
  use: {
    // Base URL for tests
    baseURL: "http://localhost:3000",
    // Browser launch options for containerized environment
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    // Navigation and action timeouts
    navigationTimeout: 30000,
    actionTimeout: 15000,
    // Screenshot on failure
    screenshot: "only-on-failure",
    // Trace on failure
    trace: "on-first-retry",
    // Viewport size
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
  ],
});
