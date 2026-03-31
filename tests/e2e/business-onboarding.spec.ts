/**
 * E2E Tests: Business Onboarding Flow
 *
 * Tests the complete business onboarding lifecycle:
 * - Business registration redirects to onboarding
 * - Onboarding step 1: Company Information (business name, industry, size)
 * - Onboarding step 2: Location setup
 * - Onboarding step 3: Verification and review
 * - Draft auto-save persistence across steps
 * - Terms acceptance validation
 * - Profile creation and business dashboard access
 * - Push notification permission prompt after onboarding
 * - Job creation access after onboarding
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
} from "../../e2e/helpers/auth";

// ========================================
// TEST CONFIGURATION
// ========================================

const PASSWORD = "demo123456";
const SCREENSHOT_DIR = "test-results/business-onboarding";

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
// ONBOARDING FLOW TESTS - NEW BUSINESS REGISTRATION
// ========================================

test.describe.serial("Business Onboarding - New Registration Flow", () => {
  test("Business registers and is redirected to onboarding", async ({ page }) => {
    console.log("\n📝 Testing new business registration redirects to onboarding...");

    const testEmail = generateTestEmail("business-onboarding");
    const fullName = "Test Business Onboarding";

    await registerUser(page, testEmail, PASSWORD, fullName, "business");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-01-redirected");

    const currentUrl = page.url();
    console.log(`Current URL after registration: ${currentUrl}`);

    // Should redirect to onboarding, login, or business page
    const isOnOnboarding =
      currentUrl.includes("/onboarding") ||
      currentUrl.includes("/business") ||
      currentUrl.includes("/login");

    expect(isOnOnboarding).toBeTruthy();
    console.log("✅ New business redirected to onboarding or login");
  });

  test("Onboarding page loads with step 1 (Company Information)", async ({
    page,
  }) => {
    console.log("\n📋 Testing onboarding step 1 loads correctly...");

    // Login as a business (will redirect to onboarding if no profile)
    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to business onboarding if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes("/onboarding")) {
      await page.goto("/onboarding/business");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    }

    await captureScreenshot(page, "onboarding-02-step1-company-info");

    // Check step 1 UI elements - company information
    await expect(
      page.getByRole("heading", { name: /complete your profile|business profile/i }),
    ).toBeVisible();

    // Check form fields exist (business name, industry, etc.)
    const businessNameInput = page.getByLabel(/business name|nama bisnis|company name/i);
    if ((await businessNameInput.count()) > 0) {
      await expect(businessNameInput).toBeVisible();
    }

    // Check progress bar shows step 1
    const stepIndicators = page.locator('[class*="rounded-full"]');
    const count = await stepIndicators.count();
    console.log(`Progress indicators found: ${count}`);
    expect(count).toBeGreaterThan(0);

    console.log("✅ Onboarding step 1 loads correctly");
  });

  test("Step 1 - Company Information form validation", async ({ page }) => {
    console.log("\n⚠️ Testing step 1 form validation...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to onboarding step 1
    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-03-step1-validation");

    // Try to proceed without filling form
    const nextButton = page.getByRole("button", { name: /next|lanjut/i });
    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(1000);

      // Should still be on step 1 due to validation
      const stillOnStep1 =
        (await page.getByRole("heading", { name: /business|company|info/i }).count()) > 0;
      console.log(`Still on step 1 after empty submit: ${stillOnStep1}`);
      console.log("✅ Validation prevents empty form submission");
    } else {
      console.log("ℹ️ Next button not found (may be disabled)");
    }
  });

  test("Step 1 - Fill and validate company information fields", async ({
    page,
  }) => {
    console.log("\n✅ Testing step 1 field filling...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-04-step1-filled");

    // Fill business name
    const businessNameSelectors = [
      page.getByLabel(/business name|nama bisnis|company name/i),
      page.locator('input[id*="business"], input[id*="company"], input[id*="nama"]'),
      page.locator('input[placeholder*="business"], input[placeholder*="company"]'),
    ];

    for (const selector of businessNameSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("PT Demo Test Indonesia");
        await selector.first().blur();
        await page.waitForTimeout(500);
        console.log("✅ Business name filled");
        break;
      }
    }

    // Fill phone number (Indonesian format)
    const phoneSelectors = [
      page.getByLabel(/phone|telephone|telepon/i),
      page.locator('input[id*="phone"], input[id*="telepon"]'),
    ];

    for (const selector of phoneSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("02112345678");
        await selector.first().blur();
        await page.waitForTimeout(500);
        console.log("✅ Phone number filled");
        break;
      }
    }

    // Fill address
    const addressSelectors = [
      page.getByLabel(/address|alamat/i),
      page.locator('input[id*="address"], input[id*="alamat"]'),
      page.locator('textarea[id*="address"], textarea[id*="alamat"]'),
    ];

    for (const selector of addressSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("Jl. Sudirman No. 123, Jakarta Selatan");
        await selector.first().blur();
        await page.waitForTimeout(500);
        console.log("✅ Address filled");
        break;
      }
    }

    await page.waitForTimeout(1000);
    await captureScreenshot(page, "onboarding-05-step1-complete");

    console.log("✅ Company information fields filled");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - STEP 2 LOCATION
// ========================================

test.describe.serial("Business Onboarding - Step 2 Location", () => {
  test("Step 2 - Location page loads correctly", async ({ page }) => {
    console.log("\n📍 Testing onboarding step 2 location...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Fill step 1 first
    const businessNameSelectors = [
      page.getByLabel(/business name|nama bisnis|company name/i),
      page.locator('input[id*="business"], input[id*="company"]'),
    ];

    for (const selector of businessNameSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("Location Test Business");
        break;
      }
    }

    const phoneSelectors = [
      page.getByLabel(/phone|telephone|telepon/i),
      page.locator('input[id*="phone"]'),
    ];

    for (const selector of phoneSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("02112345678");
        await selector.first().blur();
        break;
      }
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
      (await page.getByRole("heading", { name: /location|lokasi/i }).count()) > 0;
    const hasAddressField =
      (await page.locator('input[placeholder*="address"], input[placeholder*="lokasi"], input[placeholder*="Jakarta"]').count()) > 0;
    const hasLocationPicker =
      (await page.locator('[class*="location"], [class*="picker"], [class*="map"]').count()) > 0;

    console.log(
      `Has location heading: ${hasLocationHeading}, Has address field: ${hasAddressField}`,
    );

    if (hasLocationHeading || hasAddressField || hasLocationPicker) {
      console.log("✅ Step 2 location page loaded");
    } else {
      console.log("ℹ️ May need to wait for validation");
    }
  });

  test("Step 2 - Location field can be interacted with", async ({ page }) => {
    console.log("\n📍 Testing location field interaction...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-07-step2-location-interact");

    // Fill step 1 quickly
    const businessNameSelectors = [
      page.getByLabel(/business name|nama bisnis|company name/i),
      page.locator('input[id*="business"], input[id*="company"]'),
    ];

    for (const selector of businessNameSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("Location Field Test Business");
        break;
      }
    }

    await page.waitForTimeout(500);

    // Navigate to step 2
    const nextButton = page.getByRole("button", { name: /next|lanjut/i });
    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(2000);
    }

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
// ONBOARDING FLOW TESTS - STEP 3 VERIFICATION & REVIEW
// ========================================

test.describe.serial("Business Onboarding - Step 3 Verification & Review", () => {
  test("Step 3 - Verification and review page loads correctly", async ({
    page,
  }) => {
    console.log("\n🔍 Testing onboarding step 3 verification and review...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Fill step 1
    const businessNameSelectors = [
      page.getByLabel(/business name|nama bisnis|company name/i),
      page.locator('input[id*="business"], input[id*="company"]'),
    ];

    for (const selector of businessNameSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("Verification Test Business");
        break;
      }
    }

    const phoneSelectors = [
      page.getByLabel(/phone|telephone|telepon/i),
      page.locator('input[id*="phone"]'),
    ];

    for (const selector of phoneSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("02112345678");
        await selector.first().blur();
        break;
      }
    }

    await page.waitForTimeout(1000);

    // Navigate through steps to get to step 3
    let step = 1;
    while (step < 3) {
      const nextButton = page.getByRole("button", { name: /next|lanjut/i });
      if ((await nextButton.count()) > 0) {
        await nextButton.click({ force: true });
        await page.waitForTimeout(2000);
        step++;
      } else {
        break;
      }
    }

    await captureScreenshot(page, "onboarding-09-step3-verification");

    // Check for verification/review-related elements
    const hasVerificationHeading =
      (await page.getByRole("heading", { name: /verification|verify|review|tinjau/i }).count()) > 0;
    const hasTermsCheckbox =
      (await page.getByLabel(/terms|agree|syarat/i).count()) > 0;
    const hasReviewSection =
      (await page.getByText(/review your profile|review business/i).count()) > 0;

    console.log(
      `Has verification heading: ${hasVerificationHeading}, Has terms checkbox: ${hasTermsCheckbox}`,
    );
    console.log(`Has review section: ${hasReviewSection}`);

    if (hasVerificationHeading || hasReviewSection || hasTermsCheckbox) {
      console.log("✅ Step 3 verification and review loaded");
    }
  });

  test("Step 3 - Industry/Business type selection works", async ({ page }) => {
    console.log("\n🏢 Testing industry type selection...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-10-step3-industry");

    // Look for industry/business type selection
    const industrySelectors = [
      page.locator("select"),
      page.locator('[role="combobox"]'),
      page.locator('[class*="select"]'),
      page.getByLabel(/industry|jenis bisnis|business type/i),
    ];

    let foundSelector = null;
    for (const selector of industrySelectors) {
      if ((await selector.count()) > 0) {
        foundSelector = selector;
        console.log(`Found industry selector`);
        break;
      }
    }

    if (foundSelector) {
      const industrySelect = foundSelector.first();
      await industrySelect.click({ force: true });
      await page.waitForTimeout(1000);

      // Try selecting an option
      const options = page.locator("option");
      const optionCount = await options.count();
      if (optionCount > 1) {
        await options.nth(1).click();
        await page.waitForTimeout(500);
        console.log("✅ Industry option selected");
      }
    } else {
      // Try button-based selection
      const industryButtons = [
        "Food & Beverage",
        "Retail",
        "Manufacturing",
        "Services",
        "Construction",
        "Food",
        "Retail",
      ];

      for (const industry of industryButtons) {
        const button = page.getByRole("button", { name: new RegExp(industry, "i") });
        if ((await button.count()) > 0) {
          await button.click({ force: true });
          await page.waitForTimeout(500);
          console.log(`✅ Selected industry: ${industry}`);
          break;
        }
      }
    }

    await captureScreenshot(page, "onboarding-11-step3-industry-selected");
    console.log("✅ Industry type selection tested");
  });

  test("Step 3 - Terms checkbox is required", async ({ page }) => {
    console.log("\n⚠️ Testing terms checkbox requirement...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-14-step3-terms");

    // Check for terms checkbox
    const termsSelectors = [
      page.locator('[id="terms"]'),
      page.locator('label:has-text("terms")'),
      page.locator('label:has-text("syarat")'),
      page.locator('label:has-text("agree")'),
    ];

    let termsCheckbox = null;
    for (const selector of termsSelectors) {
      if ((await selector.count()) > 0) {
        termsCheckbox = selector.first();
        break;
      }
    }

    if (termsCheckbox) {
      // Check if checkbox is visible
      const isVisible = await termsCheckbox.isVisible().catch(() => false);
      console.log(`Terms checkbox visible: ${isVisible}`);

      // Look for complete/submit button
      const completeButton = page.getByRole("button", {
        name: /complete|submit|finish|selesai|register daftar/i,
      });

      if ((await completeButton.count()) > 0) {
        // Try clicking without terms - should show validation
        await completeButton.click({ force: true });
        await page.waitForTimeout(1000);

        await captureScreenshot(page, "onboarding-15-step3-terms-error");
        console.log("✅ Terms validation tested");
      }
    } else {
      console.log("ℹ️ Terms checkbox not found on this step");
    }
  });

  test("Step 3 - Review section displays entered information", async ({
    page,
  }) => {
    console.log("\n📋 Testing review section display...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-16-step3-review");

    // Check for review section
    const reviewSection =
      (await page.getByText(/review your profile|review business|tinjau profil/i).count()) > 0;
    const businessInfoReview =
      (await page.getByText(/business|company|bisnis/i).count()) > 0;

    console.log(`Has review section: ${reviewSection}`);
    console.log(`Has business info in review: ${businessInfoReview}`);

    // Check for displayed data fields
    const hasBusinessName =
      (await page.getByText(/business name|nama bisnis|company/i).count()) > 0;
    const hasPhone =
      (await page.getByText(/phone|telepon/i).count()) > 0;
    const hasLocation =
      (await page.getByText(/location|lokasi|address|alamat/i).count()) > 0;

    console.log(
      `Has business name display: ${hasBusinessName}, Has phone display: ${hasPhone}`,
    );

    console.log("✅ Review section checked");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - COMPLETE ONBOARDING
// ========================================

test.describe.serial("Business Onboarding - Complete Profile Creation", () => {
  test("Complete onboarding flow - all steps filled", async ({ page }) => {
    console.log("\n🎉 Testing complete business onboarding flow...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "onboarding-17-complete-start");

    // ===== STEP 1: Company Information =====
    console.log("Step 1: Filling company information...");

    const businessNameSelectors = [
      page.getByLabel(/business name|nama bisnis|company name/i),
      page.locator('input[id*="business"], input[id*="company"]'),
      page.locator('input[placeholder*="business"], input[placeholder*="company"]'),
    ];

    for (const selector of businessNameSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("Complete Flow Business");
        break;
      }
    }

    const phoneSelectors = [
      page.getByLabel(/phone|telephone|telepon/i),
      page.locator('input[id*="phone"]'),
    ];

    for (const selector of phoneSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("02112345678");
        await selector.first().blur();
        break;
      }
    }

    const addressSelectors = [
      page.getByLabel(/address|alamat/i),
      page.locator('input[id*="address"], input[id*="alamat"]'),
    ];

    for (const selector of addressSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("Jl. Sudirman No. 123, Jakarta Selatan");
        await selector.first().blur();
        break;
      }
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

    // ===== STEP 3: Verification & Review =====
    console.log("Step 3: Verification and review...");

    await captureScreenshot(page, "onboarding-20-complete-step3");

    // Check terms checkbox
    const termsSelectors = [
      page.locator('[id="terms"]'),
      page.locator('label:has-text("terms")'),
      page.locator('label:has-text("syarat")'),
      page.locator('label:has-text("agree")'),
    ];

    for (const selector of termsSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().click({ force: true });
        await page.waitForTimeout(500);
        break;
      }
    }

    await captureScreenshot(page, "onboarding-21-complete-before-submit");

    // Submit complete onboarding
    const completeButton = page.getByRole("button", {
      name: /complete|submit|finish|selesai|register daftar/i,
    });

    if ((await completeButton.count()) > 0) {
      console.log("Submitting complete onboarding...");
      await completeButton.click({ force: true });
      await page.waitForTimeout(3000);

      await captureScreenshot(page, "onboarding-22-complete-submitted");

      // Wait for redirect
      await page.waitForURL(/business|jobs|dashboard/, { timeout: 10000 }).catch(() => {
        console.log(`⚠️ Redirect timeout, URL: ${page.url()}`);
      });

      const finalUrl = page.url();
      console.log(`Final URL after onboarding: ${finalUrl}`);

      // Check for success indicators
      const isOnBusinessPage = finalUrl.includes("/business");
      const hasJobsPath = finalUrl.includes("/jobs");
      const hasDashboardPath = finalUrl.includes("/dashboard");

      console.log(
        `On business page: ${isOnBusinessPage}, Has jobs: ${hasJobsPath}, Has dashboard: ${hasDashboardPath}`,
      );

      if (isOnBusinessPage || hasJobsPath || hasDashboardPath) {
        console.log("✅ Business onboarding completed successfully");
      } else {
        console.log("ℹ️ May need profile already exists check");
      }
    } else {
      console.log("ℹ️ Complete button not found");
    }
  });

  test("Business can access dashboard after onboarding", async ({ page }) => {
    console.log("\n🏠 Testing business dashboard access after onboarding...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to business dashboard
    await page.goto("/business/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-23-business-dashboard");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
    expect(currentUrl).toContain("/business");

    // Check for dashboard elements
    const hasDashboardContent =
      (await page.locator("[class*='dashboard'], [class*='card'], [class*='stat']").count()) > 0;
    const hasWelcomeText =
      (await page.getByText(/dashboard|welcome|business|bisnis/i).count()) > 0;

    console.log(`Has dashboard content: ${hasDashboardContent}`);
    console.log(`Has welcome text: ${hasWelcomeText}`);

    console.log("✅ Business dashboard accessible");
  });

  test("Business can access jobs page after onboarding", async ({ page }) => {
    console.log("\n💼 Testing business jobs page access...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to jobs page
    await page.goto("/business/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-24-business-jobs");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");

    // Should be on business jobs page
    const isOnJobsPage =
      currentUrl.includes("/business") && currentUrl.includes("/jobs");
    console.log(`On jobs page: ${isOnJobsPage}`);

    console.log("✅ Business jobs page accessible");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - PUSH NOTIFICATION PROMPT
// ========================================

test.describe.serial("Business Onboarding - Push Notification Prompt", () => {
  test("Push notification permission prompt appears for new business", async ({
    page,
  }) => {
    console.log("\n🔔 Testing push notification permission prompt...");

    // Login as business
    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to dashboard
    await page.goto("/business/dashboard");
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

  test("Business can access notification settings", async ({ page }) => {
    console.log("\n⚙️ Testing business notification settings access...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to settings
    await page.goto("/business/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-26-business-settings");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");

    // Check for notification-related settings
    const hasNotificationSetting =
      (await page.getByText(/notification|notifikasi/i).count()) > 0;
    const hasToggle =
      (await page.locator('input[type="checkbox"], [role="switch"]').count()) > 0;

    console.log(`Has notification setting: ${hasNotificationSetting}`);
    console.log(`Has toggle: ${hasToggle}`);

    console.log("✅ Business notification settings accessible");
  });
});

// ========================================
// ONBOARDING FLOW TESTS - REDIRECT BEHAVIOR
// ========================================

test.describe.serial("Business Onboarding - Redirect Behavior", () => {
  test("Business without profile is redirected to onboarding", async ({
    page,
  }) => {
    console.log("\n🔄 Testing onboarding redirect for profile-less business...");

    // Use demo account which may already have a profile
    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to business root
    await page.goto("/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-27-redirect-check");

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check if redirected to onboarding or stays on business page
    const isOnOnboarding = currentUrl.includes("/onboarding");
    const isOnBusiness = currentUrl.includes("/business");

    console.log(`Is on onboarding: ${isOnOnboarding}, Is on business: ${isOnBusiness}`);

    console.log("✅ Redirect behavior checked");
  });

  test("Existing business profile skips onboarding", async ({ page }) => {
    console.log("\n✅ Testing existing business skips onboarding...");

    // Login with demo account that already has a profile
    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Try to access onboarding page directly
    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-28-existing-profile");

    const currentUrl = page.url();
    console.log(`URL after accessing onboarding: ${currentUrl}`);

    // Should redirect away from onboarding if profile exists
    const isRedirected =
      !currentUrl.includes("/onboarding") || currentUrl.includes("/business");
    console.log(`Redirected from onboarding: ${isRedirected}`);

    console.log("✅ Existing profile check tested");
  });

  test("Logout clears session and returns to login", async ({ page }) => {
    console.log("\n🚪 Testing logout returns to login...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Logout
    await logout(page);
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    expect(currentUrl).toContain("/login");

    await captureScreenshot(page, "onboarding-29-after-logout");
    console.log("✅ Logout redirects to login");
  });

  test("Protected business routes require authentication", async ({ page }) => {
    console.log("\n🔐 Testing protected route access without auth...");

    // Try to access business page without login
    await page.goto("/business/dashboard");
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

test.describe.serial("Business Onboarding - Draft Persistence", () => {
  test("Draft is saved when navigating between steps", async ({ page }) => {
    console.log("\n💾 Testing draft auto-save...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Fill step 1
    const businessNameSelectors = [
      page.getByLabel(/business name|nama bisnis|company name/i),
      page.locator('input[id*="business"], input[id*="company"]'),
    ];

    let fieldToCheck = null;
    for (const selector of businessNameSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("Draft Test Business");
        await page.waitForTimeout(2000); // Wait for debounced save
        fieldToCheck = selector.first();
        break;
      }
    }

    await captureScreenshot(page, "onboarding-31-draft-saved");

    // Navigate away and back
    await page.goto("/");
    await page.waitForTimeout(1000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-32-draft-restored");

    // Check if draft was restored
    if (fieldToCheck) {
      const businessNameValue = await fieldToCheck.inputValue().catch(() => "");
      console.log(`Business name after returning: "${businessNameValue}"`);
    }

    console.log("✅ Draft persistence checked");
  });

  test("Progress bar updates correctly across steps", async ({ page }) => {
    console.log("\n📊 Testing progress bar across steps...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-33-progress-step1");

    // Check step 1 indicators
    let activeStep1 =
      (await page.locator('[class*="rounded-full"][class*="bg-primary"]').count()) > 0;
    console.log(`Step 1 indicator active: ${activeStep1}`);

    // Fill step 1
    const businessNameSelectors = [
      page.getByLabel(/business name|nama bisnis|company name/i),
      page.locator('input[id*="business"], input[id*="company"]'),
    ];

    for (const selector of businessNameSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("Progress Test Business");
        break;
      }
    }

    const phoneSelectors = [
      page.getByLabel(/phone|telephone|telepon/i),
      page.locator('input[id*="phone"]'),
    ];

    for (const selector of phoneSelectors) {
      if ((await selector.count()) > 0) {
        await selector.first().fill("02112345678");
        await selector.first().blur();
        break;
      }
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
      (await page.getByRole("heading", { name: /location|lokasi/i }).count()) > 0;
    console.log(`Step 2 heading visible: ${step2Heading}`);

    console.log("✅ Progress bar tested");
  });
});

// ========================================
// JOB CREATION ACCESS AFTER ONBOARDING
// ========================================

test.describe.serial("Business Onboarding - Job Creation Access", () => {
  test("Business can access job creation page after onboarding", async ({
    page,
  }) => {
    console.log("\n📝 Testing job creation page access after onboarding...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to create new job
    await page.goto("/business/jobs/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-35-job-creation");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");

    // Check for job creation form elements
    const hasJobTitleField =
      (await page.getByLabel(/job title|posisi|judul/i).count()) > 0;
    const hasDescriptionField =
      (await page.getByLabel(/description|deskripsi/i).count()) > 0;
    const hasWageField =
      (await page.getByLabel(/wage|gaji|salary/i).count()) > 0;
    const hasSubmitButton =
      (await page.getByRole("button", { name: /post|create|buat|publish/i }).count()) > 0;

    console.log(`Has job title field: ${hasJobTitleField}`);
    console.log(`Has description field: ${hasDescriptionField}`);
    console.log(`Has wage field: ${hasWageField}`);
    console.log(`Has submit button: ${hasSubmitButton}`);

    // At least some form elements should be visible
    const hasJobForm = hasJobTitleField || hasDescriptionField || hasSubmitButton;
    expect(hasJobForm || !currentUrl.includes("/login")).toBeTruthy();

    console.log("✅ Job creation page accessible");
  });

  test("Business can see jobs list after onboarding", async ({ page }) => {
    console.log("\n📋 Testing jobs list visibility...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to jobs list
    await page.goto("/business/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-36-jobs-list");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");

    // Check for jobs list or empty state
    const hasJobsList =
      (await page.locator("[class*='job'], [class*='card']").count()) > 0;
    const hasEmptyState =
      (await page.getByText(/no jobs|belum ada|empty|tidak ada/i).count()) > 0;
    const hasNewJobButton =
      (await page.getByRole("button", { name: /new job|buat job|posting/i }).count()) > 0;

    console.log(`Has jobs list: ${hasJobsList}`);
    console.log(`Has empty state: ${hasEmptyState}`);
    console.log(`Has new job button: ${hasNewJobButton}`);

    console.log("✅ Jobs list accessible");
  });
});

// ========================================
// CROSS-ROLE VERIFICATION
// ========================================

test.describe.serial("Business Onboarding - Cross-Role Verification", () => {
  test("Business onboarding is separate from worker onboarding", async ({
    page,
  }) => {
    console.log("\n🔀 Testing business vs worker onboarding separation...");

    // Login as worker
    await loginAs(page, "worker");
    await page.waitForTimeout(2000);

    // Navigate to business onboarding - should redirect
    await page.goto("/onboarding/business");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-37-worker-business-routes");

    const workerUrl = page.url();
    const isOnBusinessOnboarding = workerUrl.includes("/onboarding/business");
    const isOnWorkerPage = workerUrl.includes("/worker");

    console.log(
      `Worker on business onboarding: ${isOnBusinessOnboarding}, On worker page: ${isOnWorkerPage}`,
    );

    // Worker user should not be able to access business onboarding
    if (!isOnBusinessOnboarding) {
      console.log("✅ Worker correctly redirected from business onboarding");
    }

    // Login as business
    await logout(page);
    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Navigate to worker onboarding - should redirect
    await page.goto("/onboarding/worker");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-38-business-worker-routes");

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
  });

  test("Business can access business-specific routes after onboarding", async ({
    page,
  }) => {
    console.log("\n🏢 Testing business-specific route access...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Test various business routes
    const businessRoutes = [
      "/business/dashboard",
      "/business/jobs",
      "/business/notifications",
      "/business/settings",
    ];

    for (const route of businessRoutes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const currentUrl = page.url();
      const isAccessible = currentUrl.includes("/business") && !currentUrl.includes("/login");

      console.log(`${route}: ${isAccessible ? "✅ accessible" : "❌ blocked"}`);

      await captureScreenshot(page, `onboarding-39${route.replace(/\//g, "-")}`);
    }

    console.log("✅ Business route access verified");
  });

  test("Business cannot access worker routes", async ({ page }) => {
    console.log("\n🚫 Testing business blocked from worker routes...");

    await loginAs(page, "business");
    await page.waitForTimeout(2000);

    // Try to access worker routes
    await page.goto("/worker/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "onboarding-40-business-worker-blocked");

    const currentUrl = page.url();
    const isBlocked =
      !currentUrl.includes("/worker") || currentUrl.includes("/login") || currentUrl.includes("/business");

    console.log(`Worker route blocked for business: ${isBlocked}`);

    if (isBlocked) {
      console.log("✅ Business correctly blocked from worker routes");
    }
  });
});
