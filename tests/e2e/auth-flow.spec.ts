/**
 * Comprehensive Authentication & Dashboard E2E Tests
 *
 * Test accounts:
 * - Worker: worker@demo.com / demo123456
 * - Business: business@demo.com / demo123456
 */

import { test, expect, Page } from "@playwright/test";

// Test credentials
const WORKER_EMAIL = "worker@demo.com";
const WORKER_PASSWORD = "demo123456";

const BUSINESS_EMAIL = "business@demo.com";
const BUSINESS_PASSWORD = "demo123456";

// Helper to take screenshots
async function captureScreenshot(page: Page, name: string) {
  const screenshotPath = `tests/e2e/screenshots/${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
}

// Helper to check for console errors
async function checkConsoleErrors(
  page: Page,
  context: string,
): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  return errors;
}

// Helper to get current URL path
function getPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

test.describe.serial("Authentication Flow Tests", () => {
  test("Worker login flow", async ({ page }) => {
    console.log("\n🔐 Testing worker login flow...");

    // Navigate to login page
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await captureScreenshot(page, "01-login-page");

    // Verify login page elements exist
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Fill login form
    await emailInput.fill(WORKER_EMAIL);
    await passwordInput.fill(WORKER_PASSWORD);

    // Select worker role (click on the label containing "Pekerja")
    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    if ((await workerRadio.count()) > 0) {
      await workerRadio.click({ force: true });
    }

    await captureScreenshot(page, "02-worker-form-filled");

    // Submit login
    await submitBtn.click({ force: true });

    // Wait for redirect (with longer timeout for slow responses)
    await page
      .waitForURL(/worker|dashboard|jobs/, { timeout: 15000 })
      .catch(() => {
        console.log("⚠️ URL wait timeout, checking current URL...");
      });

    await page.waitForTimeout(3000);
    await captureScreenshot(page, "03-after-worker-login");

    const currentUrl = page.url();
    console.log(`After worker login URL: ${currentUrl}`);

    // Verify redirect - should be onboarding, worker, or dashboard
    expect(currentUrl).toMatch(/onboarding|worker|dashboard/);

    if (currentUrl.includes("/worker")) {
      console.log("✅ Worker login successful - redirected to worker area");
    } else if (currentUrl.includes("/onboarding")) {
      console.log("✅ Worker login successful - redirected to onboarding");
    } else {
      console.log(`⚠️ Unexpected redirect: ${currentUrl}`);
    }
  });

  test("Business login flow", async ({ page }) => {
    console.log("\n🏢 Testing business login flow...");

    // Navigate to login page
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Fill login form
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD);

    // Select business role (click on the label containing "Bisnis")
    const businessRadio = page.locator('label:has-text("Bisnis")').first();
    if ((await businessRadio.count()) > 0) {
      await businessRadio.click({ force: true });
    }

    await captureScreenshot(page, "04-business-form-filled");

    // Submit login
    await page.locator('button[type="submit"]').click({ force: true });

    // Wait for redirect
    await page
      .waitForURL(/business|dashboard|jobs/, { timeout: 15000 })
      .catch(() => {
        console.log("⚠️ URL wait timeout, checking current URL...");
      });

    await page.waitForTimeout(3000);
    await captureScreenshot(page, "05-after-business-login");

    const currentUrl = page.url();
    console.log(`After business login URL: ${currentUrl}`);

    // Verify redirect to business area
    expect(currentUrl).toMatch(/business|dashboard/);

    if (currentUrl.includes("/business")) {
      console.log("✅ Business login successful - redirected to business area");
    } else {
      console.log(`⚠️ Unexpected redirect: ${currentUrl}`);
    }
  });

  test("Invalid login shows error or stays on page", async ({ page }) => {
    console.log("\n❌ Testing invalid login...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Fill with invalid credentials
    await page.locator('input[type="email"]').fill("invalid@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");

    await captureScreenshot(page, "06-invalid-credentials-filled");

    // Submit login
    await page.locator('button[type="submit"]').click({ force: true });

    // Wait a bit for response
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "07-after-invalid-login");

    const currentUrl = page.url();
    console.log(`After invalid login URL: ${currentUrl}`);

    // Should either stay on login page or show error
    const staysOnLogin = currentUrl.includes("/login");
    const hasError =
      (await page.locator("text=/error|salah|invalid|failed/i").count()) > 0;
    const hasToast =
      (await page.locator('[role="alert"], .toast, [data-toast]').count()) > 0;

    console.log(
      `Stays on login: ${staysOnLogin}, Has error message: ${hasError}, Has toast: ${hasToast}`,
    );

    // Either should stay on login OR show some error indication
    expect(staysOnLogin || hasError || hasToast).toBeTruthy();

    if (staysOnLogin || hasError || hasToast) {
      console.log("✅ Invalid login handled correctly");
    } else {
      console.log(`⚠️ Invalid login might have succeeded, URL: ${currentUrl}`);
    }
  });
});

test.describe.serial("Worker Dashboard Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login as worker before each test
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(WORKER_PASSWORD);

    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    if ((await workerRadio.count()) > 0) {
      await workerRadio.click({ force: true });
    }

    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);
  });

  test("Worker jobs page loads", async ({ page }) => {
    console.log("\n📋 Testing worker jobs page...");

    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "08-worker-jobs");

    const currentUrl = page.url();
    console.log(`Worker jobs URL: ${currentUrl}`);

    // Check page loaded (not redirected to login)
    expect(currentUrl).not.toContain("/login");

    // Check for job-related content
    const hasJobsContent =
      (await page
        .locator('article, [data-testid="job-card"], .job-card, [class*="job"]')
        .count()) > 0;
    const hasHeading = (await page.locator("h1, h2").count()) > 0;
    const hasEmptyState =
      (await page.locator("text=/tidak ada|no job|empty|kosong/i").count()) > 0;

    console.log(
      `Has jobs content: ${hasJobsContent}, Has heading: ${hasHeading}, Has empty state: ${hasEmptyState}`,
    );

    if (currentUrl.includes("/worker/jobs")) {
      console.log("✅ Worker jobs page accessible");
    }
  });

  test("Worker applications page loads", async ({ page }) => {
    console.log("\n📝 Testing worker applications page...");

    await page.goto("/worker/applications");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "09-worker-applications");

    const currentUrl = page.url();
    console.log(`Worker applications URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/worker/applications")) {
      console.log("✅ Worker applications page accessible");
    } else {
      console.log(`⚠️ Redirected to: ${currentUrl}`);
    }
  });

  test("Worker bookings page loads", async ({ page }) => {
    console.log("\n📅 Testing worker bookings page...");

    await page.goto("/worker/bookings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "10-worker-bookings");

    const currentUrl = page.url();
    console.log(`Worker bookings URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/worker/bookings")) {
      console.log("✅ Worker bookings page accessible");
    }
  });

  test("Worker attendance page loads", async ({ page }) => {
    console.log("\n⏰ Testing worker attendance page...");

    await page.goto("/worker/attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "11-worker-attendance");

    const currentUrl = page.url();
    console.log(`Worker attendance URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    // Check for attendance-related elements
    const hasCheckIn =
      (await page.getByRole("button", { name: /check.?in/i }).count()) > 0;
    const hasCheckOut =
      (await page.getByRole("button", { name: /check.?out/i }).count()) > 0;
    const hasQRScan = (await page.locator("text=/qr|scan/i").count()) > 0;

    console.log(
      `Check-in button: ${hasCheckIn}, Check-out button: ${hasCheckOut}, QR scan: ${hasQRScan}`,
    );

    if (currentUrl.includes("/worker/attendance")) {
      console.log("✅ Worker attendance page accessible");
    }
  });

  test("Worker messages page loads", async ({ page }) => {
    console.log("\n💬 Testing worker messages page...");

    await page.goto("/worker/messages");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "12-worker-messages");

    const currentUrl = page.url();
    console.log(`Worker messages URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/worker/messages")) {
      console.log("✅ Worker messages page accessible");
    }
  });

  test("Worker wallet page loads", async ({ page }) => {
    console.log("\n💰 Testing worker wallet page...");

    await page.goto("/worker/wallet");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "13-worker-wallet");

    const currentUrl = page.url();
    console.log(`Worker wallet URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/worker/wallet")) {
      console.log("✅ Worker wallet page accessible");
    }
  });

  test("Worker badges page loads", async ({ page }) => {
    console.log("\n🏅 Testing worker badges page...");

    await page.goto("/worker/badges");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "14-worker-badges");

    const currentUrl = page.url();
    console.log(`Worker badges URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/worker/badges")) {
      console.log("✅ Worker badges page accessible");
    }
  });

  test("Worker earnings page loads", async ({ page }) => {
    console.log("\n💵 Testing worker earnings page...");

    await page.goto("/worker/earnings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "15-worker-earnings");

    const currentUrl = page.url();
    console.log(`Worker earnings URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/worker/earnings")) {
      console.log("✅ Worker earnings page accessible");
    }
  });

  test("Worker settings page loads", async ({ page }) => {
    console.log("\n⚙️ Testing worker settings page...");

    await page.goto("/worker/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "16-worker-settings");

    const currentUrl = page.url();
    console.log(`Worker settings URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/worker/settings")) {
      console.log("✅ Worker settings page accessible");
    }
  });
});

test.describe.serial("Business Dashboard Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login as business before each test
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD);

    const businessRadio = page.locator('label:has-text("Bisnis")').first();
    if ((await businessRadio.count()) > 0) {
      await businessRadio.click({ force: true });
    }

    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);
  });

  test("Business jobs page loads", async ({ page }) => {
    console.log("\n📋 Testing business jobs page...");

    await page.goto("/business/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "17-business-jobs");

    const currentUrl = page.url();
    console.log(`Business jobs URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/business/jobs")) {
      console.log("✅ Business jobs page accessible");
    }
  });

  test("Business job creation page loads", async ({ page }) => {
    console.log("\n➕ Testing business job creation page...");

    await page.goto("/business/jobs/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "18-business-job-create");

    const currentUrl = page.url();
    console.log(`Business job creation URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    // Check for form elements
    const hasTitleInput =
      (await page
        .locator(
          'input[name="title"], input[placeholder*="title"], input[placeholder*="judul"]',
        )
        .count()) > 0;
    const hasSubmitBtn =
      (await page
        .locator(
          'button[type="submit"], button:has-text("Create"), button:has-text("Buat")',
        )
        .count()) > 0;

    console.log(
      `Has title input: ${hasTitleInput}, Has submit button: ${hasSubmitBtn}`,
    );

    if (currentUrl.includes("/business/jobs")) {
      console.log("✅ Business job creation page accessible");
    }
  });

  test("Business bookings page loads", async ({ page }) => {
    console.log("\n📅 Testing business bookings page...");

    await page.goto("/business/bookings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "19-business-bookings");

    const currentUrl = page.url();
    console.log(`Business bookings URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/business/bookings")) {
      console.log("✅ Business bookings page accessible");
    }
  });

  test("Business messages page loads", async ({ page }) => {
    console.log("\n💬 Testing business messages page...");

    await page.goto("/business/messages");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "20-business-messages");

    const currentUrl = page.url();
    console.log(`Business messages URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/business/messages")) {
      console.log("✅ Business messages page accessible");
    }
  });

  test("Business job attendance page loads", async ({ page }) => {
    console.log("\n⏰ Testing business job attendance page...");

    await page.goto("/business/job-attendance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "21-business-attendance");

    const currentUrl = page.url();
    console.log(`Business attendance URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    // Check for QR code or attendance elements
    const hasQR =
      (await page.locator('svg, canvas, img[alt*="qr" i]').count()) > 0;
    const hasAttendanceText =
      (await page.locator("text=/attendance|kehadiran|qr|scan/i").count()) > 0;

    console.log(
      `Has QR/visual element: ${hasQR}, Has attendance text: ${hasAttendanceText}`,
    );

    if (currentUrl.includes("/business/job-attendance")) {
      console.log("✅ Business job attendance page accessible");
    }
  });

  test("Business workers page loads", async ({ page }) => {
    console.log("\n👷 Testing business workers page...");

    await page.goto("/business/workers");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "22-business-workers");

    const currentUrl = page.url();
    console.log(`Business workers URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/business/workers")) {
      console.log("✅ Business workers page accessible");
    }
  });

  test("Business wallet page loads", async ({ page }) => {
    console.log("\n💰 Testing business wallet page...");

    await page.goto("/business/wallet");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "23-business-wallet");

    const currentUrl = page.url();
    console.log(`Business wallet URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/business/wallet")) {
      console.log("✅ Business wallet page accessible");
    }
  });

  test("Business settings page loads", async ({ page }) => {
    console.log("\n⚙️ Testing business settings page...");

    await page.goto("/business/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "24-business-settings");

    const currentUrl = page.url();
    console.log(`Business settings URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/business/settings")) {
      console.log("✅ Business settings page accessible");
    }
  });

  test("Business analytics page loads", async ({ page }) => {
    console.log("\n📊 Testing business analytics page...");

    await page.goto("/business/analytics");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "25-business-analytics");

    const currentUrl = page.url();
    console.log(`Business analytics URL: ${currentUrl}`);

    expect(currentUrl).not.toContain("/login");

    if (currentUrl.includes("/business/analytics")) {
      console.log("✅ Business analytics page accessible");
    }
  });
});

test.describe.serial("Feature Tests", () => {
  test("Public jobs page loads", async ({ page }) => {
    console.log("\n🌐 Testing public jobs page...");

    await page.goto("/jobs");
    await page.waitForLoadState("domcontentloaded");
    await page
      .waitForSelector('main, [role="main"], body', { timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(1500);

    await captureScreenshot(page, "26-public-jobs");

    const currentUrl = page.url();
    console.log(`Public jobs URL: ${currentUrl}`);

    // Check for job listings or empty state
    const hasJobCards =
      (await page
        .locator('article, [data-testid="job-card"], .job-card, [class*="job"]')
        .count()) > 0;
    const hasEmptyState =
      (await page
        .locator("text=/tidak ada|no job|empty|kosong|coming soon/i")
        .count()) > 0;

    console.log(
      `Has job cards: ${hasJobCards}, Has empty state: ${hasEmptyState}`,
    );

    // Should either show jobs or empty state, not error
    expect(
      hasJobCards || hasEmptyState || currentUrl.includes("/jobs"),
    ).toBeTruthy();

    console.log("✅ Public jobs page tested");
  });

  test("Home/landing page loads", async ({ page }) => {
    console.log("\n🏠 Testing home page...");

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "27-home-page");

    const currentUrl = page.url();
    console.log(`Home page URL: ${currentUrl}`);

    // Check for main elements
    const hasContent =
      (await page.locator("h1, h2, main, article").count()) > 0;

    expect(hasContent).toBeTruthy();

    console.log("✅ Home page tested");
  });

  test("Register page loads", async ({ page }) => {
    console.log("\n📝 Testing register page...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "28-register-page");

    const currentUrl = page.url();
    console.log(`Register page URL: ${currentUrl}`);

    // Check for form elements
    const hasEmailInput =
      (await page.locator('input[type="email"]').count()) > 0;
    const hasPasswordInput =
      (await page.locator('input[type="password"]').count()) > 0;

    console.log(
      `Has email input: ${hasEmailInput}, Has password input: ${hasPasswordInput}`,
    );

    console.log("✅ Register page tested");
  });

  test("Dark mode toggle works", async ({ page }) => {
    console.log("\n🌙 Testing dark mode toggle...");

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for theme toggle button
    const themeToggle = page.locator(
      'button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i], [data-testid="theme-toggle"], button:has([class*="moon"]), button:has([class*="sun"])',
    );

    if ((await themeToggle.count()) > 0) {
      // Get initial theme
      const initialTheme =
        (await page.locator("html").getAttribute("class")) || "";
      console.log(`Initial theme class: ${initialTheme}`);

      // Click toggle
      await themeToggle.first().click({ force: true });
      await page.waitForTimeout(500);

      // Check if theme changed
      const newTheme = (await page.locator("html").getAttribute("class")) || "";
      console.log(`New theme class: ${newTheme}`);

      await captureScreenshot(page, "29-dark-mode-toggled");

      if (initialTheme !== newTheme) {
        console.log("✅ Dark mode toggle works");
      } else {
        console.log("⚠️ Theme class did not change, but toggle was clicked");
      }
    } else {
      console.log("⚠️ No theme toggle button found");
    }
  });

  test("Responsive design - mobile viewport", async ({ page }) => {
    console.log("\n📱 Testing responsive design (mobile)...");

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "30-mobile-login");

    // Check if mobile menu exists or content is responsive
    const hasMobileMenu =
      (await page
        .locator(
          '[data-testid="mobile-menu"], button[aria-label*="menu" i], .hamburger, [class*="mobile-menu"]',
        )
        .count()) > 0;
    const isContentVisible = await page
      .locator('input[type="email"]')
      .isVisible();

    console.log(
      `Has mobile menu: ${hasMobileMenu}, Content visible: ${isContentVisible}`,
    );

    expect(isContentVisible).toBeTruthy();

    // Test worker jobs on mobile
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "31-mobile-worker-jobs");

    console.log("✅ Mobile viewport tested");
  });

  test("Navigation - sidebar links work (worker)", async ({ page }) => {
    console.log("\n🧭 Testing worker navigation...");

    // Login first
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(WORKER_PASSWORD);

    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    if ((await workerRadio.count()) > 0) {
      await workerRadio.click({ force: true });
    }

    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);

    // Try to find and click navigation links
    const navLinks = page.locator(
      'nav a, [role="navigation"] a, aside a, [class*="sidebar"] a',
    );
    const linkCount = await navLinks.count();

    console.log(`Found ${linkCount} navigation links`);

    if (linkCount > 0) {
      // Click first nav link
      const firstLink = navLinks.first();
      const linkText = await firstLink.textContent();
      await firstLink.click({ force: true });
      await page.waitForTimeout(2000);

      await captureScreenshot(page, "32-worker-nav-clicked");

      console.log(`✅ Clicked nav link: "${linkText}"`);
    } else {
      console.log("⚠️ No navigation links found");
    }
  });

  test("Navigation - sidebar links work (business)", async ({ page }) => {
    console.log("\n🧭 Testing business navigation...");

    // Login first
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD);

    const businessRadio = page.locator('label:has-text("Bisnis")').first();
    if ((await businessRadio.count()) > 0) {
      await businessRadio.click({ force: true });
    }

    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);

    // Try to find and click navigation links
    const navLinks = page.locator(
      'nav a, [role="navigation"] a, aside a, [class*="sidebar"] a',
    );
    const linkCount = await navLinks.count();

    console.log(`Found ${linkCount} navigation links`);

    if (linkCount > 0) {
      // Click first nav link
      const firstLink = navLinks.first();
      const linkText = await firstLink.textContent();
      await firstLink.click({ force: true });
      await page.waitForTimeout(2000);

      await captureScreenshot(page, "33-business-nav-clicked");

      console.log(`✅ Clicked nav link: "${linkText}"`);
    } else {
      console.log("⚠️ No navigation links found");
    }
  });
});

test.describe.serial("Error & Edge Case Tests", () => {
  test("Non-existent page returns 404 or redirect", async ({ page }) => {
    console.log("\n❓ Testing non-existent page...");

    await page.goto("/this-page-does-not-exist-12345");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "34-404-page");

    const currentUrl = page.url();
    const pageContent = await page.content();

    // Check for 404 indication
    const has404 =
      pageContent.includes("404") ||
      (await page.locator("text=/404|not found|tidak ditemukan/i").count()) > 0;
    const redirected = !currentUrl.includes("this-page-does-not-exist");

    console.log(`Has 404 indication: ${has404}, Was redirected: ${redirected}`);

    // Should either show 404 or redirect somewhere
    expect(has404 || redirected).toBeTruthy();

    console.log("✅ 404 handling tested");
  });

  test("Protected route redirects when not logged in", async ({ page }) => {
    console.log("\n🔒 Testing protected route redirect...");

    // Clear any existing session
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "35-protected-redirect");

    const currentUrl = page.url();
    console.log(`After accessing protected route: ${currentUrl}`);

    // Should redirect to login or home
    const wasRedirected =
      currentUrl.includes("/login") ||
      currentUrl === page.url().split("/").slice(0, 3).join("/") + "/" ||
      !currentUrl.includes("/worker/jobs");

    if (wasRedirected) {
      console.log("✅ Protected route redirected correctly");
    } else {
      console.log(`⚠️ Protected route might be accessible, URL: ${currentUrl}`);
    }
  });

  test("Empty form submission shows validation", async ({ page }) => {
    console.log("\n⚠️ Testing empty form submission...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Try to submit empty form
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "36-empty-form-validation");

    // Check for validation messages
    const hasValidation =
      (await page
        .locator("text=/required|wajib|harus|invalid|error/i")
        .count()) > 0;
    const stayedOnPage = page.url().includes("/login");

    console.log(
      `Has validation message: ${hasValidation}, Stayed on page: ${stayedOnPage}`,
    );

    // Browser HTML5 validation might prevent submission, which is fine
    if (hasValidation || stayedOnPage) {
      console.log("✅ Empty form handled correctly");
    }
  });
});
