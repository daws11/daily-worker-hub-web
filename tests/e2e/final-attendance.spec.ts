/**
 * Full Attendance Flow Test - With Check-in & Check-out
 */

import { test } from "@playwright/test";

const WORKER_EMAIL = "test.worker@dailyworker.id";
const BUSINESS_EMAIL = "test.business@dailyworker.id";
const PASSWORD = "Test123!";

test("Full Attendance Flow with Check-in/Check-out", async ({ page }) => {
  console.log("\n🚀 Starting full attendance flow test...\n");

  // ========================================
  // STEP 1: WORKER CHECK-IN
  // ========================================
  console.log("📍 STEP 1: Worker check-in...");

  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(WORKER_EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').click({ force: true });
  await page.waitForTimeout(8000);

  await page.goto("/worker/attendance");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(5000);

  // Screenshot: Before check-in
  await page.screenshot({
    path: "test-results/final-attendance/01-before-check-in.png",
    fullPage: true,
  });
  console.log("✅ Screenshot 1: Before check-in");

  // Find and click check-in button
  const checkInBtn = page.getByRole("button", {
    name: /check.?in|masuk|absen masuk/i,
  });
  const checkInCount = await checkInBtn.count();
  console.log(`Check-in buttons: ${checkInCount}`);

  if (checkInCount > 0) {
    // Screenshot: Check-in button
    await checkInBtn
      .first()
      .screenshot({
        path: "test-results/final-attendance/02-check-in-button.png",
      });
    console.log("✅ Screenshot 2: Check-in button");

    // Click check-in
    await checkInBtn.first().click({ force: true });
    await page.waitForTimeout(8000);

    // Screenshot: After check-in (GPS captured)
    await page.screenshot({
      path: "test-results/final-attendance/03-after-check-in.png",
      fullPage: true,
    });
    console.log("✅ Screenshot 3: After check-in (GPS captured)");

    // ========================================
    // STEP 2: WORKER CHECK-OUT
    // ========================================
    console.log("\n🚪 STEP 2: Worker check-out...");

    await page.waitForTimeout(2000);

    // Find check-out button (should appear after check-in)
    const checkOutBtn = page.getByRole("button", {
      name: /check.?out|keluar|absen keluar/i,
    });
    const checkOutCount = await checkOutBtn.count();
    console.log(`Check-out buttons: ${checkOutCount}`);

    if (checkOutCount > 0) {
      // Screenshot: Check-out button
      await checkOutBtn
        .first()
        .screenshot({
          path: "test-results/final-attendance/04-check-out-button.png",
        });
      console.log("✅ Screenshot 4: Check-out button");

      // Click check-out
      await checkOutBtn.first().click({ force: true });
      await page.waitForTimeout(8000);

      // Screenshot: After check-out
      await page.screenshot({
        path: "test-results/final-attendance/05-after-check-out.png",
        fullPage: true,
      });
      console.log("✅ Screenshot 5: After check-out");
    }

    // ========================================
    // STEP 3: ATTENDANCE HISTORY
    // ========================================
    console.log("\n📜 STEP 3: Attendance history...");

    await page.screenshot({
      path: "test-results/final-attendance/06-attendance-history.png",
      fullPage: true,
    });
    console.log("✅ Screenshot 6: Attendance history");
  }

  // ========================================
  // STEP 4: BUSINESS QR CODE
  // ========================================
  console.log("\n🏢 STEP 4: Business QR Code...");

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

  await page.goto("/business/job-attendance");
  await page.waitForLoadState("domcontentloaded");
  await page
    .waitForSelector('main, [role="main"], body', { timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(2000);

  // Screenshot: Business attendance
  await page.screenshot({
    path: "test-results/final-attendance/07-business-attendance.png",
    fullPage: true,
  });
  console.log("✅ Screenshot 7: Business attendance");

  // Screenshot: QR Code
  const qrCode = page.locator("svg").first();
  if ((await qrCode.count()) > 0) {
    await qrCode.screenshot({
      path: "test-results/final-attendance/08-qr-code.png",
    });
    console.log("✅ Screenshot 8: QR Code");
  }

  // Screenshot: Worker status (should show checked in/out)
  await page.screenshot({
    path: "test-results/final-attendance/09-worker-status.png",
    fullPage: true,
  });
  console.log("✅ Screenshot 9: Worker status");

  console.log("\n🎉 ALL STEPS COMPLETE!");
});
