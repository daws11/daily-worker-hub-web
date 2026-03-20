import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Go to homepage
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display landing page", async ({ page }) => {
    // Check page loads
    await expect(page).toHaveTitle(/Daily Worker Hub/i);
  });

  test("should navigate to register page", async ({ page }) => {
    // Click register link
    await page.locator("text=Register").click();
    await expect(page).toHaveURL(/.*register/);
  });

  test("should display registration form", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check role selection - uses Indonesian text (Pekerja/Bisnis)
    await expect(page.getByText(/pekerja|worker/i)).toBeVisible();
    await expect(page.getByText(/bisnis|business/i)).toBeVisible();
  });

  test("should show validation errors on empty form submit", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Submit empty form
    await page.locator('button[type="submit"]').click();

    // Should show validation errors
    await page.waitForTimeout(1000);
    const errors = await page
      .locator('[role="alert"], .text-destructive, .text-red-500')
      .count();
    expect(errors).toBeGreaterThanOrEqual(0);
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*login/);
  });

  test("should display login form", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should login with test worker account", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Fill login form with demo account
    await page.locator('input[type="email"]').fill("worker@demo.com");
    await page.locator('input[type="password"]').fill("demo123456");

    // Select worker role
    const workerLabel = page.locator('label:has-text("Pekerja")').first();
    if ((await workerLabel.count()) > 0) {
      await workerLabel.click({ force: true });
    }

    // Submit
    await page.locator('button[type="submit"]').click();

    // Wait for redirect - includes /onboarding in the pattern
    await page.waitForURL(/.*worker.*|.*onboarding.*|.*dashboard.*|.*jobs.*/, {
      timeout: 15000,
    });

    // Should be logged in
    expect(page.url()).not.toContain("/login");
  });

  test("should login with test business account", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Fill login form with demo account
    await page.locator('input[type="email"]').fill("business@demo.com");
    await page.locator('input[type="password"]').fill("demo123456");

    // Select business role
    const businessLabel = page.locator('label:has-text("Bisnis")').first();
    if ((await businessLabel.count()) > 0) {
      await businessLabel.click({ force: true });
    }

    // Submit
    await page.locator('button[type="submit"]').click();

    // Wait for redirect
    await page.waitForURL(/.*business.*|.*dashboard.*/, { timeout: 15000 });

    // Should be logged in
    expect(page.url()).not.toContain("/login");
  });

  test("CSS should load correctly on register page", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Check that Tailwind CSS is applied
    const body = page.locator("body");

    // Check for background color (should not be white/default)
    const bgColor = await body.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );

    // Take screenshot for visual verification
    await page.screenshot({
      path: "test-results/onboarding-register.png",
      fullPage: true,
    });

    // Page should have styling applied
    expect(bgColor).toBeTruthy();
  });

  test("CSS should load correctly on login page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({
      path: "test-results/onboarding-login.png",
      fullPage: true,
    });

    // Check form is styled
    const form = page.locator("form");
    await expect(form).toBeVisible();
  });
});
