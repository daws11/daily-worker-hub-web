/**
 * E2E Test Setup: Create Test Accounts via Registration
 *
 * Test accounts:
 * - Worker: e2e.worker@test.com / E2ETest123!
 * - Business: e2e.business@test.com / E2ETest123!
 */

import { test as setup } from "@playwright/test";

// Test credentials
const WORKER_EMAIL = "e2e.worker@test.com";
const WORKER_PASSWORD = "E2ETest123!";
const WORKER_NAME = "E2E Test Worker";

const BUSINESS_EMAIL = "e2e.business@test.com";
const BUSINESS_PASSWORD = "E2ETest123!";
const BUSINESS_NAME = "E2E Test Business";

setup.describe("Setup Test Accounts", () => {
  setup("Create Worker Test Account", async ({ page }) => {
    console.log("\n📝 Creating worker test account...");
    console.log(`📧 Email: ${WORKER_EMAIL}`);

    // 1. Go to register page
    await page.goto("/register?role=worker");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: "test-results/setup/01-register-page.png",
      fullPage: true,
    });

    // 2. Fill registration form - use first text input for name
    await page.fill('input[type="email"]', WORKER_EMAIL);
    await page.fill('input[type="password"]', WORKER_PASSWORD);

    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.click({ force: true });
    await nameInput.fill(WORKER_NAME);

    // 3. Submit registration
    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);

    console.log(`After register URL: ${page.url()}`);
    await page.screenshot({
      path: "test-results/setup/02-after-register.png",
      fullPage: true,
    });

    // 4. Complete onboarding if redirected
    if (page.url().includes("onboarding")) {
      console.log("📋 Completing worker onboarding...");
      await completeWorkerOnboarding(page);
    }

    // 5. Navigate to worker attendance WITHOUT saving storage state
    // (user is already logged in from onboarding)
    console.log(
      "📋 Navigating to worker attendance (user should be logged in)",
    );
    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "test-results/setup/03-worker-attendance.png",
      fullPage: true,
    });
    console.log(`Worker attendance URL: ${page.url()}`);

    // Check for attendance elements
    const checkInBtn = await page
      .getByRole("button", { name: /check.?in/i })
      .count();
    const checkOutBtn = await page
      .getByRole("button", { name: /check.?out/i })
      .count();
    const scheduleSection = await page
      .locator("text=/jadwal|schedule|today/i")
      .count();
    const historySection = await page
      .locator("text=/history|riwayat/i")
      .count();

    console.log(`\n📊 Attendance elements found:`);
    console.log(`  - Check-in buttons: ${checkInBtn}`);
    console.log(`  - Check-out buttons: ${checkOutBtn}`);
    console.log(`  - Schedule sections: ${scheduleSection}`);
    console.log(`  - History sections: ${historySection}`);
  });

  setup("Create Business Test Account", async ({ page }) => {
    console.log("\n📝 Creating business test account...");
    console.log(`📧 Email: ${BUSINESS_EMAIL}`);

    // 1. Go to register page
    await page.goto("/register?role=business");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: "test-results/setup/04-business-register.png",
      fullPage: true,
    });

    // 2. Fill registration form
    await page.fill('input[type="email"]', BUSINESS_EMAIL);
    await page.fill('input[type="password"]', BUSINESS_PASSWORD);

    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.click({ force: true });
    await nameInput.fill(BUSINESS_NAME);

    // 3. Submit registration
    await page.locator('form button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);

    console.log(`After register URL: ${page.url()}`);
    await page.screenshot({
      path: "test-results/setup/05-after-register.png",
      fullPage: true,
    });

    // 4. Complete onboarding if redirected
    if (page.url().includes("onboarding")) {
      console.log("📋 Completing business onboarding...");
      await completeBusinessOnboarding(page);
    }

    // 5. Navigate to business attendance WITHOUT saving storage state
    console.log(
      "📋 Navigating to business job attendance (user should be logged in)",
    );
    await page.goto("/business/job-attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "test-results/setup/06-business-attendance.png",
      fullPage: true,
    });
    console.log(`Business attendance URL: ${page.url()}`);

    // Check for attendance elements
    const qrCode = await page.locator("svg").count();
    const workerList = await page.locator("text=/worker|pekerja/i").count();
    const downloadBtn = await page
      .getByRole("button", { name: /download|unduh/i })
      .count();
    const printBtn = await page
      .getByRole("button", { name: /print|cetak/i })
      .count();

    console.log(`\n📊 Business attendance elements:`);
    console.log(`  - QR codes (SVG): ${qrCode}`);
    console.log(`  - Worker mentions: ${workerList}`);
    console.log(`  - Download buttons: ${downloadBtn}`);
    console.log(`  - Print buttons: ${printBtn}`);
  });
});

// Helper function to complete worker onboarding
async function completeWorkerOnboarding(page: any) {
  // ===== STEP 1: Personal Info =====
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const fullNameInput = page.locator('input[type="text"]').first();
  if ((await fullNameInput.count()) > 0) {
    await fullNameInput.fill("E2E Test Worker");
  }

  const phoneInput = page.locator('input[type="tel"]');
  if ((await phoneInput.count()) > 0) {
    await phoneInput.fill("+6281234567890");
  }

  const dobInput = page.locator('input[type="date"]');
  if ((await dobInput.count()) > 0) {
    await dobInput.fill("1995-01-15");
  }

  await page.waitForTimeout(1000);

  // Click Next/Lanjut
  const nextBtn = page.getByRole("button", { name: /lanjut|next|continue/i });
  try {
    await nextBtn.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(500);
    await nextBtn.click({ force: true });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log("Step 1 next button not found or not clickable");
  }

  // ===== STEP 2: Location =====
  console.log("📍 Step 2: Location...");
  await page.waitForLoadState("networkidle");

  const addressInput = page.locator('input[type="text"], textarea').nth(1);
  if ((await addressInput.count()) > 0) {
    await addressInput.fill("Denpasar, Bali, Indonesia");
    await page.waitForTimeout(2000);
  }

  await page.screenshot({
    path: "test-results/setup/07-step2-filled.png",
    fullPage: true,
  });

  // Click Next
  try {
    const nextBtn2 = page.getByRole("button", {
      name: /lanjut|next|continue/i,
    });
    await nextBtn2.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(500);
    await nextBtn2.click({ force: true });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log("Step 2 next button not found");
  }

  // ===== STEP 3: Skills =====
  console.log("🎯 Step 3: Skills...");
  await page.waitForLoadState("networkidle");

  // Click any selectable item
  const selectableBtn = page
    .locator("button")
    .filter({ hasText: /housekeeping|cleaning|driver|cook/i })
    .first();
  if ((await selectableBtn.count()) > 0) {
    await selectableBtn.click({ force: true });
  }

  // Select experience level
  const expBtn = page
    .locator("button")
    .filter({ hasText: /entry|beginner|junior|mid|senior/i })
    .first();
  if ((await expBtn.count()) > 0) {
    await expBtn.click({ force: true });
  }

  // Fill bio
  const bioInput = page.locator("textarea");
  if ((await bioInput.count()) > 0) {
    await bioInput.fill(
      "E2E test worker account for automated testing purposes",
    );
  }

  // Accept terms
  const checkbox = page.locator('input[type="checkbox"]').first();
  if ((await checkbox.count()) > 0) {
    await checkbox.click({ force: true });
  }

  await page.screenshot({
    path: "test-results/setup/08-step3-filled.png",
    fullPage: true,
  });

  // Click Complete/Selesai
  try {
    const completeBtn = page.getByRole("button", {
      name: /selesai|complete|finish|submit/i,
    });
    await completeBtn.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(500);
    await completeBtn.click({ force: true });
    await page.waitForTimeout(5000);
    console.log("✅ Worker onboarding completed");
  } catch (e) {
    console.log("Complete button not found");
  }
}

// Helper function to complete business onboarding
async function completeBusinessOnboarding(page: any) {
  await page.waitForLoadState("networkidle");

  // Fill business name
  const nameInput = page.locator('input[type="text"]').first();
  if ((await nameInput.count()) > 0) {
    await nameInput.fill("E2E Test Business");
  }

  const phoneInput = page.locator('input[type="tel"]');
  if ((await phoneInput.count()) > 0) {
    await phoneInput.fill("+6281234567891");
  }

  // Fill address
  const addressInput = page.locator('input[type="text"], textarea').nth(1);
  if ((await addressInput.count()) > 0) {
    await addressInput.fill("Kuta, Bali, Indonesia");
    await page.waitForTimeout(2000);
  }

  // Accept terms
  const checkbox = page.locator('input[type="checkbox"]').first();
  if ((await checkbox.count()) > 0) {
    await checkbox.click({ force: true });
  }

  await page.screenshot({
    path: "test-results/setup/09-business-filled.png",
    fullPage: true,
  });

  // Submit
  try {
    const submitBtn = page.getByRole("button", {
      name: /selesai|complete|finish|submit|lanjut/i,
    });
    await submitBtn.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(500);
    await submitBtn.click({ force: true });
    await page.waitForTimeout(5000);
    console.log("✅ Business onboarding completed");
  } catch (e) {
    console.log("Business submit button not found");
  }
}
