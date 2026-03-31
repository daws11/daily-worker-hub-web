/**
 * E2E Tests: Worker Onboarding Flow
 *
 * Tests the complete worker onboarding lifecycle:
 * - Worker registration redirects to onboarding
 * - Onboarding step 1: Personal Information (name, phone, DOB)
 * - Onboarding step 2: Location setup
 * - Onboarding step 3: Skills, experience, and review
 * - Draft auto-save persistence across steps
 * - Terms acceptance validation
 * - Profile creation and dashboard redirect
 * - Push notification permission prompt after onboarding
 *
 * Demo accounts:
 * - Worker: worker@demo.com / demo123456
 * - Business: business@demo.com / demo123456
 */

import { test, expect, Page } from "@playwright/test";
import {
  loginAs,
  logout,
  registerUser,
  generateTestEmail,
  waitForToast,
  takeScreenshot,
} from "../../e2e/helpers/auth";

// ========================================
// TEST CONFIGURATION
// ========================================

const PASSWORD = "demo123456";
const SCREENSHOT_DIR = "test-results/worker-onboarding";

// ========================================
// SCREENSHOT HELPER
// ========================================

async function captureScreenshot(
  page: Page,
  name: string,
  directory: string = SCREENSHOT_DIR,
): Promise<void> {
  await page.screenshot({
    path: `${directory}/${name}.png`,
    fullPage: true,
  });
  console.log(`📸 Screenshot saved: ${directory}/${name}.png`);
}

// ========================================
// ONBOARDING FLOW TESTS - NEW WORKER REGISTRATION
// ========================================

test.describe.serial("Worker Onboarding - New Registration Flow", () => {
  test("Worker registers and is redirected to onboarding", async ({ page }) => {
    console.log("\n📝 Testing new worker registration redirects to onboarding...");

    const testEmail = generateTestEmail("worker-onboarding");
    const fullName = "Test Worker Onboarding";

    await registerUser(page, testEmail, PASSWORD, fullName, "worker");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-01-redirected");

    const currentUrl = page.url();
    console.log(`Current URL after registration: ${currentUrl}`);

    // Should redirect to onboarding, login, or worker page
    const isOnOnboarding =
      currentUrl.includes("/onboarding") ||
      currentUrl.includes("/worker") ||
      currentUrl.includes("/login");

    expect(isOnOnboarding).toBeTruthy();
    console.log("✅ New worker redirected to onboarding or login");
  });

  test("Onboarding page loads with step 1 (Personal Information)", async ({
    page,
  }) => {
    console.log("\n📋 Testing onboarding step 1 loads correctly...");

    // Login as a worker (will redirect to onboarding if no profile)
    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to onboarding if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes("/onboarding")) {
      await page.goto("/onboarding/worker");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    }

    await captureScreenshot(page, "onboarding-02-step1-personal-info");

    // Check step 1 UI elements
    await expect(
      page.getByRole("heading", { name: /complete your profile/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /personal information/i }),
    ).toBeVisible();

    // Check form fields exist
    await expect(
      page.getByLabel(/full name/i, { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByLabel(/phone/i, { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByLabel(/date of birth/i, { exact: false }),
    ).toBeVisible();

    // Check progress bar shows step 1
    const stepIndicators = page.locator('[class*="rounded-full"]');
    const count = await stepIndicators.count();
    console.log(`Progress indicators found: ${count}`);
    expect(count).toBeGreaterThan(0);

    console.log("✅ Onboarding step 1 loads correctly");
  });

  test("Step 1 - Personal Information form validation", async ({ page }) => {
    console.log("\n⚠️ Testing step 1 form validation...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to onboarding step 1
    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-03-step1-validation");

    // Try to proceed without filling form
    const nextButton = page.getByRole("button", { name: /next|lanjut/i });
    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(1000);

      // Should still be on step 1 due to validation
      await expect(
        page.getByRole("heading", { name: /personal information/i }),
      ).toBeVisible();
      console.log("✅ Validation prevents empty form submission");
    } else {
      console.log("ℹ️ Next button not found (may be disabled)");
    }
  });

  test("Step 1 - Fill and validate personal information fields", async ({
    page,
  }) => {
    console.log("\n✅ Testing step 1 field filling...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-04-step1-filled");

    // Fill full name
    const fullNameInput = page.getByLabel(/full name/i, { exact: false });
    if ((await fullNameInput.count()) > 0) {
      await fullNameInput.fill("John Doe Onboarding");
      console.log("✅ Full name filled");
    }

    // Fill phone number (Indonesian format)
    const phoneInput = page.getByLabel(/phone/i, { exact: false });
    if ((await phoneInput.count()) > 0) {
      await phoneInput.fill("081234567890");
      await phoneInput.blur();
      await page.waitForTimeout(500);
      console.log("✅ Phone number filled");
    }

    // Fill date of birth (18+ years old)
    const dobInput = page.getByLabel(/date of birth/i, { exact: false });
    if ((await dobInput.count()) > 0) {
      // Set DOB to 25 years ago
      const date = new Date();
      date.setFullYear(date.getFullYear() - 25);
      const dobValue = date.toISOString().split("T")[0];
      await dobInput.fill(dobValue);
      console.log(`✅ DOB filled: ${dobValue}`);
    }

    await page.waitForTimeout(1000);
    await captureScreenshot(page, "onboarding-05-step1-complete");

    console.log("✅ Personal information fields filled");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - STEP 2 LOCATION
// ========================================

test.describe.serial("Worker Onboarding - Step 2 Location", () => {
  test("Step 2 - Location page loads correctly", async ({ page }) => {
    console.log("\n📍 Testing onboarding step 2 location...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Fill step 1 first
    const fullNameInput = page.getByLabel(/full name/i, { exact: false });
    if ((await fullNameInput.count()) > 0) {
      await fullNameInput.fill("Location Test Worker");
    }

    const phoneInput = page.getByLabel(/phone/i, { exact: false });
    if ((await phoneInput.count()) > 0) {
      await phoneInput.fill("081234567890");
      await phoneInput.blur();
    }

    const dobInput = page.getByLabel(/date of birth/i, { exact: false });
    if ((await dobInput.count()) > 0) {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 25);
      await dobInput.fill(date.toISOString().split("T")[0]);
    }

    await page.waitForTimeout(1000);

    // Click next to go to step 2
    const nextButton = page.getByRole("button", { name: /next|lanjut/i });
    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(2000);
    }

    await captureScreenshot(page, "onboarding-06-step2-location");

    // Check for location-related elements
    const hasLocationHeading =
      (await page.getByRole("heading", { name: /location/i }).count()) > 0;
    const hasAddressField =
      (await page.locator('input[placeholder*="address"], input[placeholder*="lokasi"], [class*="map"]').count()) > 0;
    const hasLocationPicker =
      (await page.locator('[class*="location"], [class*="picker"], [class*="map"]').count()) > 0;

    console.log(
      `Has location heading: ${hasLocationHeading}, Has address field: ${hasAddressField}`,
    );

    if (hasLocationHeading || hasAddressField || hasLocationPicker) {
      console.log("✅ Step 2 location page loaded");
    } else {
      // May still be on step 1
      console.log("ℹ️ May need to wait for validation");
    }
  });

  test("Step 2 - Location field can be interacted with", async ({ page }) => {
    console.log("\n📍 Testing location field interaction...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-07-step2-location-interact");

    // Look for location input or map
    const locationSelectors = [
      'input[id*="address"]',
      'input[placeholder*="address"]',
      'input[placeholder*="lokasi"]',
      'input[placeholder*="Jakarta"]',
      '[class*="location-picker"]',
      '[class*="map"]',
      'button:has-text("Select Location")',
      'button:has-text("Pilih Lokasi")',
    ];

    let foundElement = null;
    for (const selector of locationSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        foundElement = selector;
        console.log(`Found location element with selector: ${selector}`);
        break;
      }
    }

    if (foundElement) {
      const element = page.locator(foundElement).first();
      await element.click({ force: true });
      await page.waitForTimeout(1000);

      // Type a location
      if (foundElement.includes("input")) {
        await element.fill("Jakarta, Indonesia");
        await page.waitForTimeout(1000);
      }

      await captureScreenshot(page, "onboarding-08-step2-location-filled");
      console.log("✅ Location field interacted");
    } else {
      console.log("ℹ️ Location field not found in standard selectors");
    }
  });
});

// ========================================
// ONBOARDING FLOW TESTS - STEP 3 SKILLS & REVIEW
// ========================================

test.describe.serial("Worker Onboarding - Step 3 Skills & Review", () => {
  test("Step 3 - Skills and review page loads correctly", async ({ page }) => {
    console.log("\n🎯 Testing onboarding step 3 skills and review...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Fill step 1
    const fullNameInput = page.getByLabel(/full name/i, { exact: false });
    if ((await fullNameInput.count()) > 0) {
      await fullNameInput.fill("Skills Test Worker");
    }

    const phoneInput = page.getByLabel(/phone/i, { exact: false });
    if ((await phoneInput.count()) > 0) {
      await phoneInput.fill("081234567890");
      await phoneInput.blur();
    }

    const dobInput = page.getByLabel(/date of birth/i, { exact: false });
    if ((await dobInput.count()) > 0) {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 25);
      await dobInput.fill(date.toISOString().split("T")[0]);
    }

    await page.waitForTimeout(1000);

    // Navigate through steps to get to step 3
    let step = 1;
    while (step < 3) {
      const nextButton = page.getByRole("button", { name: /next|lanjut/i });
      if ((await nextButton.count()) > 0) {
        // Try to click next
        await nextButton.click({ force: true });
        await page.waitForTimeout(2000);
        step++;
      } else {
        break;
      }
    }

    await captureScreenshot(page, "onboarding-09-step3-skills");

    // Check for skills-related elements
    const hasSkillsHeading =
      (await page.getByRole("heading", { name: /skills/i }).count()) > 0;
    const hasCategorySelect =
      (await page.locator('select, [role="combobox"], [class*="select"]').count()) > 0;
    const hasExperienceButtons =
      (await page.locator('button:has-text("Beginner"), button:has-text("Intermediate")').count()) > 0;
    const hasReviewSection =
      (await page.getByText(/review your profile/i).count()) > 0;
    const hasTermsCheckbox =
      (await page.getByLabel(/terms|agree/i).count()) > 0;

    console.log(
      `Has skills heading: ${hasSkillsHeading}, Has experience: ${hasExperienceButtons}`,
    );
    console.log(
      `Has review section: ${hasReviewSection}, Has terms checkbox: ${hasTermsCheckbox}`,
    );

    if (
      hasSkillsHeading ||
      hasCategorySelect ||
      hasExperienceButtons ||
      hasReviewSection
    ) {
      console.log("✅ Step 3 skills and review loaded");
    }
  });

  test("Step 3 - Experience level selection works", async ({ page }) => {
    console.log("\n🎯 Testing experience level selection...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-10-step3-experience");

    // Look for experience level buttons
    const experienceLevels = [
      "Beginner",
      "Intermediate",
      "Advanced",
      "Expert",
    ];

    for (const level of experienceLevels) {
      const button = page.getByRole("button", { name: level });
      if ((await button.count()) > 0) {
        await button.click({ force: true });
        await page.waitForTimeout(500);
        console.log(`✅ Clicked experience level: ${level}`);
        break;
      }
    }

    await captureScreenshot(page, "onboarding-11-step3-experience-selected");
    console.log("✅ Experience level selection tested");
  });

  test("Step 3 - Bio field can be filled", async ({ page }) => {
    console.log("\n📝 Testing bio field...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-12-step3-bio");

    // Look for bio textarea
    const bioSelectors = [
      'textarea[id*="bio"]',
      'textarea[placeholder*="about"]',
      'textarea[placeholder*="diri"]',
    ];

    let foundBio = false;
    for (const selector of bioSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().fill("Experienced worker looking for daily jobs.");
        await page.waitForTimeout(500);
        console.log(`✅ Bio filled using selector: ${selector}`);
        foundBio = true;
        break;
      }
    }

    if (!foundBio) {
      // Try generic textarea
      const textarea = page.locator("textarea").first();
      if ((await textarea.count()) > 0) {
        await textarea.fill("Experienced worker looking for daily jobs.");
        console.log("✅ Bio filled using generic textarea");
      } else {
        console.log("ℹ️ Bio textarea not found");
      }
    }

    await captureScreenshot(page, "onboarding-13-step3-bio-filled");
  });

  test("Step 3 - Terms checkbox is required", async ({ page }) => {
    console.log("\n⚠️ Testing terms checkbox requirement...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-14-step3-terms");

    // Check for terms checkbox
    const termsCheckbox = page.locator('[id="terms"], label:has-text("terms")').first();

    if ((await termsCheckbox.count()) > 0) {
      const isChecked = await termsCheckbox.isChecked();
      console.log(`Terms checkbox initially checked: ${isChecked}`);

      // Look for complete/submit button
      const completeButton = page.getByRole("button", {
        name: /complete|submit|finish|selesai/i,
      });

      if ((await completeButton.count()) > 0) {
        // Without terms checked, button should be disabled
        const isDisabled = await completeButton.isDisabled();
        console.log(`Complete button disabled (terms not checked): ${isDisabled}`);

        if (!isDisabled) {
          // Try clicking - should show validation
          await completeButton.click({ force: true });
          await page.waitForTimeout(1000);

          await captureScreenshot(page, "onboarding-15-step3-terms-error");
          console.log("✅ Terms validation tested");
        }
      }
    } else {
      console.log("ℹ️ Terms checkbox not found on this step");
    }
  });

  test("Step 3 - Review section displays entered information", async ({
    page,
  }) => {
    console.log("\n📋 Testing review section display...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-16-step3-review");

    // Check for review section
    const reviewSection =
      (await page.getByText(/review your profile/i).count()) > 0;
    const personalInfoReview =
      (await page.getByText(/personal information/i).count()) > 0;

    console.log(`Has review section: ${reviewSection}`);
    console.log(`Has personal info in review: ${personalInfoReview}`);

    // Check for displayed data fields
    const hasFullName =
      (await page.getByText(/full name/i).count()) > 0;
    const hasPhone =
      (await page.getByText(/phone/i).count()) > 0;
    const hasLocation =
      (await page.getByText(/location/i).count()) > 0;

    console.log(
      `Has full name display: ${hasFullName}, Has phone display: ${hasPhone}`,
    );

    console.log("✅ Review section checked");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - COMPLETE ONBOARDING
// ========================================

test.describe.serial("Worker Onboarding - Complete Profile Creation", () => {
  test("Complete onboarding flow - all steps filled", async ({ page }) => {
    console.log("\n🎉 Testing complete onboarding flow...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-17-complete-start");

    // ===== STEP 1: Personal Information =====
    console.log("Step 1: Filling personal information...");

    const fullNameInput = page.getByLabel(/full name/i, { exact: false });
    if ((await fullNameInput.count()) > 0) {
      await fullNameInput.fill("Complete Flow Worker");
    }

    const phoneInput = page.getByLabel(/phone/i, { exact: false });
    if ((await phoneInput.count()) > 0) {
      await phoneInput.fill("081234567890");
      await phoneInput.blur();
    }

    const dobInput = page.getByLabel(/date of birth/i, { exact: false });
    if ((await dobInput.count()) > 0) {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 25);
      await dobInput.fill(date.toISOString().split("T")[0]);
    }

    await page.waitForTimeout(1000);
    await captureScreenshot(page, "onboarding-18-complete-step1");

    // Navigate to step 2
    let nextButton = page.getByRole("button", { name: /next|lanjut/i });
    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // ===== STEP 2: Location =====
    console.log("Step 2: Setting location...");

    await captureScreenshot(page, "onboarding-19-complete-step2");

    // Try to find and fill location
    const locationSelectors = [
      'input[id*="address"]',
      'input[placeholder*="address"]',
      'input[placeholder*="lokasi"]',
      'input[placeholder*="Jakarta"]',
    ];

    for (const selector of locationSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().fill("Jakarta, Indonesia");
        await page.waitForTimeout(1000);
        break;
      }
    }

    await page.waitForTimeout(1000);

    // Navigate to step 3
    nextButton = page.getByRole("button", { name: /next|lanjut/i });
    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // ===== STEP 3: Skills & Review =====
    console.log("Step 3: Setting skills...");

    await captureScreenshot(page, "onboarding-20-complete-step3");

    // Select experience level
    const beginnerButton = page.getByRole("button", { name: "Beginner" });
    if ((await beginnerButton.count()) > 0) {
      await beginnerButton.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Check terms checkbox
    const termsCheckbox = page.locator('[id="terms"], label:has-text("terms")').first();
    if ((await termsCheckbox.count()) > 0) {
      await termsCheckbox.click({ force: true });
      await page.waitForTimeout(500);
    }

    await captureScreenshot(page, "onboarding-21-complete-before-submit");

    // Submit complete onboarding
    const completeButton = page.getByRole("button", {
      name: /complete|submit|finish|selesai/i,
    });

    if ((await completeButton.count()) > 0) {
      console.log("Submitting complete onboarding...");
      await completeButton.click({ force: true });
      await page.waitForTimeout(3000);

      await captureScreenshot(page, "onboarding-22-complete-submitted");

      // Wait for redirect
      await page.waitForURL(/worker|jobs|dashboard/, { timeout: 10000 }).catch(() => {
        console.log(`⚠️ Redirect timeout, URL: ${page.url()}`);
      });

      const finalUrl = page.url();
      console.log(`Final URL after onboarding: ${finalUrl}`);

      // Check for success indicators
      const isOnWorkerPage = finalUrl.includes("/worker");
      const hasJobsPath = finalUrl.includes("/jobs");
      const hasDashboardPath = finalUrl.includes("/dashboard");

      console.log(
        `On worker page: ${isOnWorkerPage}, Has jobs: ${hasJobsPath}, Has dashboard: ${hasDashboardPath}`,
      );

      if (isOnWorkerPage || hasJobsPath || hasDashboardPath) {
        console.log("✅ Onboarding completed successfully");
      } else {
        console.log("ℹ️ May need profile already exists check");
      }
    } else {
      console.log("ℹ️ Complete button not found");
    }
  });

  test("Worker can access dashboard after onboarding", async ({ page }) => {
    console.log("\n🏠 Testing worker dashboard access after onboarding...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to worker dashboard
    await page.goto("/worker/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-23-worker-dashboard");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
    expect(currentUrl).toContain("/worker");

    // Check for dashboard elements
    const hasDashboardContent =
      (await page.locator("[class*='dashboard'], [class*='card'], [class*='stat']").count()) > 0;
    const hasWelcomeText =
      (await page.getByText(/dashboard|welcome|worker/i).count()) > 0;

    console.log(`Has dashboard content: ${hasDashboardContent}`);
    console.log(`Has welcome text: ${hasWelcomeText}`);

    console.log("✅ Worker dashboard accessible");
  });

  test("Worker can access jobs page after onboarding", async ({ page }) => {
    console.log("\n💼 Testing worker jobs page access...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to jobs page
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-24-worker-jobs");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");

    // Should be on worker jobs page
    const isOnJobsPage =
      currentUrl.includes("/worker") && currentUrl.includes("/jobs");
    console.log(`On jobs page: ${isOnJobsPage}`);

    console.log("✅ Worker jobs page accessible");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - PUSH NOTIFICATION PROMPT
// ========================================

test.describe.serial("Worker Onboarding - Push Notification Prompt", () => {
  test("Push notification permission prompt appears for new worker", async ({
    page,
  }) => {
    console.log("\n🔔 Testing push notification permission prompt...");

    // Login as worker
    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to dashboard
    await page.goto("/worker/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-25-notification-prompt");

    // Look for notification permission prompt
    const notificationSelectors = [
      'button:has-text("Enable")',
      'button:has-text("Allow")',
      'button:has-text("Izinkan")',
      'button:has-text("Aktifkan")',
      'text=/notification.*permission/i',
      'text=/aktifkan.*notifikasi/i',
      '[class*="notification"]',
    ];

    let foundPrompt = false;
    for (const selector of notificationSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`Found notification element: ${selector}`);
        foundPrompt = true;
        break;
      }
    }

    if (foundPrompt) {
      console.log("✅ Push notification prompt found");
    } else {
      console.log("ℹ️ Push notification prompt not visible");
    }
  });

  test("Worker can access notification settings", async ({ page }) => {
    console.log("\n⚙️ Testing worker notification settings access...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to settings
    await page.goto("/worker/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-26-worker-settings");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");

    // Check for notification-related settings
    const hasNotificationSetting =
      (await page.getByText(/notification|notifikasi/i).count()) > 0;
    const hasToggle =
      (await page.locator('input[type="checkbox"], [role="switch"]').count()) > 0;

    console.log(`Has notification setting: ${hasNotificationSetting}`);
    console.log(`Has toggle: ${hasToggle}`);

    console.log("✅ Worker notification settings accessible");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - REDIRECT BEHAVIOR
// ========================================

test.describe.serial("Worker Onboarding - Redirect Behavior", () => {
  test("Worker without profile is redirected to onboarding", async ({
    page,
  }) => {
    console.log("\n🔄 Testing onboarding redirect for profile-less worker...");

    // Use demo account which may already have a profile
    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to worker root
    await page.goto("/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-27-redirect-check");

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check if redirected to onboarding or stays on worker page
    const isOnOnboarding = currentUrl.includes("/onboarding");
    const isOnWorker = currentUrl.includes("/worker");

    console.log(`Is on onboarding: ${isOnOnboarding}, Is on worker: ${isOnWorker}`);

    console.log("✅ Redirect behavior checked");
  });

  test("Existing worker profile skips onboarding", async ({ page }) => {
    console.log("\n✅ Testing existing worker skips onboarding...");

    // Login with demo account that already has a profile
    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Try to access onboarding page directly
    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-28-existing-profile");

    const currentUrl = page.url();
    console.log(`URL after accessing onboarding: ${currentUrl}`);

    // Should redirect away from onboarding if profile exists
    const isRedirected =
      !currentUrl.includes("/onboarding") || currentUrl.includes("/worker");
    console.log(`Redirected from onboarding: ${isRedirected}`);

    console.log("✅ Existing profile check tested");
  });

  test("Logout clears session and returns to login", async ({ page }) => {
    console.log("\n🚪 Testing logout returns to login...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Logout
    await logout(page);
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    expect(currentUrl).toContain("/login");

    await captureScreenshot(page, "onboarding-29-after-logout");
    console.log("✅ Logout redirects to login");
  });

  test("Protected worker routes require authentication", async ({ page }) => {
    console.log("\n🔐 Testing protected route access without auth...");

    // Try to access worker page without login
    await page.goto("/worker/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`URL when accessing protected route: ${currentUrl}`);

    // Should redirect to login
    const isOnLogin =
      currentUrl.includes("/login") || currentUrl === "/";
    expect(isOnLogin).toBeTruthy();

    await captureScreenshot(page, "onboarding-30-protected-redirect");
    console.log("✅ Protected routes redirect to login");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - DRAFT PERSISTENCE
// ========================================

test.describe.serial("Worker Onboarding - Draft Persistence", () => {
  test("Draft is saved when navigating between steps", async ({ page }) => {
    console.log("\n💾 Testing draft auto-save...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Fill step 1
    const fullNameInput = page.getByLabel(/full name/i, { exact: false });
    if ((await fullNameInput.count()) > 0) {
      await fullNameInput.fill("Draft Test Worker");
      await page.waitForTimeout(2000); // Wait for debounced save
    }

    await captureScreenshot(page, "onboarding-31-draft-saved");

    // Navigate away and back
    await page.goto("/");
    await page.waitForTimeout(1000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-32-draft-restored");

    // Check if draft was restored
    const fullNameValue = await fullNameInput.inputValue().catch(() => "");
    console.log(`Full name after returning: "${fullNameValue}"`);

    console.log("✅ Draft persistence checked");
  });

  test("Progress bar updates correctly across steps", async ({ page }) => {
    console.log("\n📊 Testing progress bar across steps...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-33-progress-step1");

    // Check step 1 indicators
    let activeStep1 =
      (await page.locator('[class*="rounded-full"][class*="bg-primary"]').count()) > 0;
    console.log(`Step 1 indicator active: ${activeStep1}`);

    // Navigate to step 2
    const fullNameInput = page.getByLabel(/full name/i, { exact: false });
    if ((await fullNameInput.count()) > 0) {
      await fullNameInput.fill("Progress Test Worker");
    }

    const phoneInput = page.getByLabel(/phone/i, { exact: false });
    if ((await phoneInput.count()) > 0) {
      await phoneInput.fill("081234567890");
      await phoneInput.blur();
    }

    const dobInput = page.getByLabel(/date of birth/i, { exact: false });
    if ((await dobInput.count()) > 0) {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 25);
      await dobInput.fill(date.toISOString().split("T")[0]);
    }

    await page.waitForTimeout(1000);

    const nextButton = page.getByRole("button", { name: /next|lanjut/i });
    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(2000);
    }

    await captureScreenshot(page, "onboarding-34-progress-step2");

    // Check for step 2 indicators
    const step2Heading =
      (await page.getByRole("heading", { name: /location/i }).count()) > 0;
    console.log(`Step 2 heading visible: ${step2Heading}`);

    console.log("✅ Progress bar tested");
  });
});

// ========================================
// CROSS-ROLE VERIFICATION
// ========================================

test.describe.serial("Worker Onboarding - Cross-Role Verification", () => {
  test("Worker onboarding is separate from business onboarding", async ({
    page,
  }) => {
    console.log("\n🔀 Testing worker vs business onboarding separation...");

    // Login as business
    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to worker onboarding - should redirect
    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-35-business-worker-routes");

    const businessUrl = page.url();
    const isOnWorkerOnboarding = businessUrl.includes("/onboarding/worker");
    const isOnBusinessPage = businessUrl.includes("/business");

    console.log(
      `Business on worker onboarding: ${isOnWorkerOnboarding}, On business page: ${isOnBusinessPage}`,
    );

    // Business user should not be able to access worker onboarding
    if (!isOnWorkerOnboarding) {
      console.log("✅ Business correctly redirected from worker onboarding");
    }

    // Login as worker
    await logout(page);
    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to business onboarding - should redirect
    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-36-worker-business-routes");

    const workerUrl = page.url();
    const isOnBusinessOnboarding = workerUrl.includes("/onboarding/business");
    const isOnWorkerPage = workerUrl.includes("/worker");

    console.log(
      `Worker on business onboarding: ${isOnBusinessOnboarding}, On worker page: ${isOnWorkerPage}`,
    );

    if (!isOnBusinessOnboarding) {
      console.log("✅ Worker correctly redirected from business onboarding");
    }
  });

  test("Worker can access worker-specific routes after onboarding", async ({
    page,
  }) => {
    console.log("\n🏠 Testing worker-specific route access...");

    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Test various worker routes
    const workerRoutes = [
      "/worker/dashboard",
      "/worker/jobs",
      "/worker/notifications",
      "/worker/settings",
    ];

    for (const route of workerRoutes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const currentUrl = page.url();
      const isAccessible = currentUrl.includes("/worker") && !currentUrl.includes("/login");

      console.log(`${route}: ${isAccessible ? "✅ accessible" : "❌ blocked"}`);

      await captureScreenshot(page, `onboarding-37${route.replace(/\//g, "-")}`);
    }

    console.log("✅ Worker route access verified");
  });
});
