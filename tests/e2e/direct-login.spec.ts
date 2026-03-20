/**
 * E2E Test: Direct Login then Attendance
 *
 * Test accounts:
 * - Worker: e2e.worker@test.com / E2ETest123!
 * - Business: e2e.business@test.com / E2ETest123!
 */

import { test } from "@playwright/test";

// Test credentials
const WORKER_EMAIL = "e2e.worker@test.com";
const WORKER_PASSWORD = "E2ETest123!";

const BUSINESS_EMAIL = "e2e.business@test.com";
const BUSINESS_PASSWORD = "E2ETest123!";

test.describe("Direct Login & Attendance Screenshots", () => {
  test("Worker: Login then Attendance Page", async ({ page }) => {
    console.log("\n📝 Worker login & attendance test...");

    // 1. Login via login page
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: "test-results/direct-login/01-worker-login.png",
      fullPage: true,
    });

    // Fill login form
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(WORKER_PASSWORD);

    // Select worker role if needed
    const workerBtn = page.getByRole("button", { name: /pekerja|worker/i });
    if ((await workerBtn.count()) > 0) {
      await workerBtn.first().click({ force: true });
    }

    await page.screenshot({
      path: "test-results/direct-login/02-filled-form.png",
      fullPage: true,
    });

    // Submit login
    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(8000);

    console.log(`After login URL: ${page.url()}`);
    await page.screenshot({
      path: "test-results/direct-login/03-after-login.png",
      fullPage: true,
    });

    // Navigate to attendance
    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "test-results/direct-login/04-worker-attendance.png",
      fullPage: true,
    });
    console.log(`Worker attendance URL: ${page.url()}`);

    // Check for attendance elements
    const heading = await page.locator("h1, h2").first().textContent();
    const checkInBtn = await page
      .getByRole("button", { name: /check.?in/i })
      .count();
    const checkOutBtn = await page
      .getByRole("button", { name: /check.?out/i })
      .count();
    const schedule = await page
      .locator("text=/jadwal|schedule|today/i")
      .count();
    const history = await page.locator("text=/history|riwayat/i").count();

    console.log(`\n📊 Worker attendance elements:`);
    console.log(`  Heading: ${heading}`);
    console.log(`  - Check-in buttons: ${checkInBtn}`);
    console.log(`  - Check-out buttons: ${checkOutBtn}`);
    console.log(`  - Schedule: ${schedule}`);
    console.log(`  - History: ${history}`);

    if (page.url().includes("/worker/attendance")) {
      console.log("✅ Successfully on attendance page!");
    } else {
      console.log(`⚠️ Not on attendance page, URL: ${page.url()}`);
    }
  });

  test("Business: Login then Attendance Page", async ({ page }) => {
    console.log("\n🏢 Business login & attendance test...");

    // 1. Login via login page
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: "test-results/direct-login/05-business-login.png",
      fullPage: true,
    });

    // Fill login form
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD);

    // Select business role if needed
    const businessBtn = page.getByRole("button", { name: /bisnis|business/i });
    if ((await businessBtn.count()) > 0) {
      await businessBtn.first().click({ force: true });
    }

    await page.screenshot({
      path: "test-results/direct-login/06-filled-form.png",
      fullPage: true,
    });

    // Submit login
    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(8000);

    console.log(`After login URL: ${page.url()}`);
    await page.screenshot({
      path: "test-results/direct-login/07-after-login.png",
      fullPage: true,
    });

    // Navigate to attendance
    await page.goto("/business/job-attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "test-results/direct-login/08-business-attendance.png",
      fullPage: true,
    });
    console.log(`Business attendance URL: ${page.url()}`);

    // Check for attendance elements
    const heading = await page.locator("h1, h2").first().textContent();
    const qrCode = await page.locator("svg").count();
    const workers = await page.locator("text=/worker|pekerja/i").count();

    console.log(`\n📊 Business attendance elements:`);
    console.log(`  Heading: ${heading}`);
    console.log(`  - QR codes (SVG): ${qrCode}`);
    console.log(`  - Worker mentions: ${workers}`);

    if (page.url().includes("/business/job-attendance")) {
      console.log("✅ Successfully on attendance page!");
    } else {
      console.log(`⚠️ Not on attendance page, URL: ${page.url()}`);
    }
  });

  test("Combined: Both flows for screenshots", async ({ page }) => {
    // This test runs both flows in sequence to capture all screenshots

    // ===== WORKER FLOW =====
    console.log("\n=== WORKER FLOW ===");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(WORKER_PASSWORD);

    const workerBtn = page.getByRole("button", { name: /pekerja|worker/i });
    if ((await workerBtn.count()) > 0) {
      await workerBtn.first().click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(8000);

    console.log(`Worker login URL: ${page.url()}`);

    // Worker attendance
    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: "test-results/direct-login/09-worker-attendance-full.png",
      fullPage: true,
    });

    // ===== BUSINESS FLOW =====
    console.log("\n=== BUSINESS FLOW ===");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD);

    const businessBtn = page.getByRole("button", { name: /bisnis|business/i });
    if ((await businessBtn.count()) > 0) {
      await businessBtn.first().click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(8000);

    console.log(`Business login URL: ${page.url()}`);

    // Business attendance
    await page.goto("/business/job-attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: "test-results/direct-login/10-business-attendance-full.png",
      fullPage: true,
    });

    console.log("✅ All screenshots captured!");
  });
});
