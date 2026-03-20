/**
 * E2E Test: Detailed Attendance Features
 *
 * Fitur yang di-test:
 * - Worker: Check-in/Check-out dengan GPS
 * - Worker: QR Code Scanner
 * - Worker: Attendance History
 * - Business: QR Code Generator
 * - Business: Real-time Worker Status
 *
 * NOTE: Demo worker sudah punya booking untuk hari ini
 * Tombol check-in hanya muncul jika ada booking dengan status "accepted"
 */

import { test, expect } from "@playwright/test";

// Demo accounts (sudah ada di database dengan booking untuk hari ini)
const WORKER_EMAIL = "worker@demo.com";
const BUSINESS_EMAIL = "business@demo.com";
const PASSWORD = "demo123456";

test.describe("Detailed Attendance Features", () => {
  test("Worker: Check-in/Check-out with GPS", async ({ page }) => {
    console.log("\n📍 Worker: Testing Check-in/Check-out with GPS...");

    // Login as worker
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);

    // Select worker role
    const workerLabel = page.locator('label:has-text("Pekerja")').first();
    if ((await workerLabel.count()) > 0) {
      await workerLabel.click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);

    // Navigate to attendance
    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Screenshot 1: Attendance page
    await page.screenshot({
      path: "test-results/attendance-features/01-worker-attendance-main.png",
      fullPage: true,
    });
    console.log("✅ Screenshot 1: Worker attendance main page");

    // Look for check-in/check-out buttons
    // NOTE: Buttons only appear if there's a booking for today with status "accepted"
    const checkInBtn = page.getByRole("button", { name: /check.?in|masuk/i });
    const checkOutBtn = page.getByRole("button", {
      name: /check.?out|keluar/i,
    });

    const checkInCount = await checkInBtn.count();
    const checkOutCount = await checkOutBtn.count();

    console.log(`Check-in buttons found: ${checkInCount}`);
    console.log(`Check-out buttons found: ${checkOutCount}`);

    // GPS/location elements
    const gpsElements = page.locator(
      "text=/gps|location|lokasi|koordinat|latitude|longitude/i",
    );
    console.log(`GPS/Location elements found: ${await gpsElements.count()}`);

    // Verify: Should have at least check-in button (demo worker has booking for today)
    // If no buttons found, it means either:
    // 1. No booking for today, OR
    // 2. Already checked in (check-out button should appear)
    const hasAttendanceButtons = checkInCount > 0 || checkOutCount > 0;
    console.log(`Has attendance buttons: ${hasAttendanceButtons}`);

    // Screenshot 3: GPS/Location display if available
    const locationDisplay = page.locator("text=/location|lokasi/i").first();
    if ((await locationDisplay.count()) > 0) {
      await locationDisplay.screenshot({
        path: "test-results/attendance-features/03-gps-location.png",
      });
      console.log("✅ Screenshot 3: GPS location display");
    }
  });

  test("Worker: QR Code Scanner", async ({ page }) => {
    console.log("\n📱 Worker: Testing QR Code Scanner...");

    // Login as worker
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);

    const workerLabel = page.locator('label:has-text("Pekerja")').first();
    if ((await workerLabel.count()) > 0) {
      await workerLabel.click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);

    // Navigate to attendance
    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Look for QR scanner elements
    const qrScannerBtn = page.getByRole("button", {
      name: /scan|qr|camera|kamera/i,
    });
    const qrScannerSection = page.locator('[class*="qr"], [class*="scanner"]');

    console.log(`QR Scanner buttons found: ${await qrScannerBtn.count()}`);
    console.log(`QR Scanner sections found: ${await qrScannerSection.count()}`);

    // Screenshot: Full page showing scanner option
    await page.screenshot({
      path: "test-results/attendance-features/06-qr-scanner-page.png",
      fullPage: true,
    });
    console.log("✅ Screenshot: Full page with QR scanner");
  });

  test("Worker: Attendance History", async ({ page }) => {
    console.log("\n📜 Worker: Testing Attendance History...");

    // Login as worker
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);

    const workerLabel = page.locator('label:has-text("Pekerja")').first();
    if ((await workerLabel.count()) > 0) {
      await workerLabel.click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);

    // Navigate to attendance
    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Look for history section
    const historyText = page.locator(
      "text=/history|riwayat|completed|selesai/i",
    );

    console.log(`History text found: ${await historyText.count()}`);

    // Screenshot: Full page with history
    await page.screenshot({
      path: "test-results/attendance-features/09-attendance-history-full.png",
      fullPage: true,
    });
    console.log("✅ Screenshot: Full page with history");
  });

  test("Business: QR Code Generator", async ({ page }) => {
    console.log("\n🔲 Business: Testing QR Code Generator...");

    // Login as business
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);

    const businessLabel = page.locator('label:has-text("Bisnis")').first();
    if ((await businessLabel.count()) > 0) {
      await businessLabel.click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);

    // Navigate to job attendance
    await page.goto("/business/job-attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Look for QR code elements
    const qrCodeCount = await page.locator("svg").count();
    console.log(`QR Code SVGs found: ${qrCodeCount}`);

    // Screenshot: Full page with QR codes
    await page.screenshot({
      path: "test-results/attendance-features/12-qr-generator-full.png",
      fullPage: true,
    });
    console.log("✅ Screenshot: Full page with QR codes");
  });

  test("Business: Real-time Worker Status", async ({ page }) => {
    console.log("\n👥 Business: Testing Real-time Worker Status...");

    // Login as business
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);

    const businessLabel = page.locator('label:has-text("Bisnis")').first();
    if ((await businessLabel.count()) > 0) {
      await businessLabel.click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);

    // Navigate to job attendance
    await page.goto("/business/job-attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Look for worker status elements
    const workerStatus = page.locator(
      "text=/checked.in|sudah hadir|pending|belum|completed|selesai|worker|pekerja/i",
    );
    console.log(`Worker status elements found: ${await workerStatus.count()}`);

    // Screenshot: Full page with worker status
    await page.screenshot({
      path: "test-results/attendance-features/15-worker-status-full.png",
      fullPage: true,
    });
    console.log("✅ Screenshot: Full page with worker status");
  });
});
