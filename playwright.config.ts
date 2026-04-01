import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000, // Increased from 30s to 60s
  fullyParallel: false,
  workers: 1, // Single worker to prevent Chromium singleton socket conflicts
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
    // Chromium (local development)
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath:
            "/Users/yanuar/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-crashpad",
            "--disable-mach-lookup",
            "--crash-dumps-dir=/dev/null",
          ],
        },
      },
    },
    // Firefox
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    // WebKit
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },
    // Staging environment - Chromium
    {
      name: "staging-chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        baseURL: "http://staging.local:3000",
      },
    },
  ],
});
