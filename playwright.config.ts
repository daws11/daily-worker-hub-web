import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 1,
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',
    // Use xvfb for virtual display in containerized environment
    launchOptions: {
      args: ['--no-sandbox'],
      // No need for xvfb-run, we can use xvfb directly via command
    },
    // Screenshot on failure
    screenshot: 'only-on-failure',
    // Trace on failure
    trace: 'on-first-retry',
    // Viewport size
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
  ],
});
