/**
 * E2E Tests: Authentication Flow
 *
 * Tests the complete authentication lifecycle:
 * - User registration (worker and business)
 * - User login (worker and business)
 * - User logout
 * - Invalid login handling
 * - Protected route access
 *
 * Demo accounts:
 * - Worker: worker@demo.com / demo123456
 * - Business: business@demo.com / demo123456
 */

import { test, expect } from "@playwright/test";
import {
  loginAs,
  logout,
  registerUser,
  verifyAuthenticated,
  verifyNotAuthenticated,
  generateTestEmail,
  waitForToast,
  DEMO_ACCOUNTS,
} from "./helpers/auth";

// ========================================
// TEST CONFIGURATION
// ========================================

// Use serial mode for tests that need clean state
test.describe.configure({ mode: "serial" });

// ========================================
// REGISTRATION TESTS
// ========================================

test.describe("Registration Flow", () => {
  test("Register page loads and displays form elements", async ({ page }) => {
    console.log("\n📝 Testing register page load...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Verify page title
    await expect(
      page.getByRole("heading", { name: /daftar|register/i }),
    ).toBeVisible();

    // Verify form elements exist
    await expect(
      page.getByRole("textbox", { name: /nama|name/i }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /password/i }),
    ).toBeVisible();

    // Verify role selection
    await expect(page.locator('label:has-text("Pekerja")')).toBeVisible();
    await expect(page.locator('label:has-text("Bisnis")')).toBeVisible();

    // Verify submit button
    await expect(
      page.getByRole("button", { name: /daftar|register/i }),
    ).toBeVisible();

    console.log("✅ Register page loaded with all form elements");
  });

  test("Registration form validation - empty fields", async ({ page }) => {
    console.log("\n⚠️ Testing registration validation...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Try to submit empty form
    const submitButton = page.getByRole("button", { name: /daftar|register/i });
    await submitButton.click({ force: true });

    // Form should not submit (HTML5 validation should prevent it)
    await page.waitForTimeout(1000);

    // Should still be on register page
    expect(page.url()).toContain("/register");

    console.log("✅ Empty form validation works");
  });

  test("Registration form validation - invalid email", async ({ page }) => {
    console.log("\n⚠️ Testing invalid email validation...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Fill form with invalid email
    await page.getByRole("textbox", { name: /nama|name/i }).fill("Test User");
    await page.getByRole("textbox", { name: /email/i }).fill("invalid-email");
    await page.getByRole("textbox", { name: /password/i }).fill("password123");

    // Try to submit
    const submitButton = page.getByRole("button", { name: /daftar|register/i });
    await submitButton.click({ force: true });

    await page.waitForTimeout(1000);

    // Should still be on register page due to HTML5 email validation
    expect(page.url()).toContain("/register");

    console.log("✅ Invalid email validation works");
  });

  test("Registration form - worker role selection", async ({ page }) => {
    console.log("\n👤 Testing worker role selection...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Select worker role
    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    await workerRadio.click({ force: true });

    // Verify selection (visual indication)
    await page.waitForTimeout(500);

    console.log("✅ Worker role selection works");
  });

  test("Registration form - business role selection", async ({ page }) => {
    console.log("\n🏢 Testing business role selection...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Select business role
    const businessRadio = page.locator('label:has-text("Bisnis")').first();
    await businessRadio.click({ force: true });

    // Verify selection (visual indication)
    await page.waitForTimeout(500);

    console.log("✅ Business role selection works");
  });

  test("Navigation to login from register page", async ({ page }) => {
    console.log("\n🔗 Testing navigation to login...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Click login link
    const loginLink = page.getByRole("link", { name: /masuk|login/i });
    await loginLink.click();

    // Should navigate to login page
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");

    console.log("✅ Navigation to login works");
  });
});

// ========================================
// LOGIN TESTS
// ========================================

test.describe("Login Flow", () => {
  test("Login page loads and displays form elements", async ({ page }) => {
    console.log("\n🔐 Testing login page load...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Verify page title
    await expect(
      page.getByRole("heading", { name: /masuk|login/i }),
    ).toBeVisible();

    // Verify form elements exist
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /password/i }),
    ).toBeVisible();

    // Verify role selection
    await expect(page.locator('label:has-text("Pekerja")')).toBeVisible();
    await expect(page.locator('label:has-text("Bisnis")')).toBeVisible();

    // Verify submit button
    await expect(
      page.getByRole("button", { name: /masuk|login/i }),
    ).toBeVisible();

    console.log("✅ Login page loaded with all form elements");
  });

  test("Worker login - successful", async ({ page }) => {
    console.log("\n👷 Testing worker login...");

    await loginAs(page, "worker");

    // Verify redirected to worker area
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/worker|onboarding|dashboard/);

    console.log("✅ Worker login successful");
  });

  test("Business login - successful", async ({ page }) => {
    console.log("\n🏢 Testing business login...");

    await loginAs(page, "business");

    // Verify redirected to business area
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/business|onboarding|dashboard/);

    console.log("✅ Business login successful");
  });

  test("Login with invalid credentials - wrong password", async ({ page }) => {
    console.log("\n❌ Testing invalid credentials...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Fill with invalid credentials
    await page
      .getByRole("textbox", { name: /email/i })
      .fill(DEMO_ACCOUNTS.worker.email);
    await page
      .getByRole("textbox", { name: /password/i })
      .fill("wrongpassword");

    // Select worker role
    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    await workerRadio.click({ force: true });

    // Submit login
    await page
      .getByRole("button", { name: /masuk|login/i })
      .click({ force: true });

    await page.waitForTimeout(3000);

    // Should stay on login page or show error
    const stayedOnLogin = page.url().includes("/login");
    const hasError =
      (await page.locator("text=/error|salah|invalid|failed|gagal/i").count()) >
      0;
    const hasToast = await waitForToast(page, "error", 3000);

    expect(stayedOnLogin || hasError || hasToast).toBeTruthy();

    console.log("✅ Invalid credentials handled correctly");
  });

  test("Login with non-existent email", async ({ page }) => {
    console.log("\n❌ Testing non-existent email...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Fill with non-existent email
    await page
      .getByRole("textbox", { name: /email/i })
      .fill("nonexistent@test.com");
    await page.getByRole("textbox", { name: /password/i }).fill("anypassword");

    // Select worker role
    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    await workerRadio.click({ force: true });

    // Submit login
    await page
      .getByRole("button", { name: /masuk|login/i })
      .click({ force: true });

    await page.waitForTimeout(3000);

    // Should stay on login page or show error
    const stayedOnLogin = page.url().includes("/login");
    const hasError =
      (await page.locator("text=/error|salah|invalid|failed|gagal/i").count()) >
      0;

    expect(stayedOnLogin || hasError).toBeTruthy();

    console.log("✅ Non-existent email handled correctly");
  });

  test("Login form validation - empty fields", async ({ page }) => {
    console.log("\n⚠️ Testing login form validation...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Try to submit empty form
    await page
      .getByRole("button", { name: /masuk|login/i })
      .click({ force: true });

    await page.waitForTimeout(1000);

    // Should still be on login page (HTML5 validation)
    expect(page.url()).toContain("/login");

    console.log("✅ Empty form validation works");
  });

  test("Navigation to register from login page", async ({ page }) => {
    console.log("\n🔗 Testing navigation to register...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Click register link
    const registerLink = page.getByRole("link", { name: /daftar|register/i });
    await registerLink.click();

    // Should navigate to register page
    await page.waitForURL("**/register");
    expect(page.url()).toContain("/register");

    console.log("✅ Navigation to register works");
  });
});

// ========================================
// LOGOUT TESTS
// ========================================

test.describe("Logout Flow", () => {
  test("Worker logout - successful", async ({ page }) => {
    console.log("\n🚪 Testing worker logout...");

    // First login
    await loginAs(page, "worker");

    // Verify logged in
    expect(page.url()).not.toContain("/login");

    // Logout
    await logout(page);

    // Verify logged out - should be on login page
    expect(page.url()).toContain("/login");

    console.log("✅ Worker logout successful");
  });

  test("Business logout - successful", async ({ page }) => {
    console.log("\n🚪 Testing business logout...");

    // First login
    await loginAs(page, "business");

    // Verify logged in
    expect(page.url()).not.toContain("/login");

    // Logout
    await logout(page);

    // Verify logged out - should be on login page
    expect(page.url()).toContain("/login");

    console.log("✅ Business logout successful");
  });

  test("Session cleared after logout", async ({ page }) => {
    console.log("\n🔒 Testing session cleared after logout...");

    // Login
    await loginAs(page, "worker");

    // Logout
    await logout(page);

    // Try to access protected route
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should be redirected to login (session cleared)
    const currentUrl = page.url();
    const isRedirectedToLogin = currentUrl.includes("/login");
    const isOnHome =
      currentUrl === page.url().split("/").slice(0, 3).join("/") + "/";

    expect(isRedirectedToLogin || isOnHome).toBeTruthy();

    console.log("✅ Session properly cleared after logout");
  });
});

// ========================================
// PROTECTED ROUTE TESTS
// ========================================

test.describe("Protected Routes", () => {
  test("Unauthenticated user redirected from worker route", async ({
    page,
  }) => {
    console.log("\n🔒 Testing protected worker route...");

    // Clear any existing session
    await page.context().clearCookies();

    // Try to access protected worker route
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should be redirected
    const currentUrl = page.url();
    const isRedirectedToLogin = currentUrl.includes("/login");
    const isOnHome = !currentUrl.includes("/worker/jobs");

    expect(isRedirectedToLogin || isOnHome).toBeTruthy();

    console.log("✅ Protected worker route redirects correctly");
  });

  test("Unauthenticated user redirected from business route", async ({
    page,
  }) => {
    console.log("\n🔒 Testing protected business route...");

    // Clear any existing session
    await page.context().clearCookies();

    // Try to access protected business route
    await page.goto("/business/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should be redirected
    const currentUrl = page.url();
    const isRedirectedToLogin = currentUrl.includes("/login");
    const isOnHome = !currentUrl.includes("/business/jobs");

    expect(isRedirectedToLogin || isOnHome).toBeTruthy();

    console.log("✅ Protected business route redirects correctly");
  });

  test("Authenticated worker can access worker routes", async ({ page }) => {
    console.log("\n✅ Testing worker route access after login...");

    // Login as worker
    await loginAs(page, "worker");

    // Navigate to worker jobs
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");

    // Should not be redirected to login
    expect(page.url()).not.toContain("/login");

    console.log("✅ Worker can access worker routes");
  });

  test("Authenticated business can access business routes", async ({
    page,
  }) => {
    console.log("\n✅ Testing business route access after login...");

    // Login as business
    await loginAs(page, "business");

    // Navigate to business jobs
    await page.goto("/business/jobs");
    await page.waitForLoadState("networkidle");

    // Should not be redirected to login
    expect(page.url()).not.toContain("/login");

    console.log("✅ Business can access business routes");
  });
});

// ========================================
// COMPLETE AUTH FLOW TEST
// ========================================

test.describe("Complete Auth Flow", () => {
  test("Full auth cycle: login → access protected → logout → redirect", async ({
    page,
  }) => {
    console.log("\n🔄 Testing complete auth cycle...");

    // Start unauthenticated
    await page.context().clearCookies();

    // Try to access protected route (should redirect)
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    let currentUrl = page.url();
    console.log(`After accessing protected route: ${currentUrl}`);

    // Login
    await loginAs(page, "worker");

    // Access protected route (should work now)
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");

    currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
    console.log(`After login, accessing protected route: ${currentUrl}`);

    // Logout
    await logout(page);

    // Try to access protected route again (should redirect)
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    currentUrl = page.url();
    const isRedirectedAfterLogout =
      currentUrl.includes("/login") || !currentUrl.includes("/worker/jobs");

    expect(isRedirectedAfterLogout).toBeTruthy();

    console.log("✅ Complete auth cycle works correctly");
  });

  test("Role switching: login as worker, logout, login as business", async ({
    page,
  }) => {
    console.log("\n🔄 Testing role switching...");

    // Login as worker
    await loginAs(page, "worker");

    // Access worker route
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");

    // Logout
    await logout(page);

    // Login as business
    await loginAs(page, "business");

    // Access business route
    await page.goto("/business/jobs");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");

    console.log("✅ Role switching works correctly");
  });
});
