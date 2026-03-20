/**
 * Debug Login Test - Investigate redirect issue
 */

import { test, expect } from "@playwright/test";

const WORKER_EMAIL = "worker@demo.com";
const WORKER_PASSWORD = "demo123456";

test("Debug: Login with network/console capture", async ({ page }) => {
  console.log("\n🔍 Debug login test...");

  // Capture console logs
  const consoleLogs: string[] = [];
  page.on("console", (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture network requests
  const networkLogs: string[] = [];
  page.on("request", (req) => {
    networkLogs.push(`-> ${req.method()} ${req.url()}`);
  });
  page.on("response", (res) => {
    networkLogs.push(`<- ${res.status()} ${res.url()}`);
  });

  // Navigate to login
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill form
  await page.locator('input[type="email"]').fill(WORKER_EMAIL);
  await page.locator('input[type="password"]').fill(WORKER_PASSWORD);

  // Check radio group state BEFORE clicking
  const radiosBefore = await page.locator('input[type="radio"]').all();
  console.log(`\n📊 Radio buttons before click: ${radiosBefore.length}`);
  for (let i = 0; i < radiosBefore.length; i++) {
    const radio = radiosBefore[i];
    const checked = await radio.isChecked();
    const value = await radio.getAttribute("value");
    console.log(`  Radio ${i}: value=${value}, checked=${checked}`);
  }

  // Click worker label (not the radio directly)
  const workerLabel = page.locator('label:has-text("Pekerja")').first();
  await workerLabel.click({ force: true });
  await page.waitForTimeout(500);

  // Check radio group state AFTER clicking
  const radiosAfter = await page.locator('input[type="radio"]').all();
  console.log(`\n📊 Radio buttons after click: ${radiosAfter.length}`);
  for (let i = 0; i < radiosAfter.length; i++) {
    const radio = radiosAfter[i];
    const checked = await radio.isChecked();
    const value = await radio.getAttribute("value");
    console.log(`  Radio ${i}: value=${value}, checked=${checked}`);
  }

  // Submit
  console.log("\n📤 Submitting login form...");
  await page.locator('button[type="submit"]').click({ force: true });

  // Wait and observe
  console.log("\n⏳ Waiting 5 seconds for redirect...");
  await page.waitForTimeout(5000);

  const finalUrl = page.url();
  console.log(`\n📍 Final URL: ${finalUrl}`);

  // Print console logs
  console.log("\n📜 Console logs:");
  consoleLogs.forEach((log) => console.log(`  ${log}`));

  // Print relevant network logs (only auth-related)
  console.log("\n🌐 Network logs (auth-related):");
  networkLogs
    .filter(
      (log) =>
        log.includes("auth") ||
        log.includes("token") ||
        log.includes("session"),
    )
    .forEach((log) => console.log(`  ${log}`));

  // Take screenshot
  await page.screenshot({
    path: "test-results/debug-login-final.png",
    fullPage: true,
  });

  // Check for errors on page
  const hasError =
    (await page.locator('[role="alert"], .error, .toast-error').count()) > 0;
  console.log(`\n❌ Has error on page: ${hasError}`);

  // Check if form is still visible (means we're still on login)
  const formVisible = await page.locator("form").isVisible();
  console.log(`📝 Form still visible: ${formVisible}`);
});
