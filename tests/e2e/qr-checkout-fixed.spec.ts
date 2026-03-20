/**
 * E2E Test: QR Scanner & Check-out with Fixed Credentials
 */

import { test } from "@playwright/test";

// Updated credentials with valid password hash
const WORKER_EMAIL = "test.worker@dailyworker.id";
const BUSINESS_EMAIL = "test.business@dailyworker.id";
const PASSWORD = "Test123!";

test.describe("QR Scanner & Check-out Screenshots", () => {
  test("Worker: Capture QR Scanner and Check-in/Check-out", async ({
    page,
  }) => {
    console.log("\n🔑 Testing with fixed credentials...");
    console.log(`Email: ${WORKER_EMAIL}`);

    // ===== LOGIN =====
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);

    // Select worker role
    const workerBtn = page.getByRole("button", { name: /pekerja|worker/i });
    if ((await workerBtn.count()) > 0) {
      await workerBtn.first().click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(8000);

    console.log(`After login URL: ${page.url()}`);

    // Screenshot: After login
    await page.screenshot({
      path: "test-results/qr-checkout-final/01-after-login.png",
      fullPage: true,
    });

    // ===== ATTENDANCE PAGE =====
    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    console.log(`Attendance URL: ${page.url()}`);

    // Screenshot: Attendance page
    await page.screenshot({
      path: "test-results/qr-checkout-final/02-attendance-page.png",
      fullPage: true,
    });
    console.log("✅ Screenshot 2: Attendance page");

    // ===== LIST ALL BUTTONS =====
    const allButtons = await page.locator("button").allTextContents();
    console.log("\n📋 All buttons on page:");
    allButtons.forEach((btn, i) => console.log(`  ${i + 1}. "${btn}"`));

    // ===== QR SCANNER =====
    const qrScanBtn = page.getByRole("button", {
      name: /scan|qr|camera|kamera/i,
    });
    const qrScanCount = await qrScanBtn.count();
    console.log(`\n📱 QR Scanner buttons: ${qrScanCount}`);

    if (qrScanCount > 0) {
      await qrScanBtn
        .first()
        .screenshot({
          path: "test-results/qr-checkout-final/03-qr-scanner-button.png",
        });
      console.log("✅ Screenshot 3: QR Scanner button");

      await qrScanBtn.first().click({ force: true });
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: "test-results/qr-checkout-final/04-qr-scanner-dialog.png",
        fullPage: true,
      });
      console.log("✅ Screenshot 4: QR Scanner dialog");
    }

    // ===== CHECK-IN =====
    const checkInBtn = page.getByRole("button", { name: /check.?in|masuk/i });
    const checkInCount = await checkInBtn.count();
    console.log(`\n📍 Check-in buttons: ${checkInCount}`);

    if (checkInCount > 0) {
      await checkInBtn
        .first()
        .screenshot({
          path: "test-results/qr-checkout-final/05-check-in-button.png",
        });
      console.log("✅ Screenshot 5: Check-in button");

      await checkInBtn.first().click({ force: true });
      await page.waitForTimeout(5000);

      await page.screenshot({
        path: "test-results/qr-checkout-final/06-after-check-in.png",
        fullPage: true,
      });
      console.log("✅ Screenshot 6: After check-in");

      // ===== CHECK-OUT (should appear after check-in) =====
      const checkOutBtn = page.getByRole("button", {
        name: /check.?out|keluar/i,
      });
      const checkOutCount = await checkOutBtn.count();
      console.log(`\n🚪 Check-out buttons: ${checkOutCount}`);

      if (checkOutCount > 0) {
        await checkOutBtn
          .first()
          .screenshot({
            path: "test-results/qr-checkout-final/07-check-out-button.png",
          });
        console.log("✅ Screenshot 7: Check-out button");

        await checkOutBtn.first().click({ force: true });
        await page.waitForTimeout(5000);

        await page.screenshot({
          path: "test-results/qr-checkout-final/08-after-check-out.png",
          fullPage: true,
        });
        console.log("✅ Screenshot 8: After check-out");
      } else {
        console.log("⚠️ No check-out button found");
      }
    }

    // ===== ATTENDANCE HISTORY =====
    await page.screenshot({
      path: "test-results/qr-checkout-final/09-attendance-history.png",
      fullPage: true,
    });
    console.log("✅ Screenshot 9: Attendance history");

    console.log("✅ Worker test complete!");
  });

  test("Business: QR Code Generator and Worker Status", async ({ page }) => {
    console.log("\n🏢 Business test...");
    console.log(`Email: ${BUSINESS_EMAIL}`);

    // ===== LOGIN =====
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);

    const businessBtn = page.getByRole("button", { name: /bisnis|business/i });
    if ((await businessBtn.count()) > 0) {
      await businessBtn.first().click({ force: true });
    }

    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(8000);

    console.log(`After login URL: ${page.url()}`);

    // ===== JOB ATTENDANCE =====
    await page.goto("/business/job-attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    console.log(`Business attendance URL: ${page.url()}`);

    // Screenshot: Business job attendance
    await page.screenshot({
      path: "test-results/qr-checkout-final/10-business-attendance.png",
      fullPage: true,
    });
    console.log("✅ Screenshot 10: Business attendance");

    // ===== QR CODE =====
    const qrCode = page.locator("svg").first();
    if ((await qrCode.count()) > 0) {
      await qrCode.screenshot({
        path: "test-results/qr-checkout-final/11-qr-code.png",
      });
      console.log("✅ Screenshot 11: QR Code");
    }

    // ===== WORKER STATUS =====
    const workerStatus = page.locator(
      "text=/checked.?in|sudah hadir|pending|belum|completed|selesai/i",
    );
    if ((await workerStatus.count()) > 0) {
      await workerStatus
        .first()
        .screenshot({
          path: "test-results/qr-checkout-final/12-worker-status.png",
        });
      console.log("✅ Screenshot 12: Worker status");
    }

    // ===== FULL PAGE =====
    await page.screenshot({
      path: "test-results/qr-checkout-final/13-business-full.png",
      fullPage: true,
    });
    console.log("✅ Screenshot 13: Business full page");

    console.log("✅ Business test complete!");
  });
});
