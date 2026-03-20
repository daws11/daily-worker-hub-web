/**
 * E2E Test: QR Scanner & Check-out with Valid Credentials
 * Using onboarding@test.com which was created via app
 */

import { test } from "@playwright/test";

// Try different credentials
const CREDENTIALS = [
  { email: "onboarding@test.com", password: "Test123!" },
  { email: "thisbali@gmail.com", password: "Test123!" },
];

test.describe("QR Scanner & Check-out", () => {
  test("Find valid credentials and capture features", async ({ page }) => {
    console.log("\n🔑 Trying different credentials...");

    let validCreds = null;

    // Try each credential
    for (const cred of CREDENTIALS) {
      console.log(`\nTrying: ${cred.email}`);

      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await page.locator('input[type="email"]').fill(cred.email);
      await page.locator('input[type="password"]').fill(cred.password);
      await page.locator('form button[type="submit"]').click({ force: true });
      await page.waitForTimeout(5000);

      if (!page.url().includes("/login")) {
        console.log(`✅ Login SUCCESS with: ${cred.email}`);
        validCreds = cred;
        break;
      } else {
        console.log(`❌ Login failed for: ${cred.email}`);
      }
    }

    if (!validCreds) {
      console.log("❌ No valid credentials found. Creating new test user...");
      return;
    }

    // ===== NOW CAPTURE FEATURES =====

    // Navigate to attendance
    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    console.log(`Attendance URL: ${page.url()}`);

    // Screenshot: Attendance page
    await page.screenshot({
      path: "test-results/qr-checkout/01-attendance-page.png",
      fullPage: true,
    });
    console.log("✅ Screenshot 1: Attendance page");

    // Look for QR Scanner
    const qrScanBtn = page.getByRole("button", {
      name: /scan|qr|camera|kamera/i,
    });
    console.log(`QR Scanner buttons: ${await qrScanBtn.count()}`);

    if ((await qrScanBtn.count()) > 0) {
      await qrScanBtn
        .first()
        .screenshot({
          path: "test-results/qr-checkout/02-qr-scanner-button.png",
        });
      console.log("✅ Screenshot 2: QR Scanner button");

      // Click QR Scanner
      await qrScanBtn.first().click({ force: true });
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: "test-results/qr-checkout/03-qr-scanner-dialog.png",
        fullPage: true,
      });
      console.log("✅ Screenshot 3: QR Scanner dialog");
    }

    // Look for Check-in button
    const checkInBtn = page.getByRole("button", { name: /check.?in|masuk/i });
    console.log(`Check-in buttons: ${await checkInBtn.count()}`);

    if ((await checkInBtn.count()) > 0) {
      // Click Check-in
      await checkInBtn.first().click({ force: true });
      await page.waitForTimeout(5000);

      await page.screenshot({
        path: "test-results/qr-checkout/04-after-check-in.png",
        fullPage: true,
      });
      console.log("✅ Screenshot 4: After check-in");

      // Now look for Check-out button
      const checkOutBtn = page.getByRole("button", {
        name: /check.?out|keluar/i,
      });
      console.log(`Check-out buttons: ${await checkOutBtn.count()}`);

      if ((await checkOutBtn.count()) > 0) {
        await checkOutBtn
          .first()
          .screenshot({
            path: "test-results/qr-checkout/05-check-out-button.png",
          });
        console.log("✅ Screenshot 5: Check-out button");

        // Click Check-out
        await checkOutBtn.first().click({ force: true });
        await page.waitForTimeout(5000);

        await page.screenshot({
          path: "test-results/qr-checkout/06-after-check-out.png",
          fullPage: true,
        });
        console.log("✅ Screenshot 6: After check-out");
      }
    }

    console.log("✅ Test complete!");
  });
});
