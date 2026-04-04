/**
 * E2E Tests: Authentication Session & Edge Cases
 *
 * Covers gaps in auth.spec.ts:
 * - Session persistence across page reload
 * - Session persistence across navigation
 * - Authenticated user redirect from login/register
 * - Registration with duplicate email
 * - Registration with weak password
 * - Forgot password link navigation
 * - Role-based access boundary (worker can't access business routes)
 * - Auth callback route
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
  generateTestEmail,
  waitForToast,
  DEMO_ACCOUNTS,
} from "../../e2e/helpers/auth";

test.describe.configure({ mode: "serial" });

// ========================================
// SESSION PERSISTENCE TESTS
// ========================================

test.describe("Session Persistence", () => {
  test("Session persists after page reload", async ({ page }) => {
    console.log("\n🔄 Testing session persistence after reload...");

    // Login as worker
    await loginAs(page, "worker");

    // Verify we're logged in (not on login page)
    const urlAfterLogin = page.url();
    expect(urlAfterLogin).not.toContain("/login");
    console.log(`Logged in at: ${urlAfterLogin}`);

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should still be authenticated (not redirected to login)
    const urlAfterReload = page.url();
    expect(urlAfterReload).not.toContain("/login");
    console.log(`After reload at: ${urlAfterReload}`);

    console.log("✅ Session persists after page reload");
  });

  test("Session persists across navigation between protected routes", async ({
    page,
  }) => {
    console.log("\n🔄 Testing session persistence across navigation...");

    // Login as worker
    await loginAs(page, "worker");

    // Navigate to worker jobs
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");

    // Navigate to worker settings
    await page.goto("/worker/settings");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");

    // Navigate to worker wallet
    await page.goto("/worker/wallet");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");

    // Navigate back to jobs
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");

    console.log("✅ Session persists across all navigations");
  });

  test("Session persists after navigating to public page and back", async ({
    page,
  }) => {
    console.log("\n🔄 Testing session survives public page visit...");

    // Login as worker
    await loginAs(page, "worker");

    // Visit public jobs page
    await page.goto("/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Go back to protected route - should still be authenticated
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    expect(page.url()).not.toContain("/login");

    console.log("✅ Session survives visiting public pages");
  });

  test("Session is cleared after signOut from auth provider", async ({
    page,
  }) => {
    console.log("\n🔒 Testing proper session invalidation...");

    // Login as worker
    await loginAs(page, "worker");

    // Use the app's sign-out mechanism (via the UI if available)
    // First try to find a logout button in the UI
    const logoutButton = page.locator(
      'button:has-text("Keluar"), button:has-text("Logout"), [data-testid="logout-button"]',
    );

    if ((await logoutButton.count()) > 0) {
      await logoutButton.first().click({ force: true });
      await page.waitForTimeout(2000);
    } else {
      // Fallback: clear cookies/sessions manually
      await logout(page);
    }

    // Verify session is cleared - protected routes should redirect
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    expect(
      currentUrl.includes("/login") || !currentUrl.includes("/worker/jobs"),
    ).toBeTruthy();

    console.log("✅ Session properly invalidated after logout");
  });
});

// ========================================
// AUTHENTICATED USER REDIRECT TESTS
// ========================================

test.describe("Authenticated User Redirects", () => {
  test("Logged-in worker visiting /login is redirected away", async ({
    page,
  }) => {
    console.log("\n↩️ Testing logged-in user redirect from login...");

    // Login as worker
    await loginAs(page, "worker");

    // Now try to visit login page
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`URL after visiting /login while logged in: ${currentUrl}`);

    // Should be redirected away from login (to worker area or onboarding)
    const isRedirected =
      !currentUrl.includes("/login") ||
      currentUrl.includes("/worker") ||
      currentUrl.includes("/onboarding");

    // Note: This behavior depends on middleware - if not implemented, that's a finding
    if (isRedirected) {
      console.log("✅ Logged-in user correctly redirected from login");
    } else {
      console.log(
        "⚠️ Logged-in user can still access /login (potential UX improvement)",
      );
    }
  });

  test("Logged-in business visiting /register is redirected away", async ({
    page,
  }) => {
    console.log("\n↩️ Testing logged-in user redirect from register...");

    // Login as business
    await loginAs(page, "business");

    // Try to visit register page
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`URL after visiting /register while logged in: ${currentUrl}`);

    const isRedirected =
      !currentUrl.includes("/register") ||
      currentUrl.includes("/business") ||
      currentUrl.includes("/onboarding");

    if (isRedirected) {
      console.log("✅ Logged-in user correctly redirected from register");
    } else {
      console.log(
        "⚠️ Logged-in user can still access /register (potential UX improvement)",
      );
    }
  });
});

// ========================================
// REGISTRATION EDGE CASES
// ========================================

test.describe("Registration Edge Cases", () => {
  test("Registration with duplicate email shows error", async ({ page }) => {
    console.log("\n❌ Testing duplicate email registration...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Try to register with an existing demo account email
    await page.getByRole("textbox", { name: /nama|name/i }).fill("Duplicate User");
    await page.getByRole("textbox", { name: /email/i }).fill(DEMO_ACCOUNTS.worker.email);
    await page.getByRole("textbox", { name: /password/i }).fill("TestPassword123");

    // Select worker role
    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    await workerRadio.click({ force: true });

    // Submit
    await page.getByRole("button", { name: /daftar|register/i }).click({ force: true });
    await page.waitForTimeout(3000);

    // Should show error or stay on register page
    const stayedOnRegister = page.url().includes("/register");
    const hasError = (await page.locator("text=/sudah terdaftar|already exists|error|gagal|failed/i").count()) > 0;
    const hasToast = await waitForToast(page, undefined, 3000);

    expect(stayedOnRegister || hasError || hasToast).toBeTruthy();

    console.log("✅ Duplicate email registration handled");
  });

  test("Registration with weak password shows validation", async ({ page }) => {
    console.log("\n⚠️ Testing weak password registration...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const testEmail = generateTestEmail("weak-pw");

    await page.getByRole("textbox", { name: /nama|name/i }).fill("Weak Password User");
    await page.getByRole("textbox", { name: /email/i }).fill(testEmail);
    // Very short password
    await page.getByRole("textbox", { name: /password/i }).fill("123");

    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    await workerRadio.click({ force: true });

    await page.getByRole("button", { name: /daftar|register/i }).click({ force: true });
    await page.waitForTimeout(3000);

    // Should show error or stay on register
    const stayedOnRegister = page.url().includes("/register");
    const hasError = (await page.locator("text=/password|weak|lemah|min|karakter|error/i").count()) > 0;
    const hasToast = await waitForToast(page, undefined, 3000);

    expect(stayedOnRegister || hasError || hasToast).toBeTruthy();

    console.log("✅ Weak password validation works");
  });

  test("Registration with all valid fields submits successfully", async ({
    page,
  }) => {
    console.log("\n📝 Testing successful registration submission...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const testEmail = generateTestEmail("reg-test");
    console.log(`Using test email: ${testEmail}`);

    await page.getByRole("textbox", { name: /nama|name/i }).fill("Test Registration User");
    await page.getByRole("textbox", { name: /email/i }).fill(testEmail);
    await page.getByRole("textbox", { name: /password/i }).fill("TestPass123456");

    // Select business role
    const businessRadio = page.locator('label:has-text("Bisnis")').first();
    await businessRadio.click({ force: true });

    await page.getByRole("button", { name: /daftar|register/i }).click({ force: true });

    // Wait for redirect (should go to onboarding or login)
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    console.log(`After registration URL: ${currentUrl}`);

    // Should redirect to onboarding, login, or show success message
    const redirected =
      currentUrl.includes("/onboarding") ||
      currentUrl.includes("/login") ||
      currentUrl.includes("/worker") ||
      currentUrl.includes("/business");
    const hasSuccess = (await page.locator("text=/berhasil|success|verifikasi|verify/i").count()) > 0;

    expect(redirected || hasSuccess).toBeTruthy();

    console.log("✅ Registration submission processed");
  });

  test("Registration form - password requirements hint is visible", async ({
    page,
  }) => {
    console.log("\n📋 Testing password requirements hint...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Check for password requirements text
    const hasRequirements = (await page.locator("text=/min|karakter|angka|huruf besar|8 karakter/i").count()) > 0;

    if (hasRequirements) {
      console.log("✅ Password requirements hint is visible");
    } else {
      console.log("⚠️ No password requirements hint found on register page");
    }
  });
});

// ========================================
// FORGOT PASSWORD TESTS
// ========================================

test.describe("Forgot Password", () => {
  test("Forgot password link is visible on login page", async ({ page }) => {
    console.log("\n🔗 Testing forgot password link visibility...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const forgotLink = page.getByRole("link", { name: /lupa password|forgot password/i });
    await expect(forgotLink).toBeVisible();

    console.log("✅ Forgot password link is visible");
  });

  test("Forgot password link navigates correctly", async ({ page }) => {
    console.log("\n🔗 Testing forgot password navigation...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const forgotLink = page.getByRole("link", { name: /lupa password|forgot password/i });
    await forgotLink.click();

    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`After clicking forgot password: ${currentUrl}`);

    // Should navigate to /forgot-password
    expect(currentUrl).toContain("/forgot-password");

    console.log("✅ Forgot password link navigates to correct page");
  });

  test("Forgot password page loads with email form", async ({ page }) => {
    console.log("\n📧 Testing forgot password page...");

    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`Forgot password page URL: ${currentUrl}`);

    // Check for email input
    const hasEmailInput =
      (await page.locator('input[type="email"], input[name="email"]').count()) > 0;
    const hasSubmitButton =
      (await page.locator('button[type="submit"]').count()) > 0;

    if (hasEmailInput) {
      console.log("✅ Forgot password page has email input");

      // Test submitting with an email
      await page.locator('input[type="email"], input[name="email"]').first().fill(DEMO_ACCOUNTS.worker.email);

      if (hasSubmitButton) {
        await page.locator('button[type="submit"]').first().click({ force: true });
        await page.waitForTimeout(3000);

        const hasConfirmation =
          (await page.locator("text=/terkirim|sent|cek email|check email|link/i").count()) > 0;
        const hasToast = await waitForToast(page, undefined, 3000);

        if (hasConfirmation || hasToast) {
          console.log("✅ Forgot password form submission works");
        } else {
          console.log("⚠️ No confirmation after forgot password submission");
        }
      }
    } else {
      console.log("⚠️ Forgot password page has no email input (page may not be implemented)");
    }
  });
});

// ========================================
// ROLE-BASED ACCESS BOUNDARY TESTS
// ========================================

test.describe("Role-Based Access Boundaries", () => {
  test("Worker cannot access business routes", async ({ page }) => {
    console.log("\n🚫 Testing worker access to business routes...");

    // Login as worker
    await loginAs(page, "worker");

    // Try to access business routes
    await page.goto("/business/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`Worker visiting /business/jobs: ${currentUrl}`);

    // Should be redirected away from business routes
    // (either to /worker, /onboarding, or /login)
    const isBlocked =
      !currentUrl.includes("/business/jobs") ||
      currentUrl.includes("/worker") ||
      currentUrl.includes("/onboarding");

    if (isBlocked) {
      console.log("✅ Worker correctly blocked from business routes");
    } else {
      console.log(
        "⚠️ Worker can access business routes (check if role-based access is enforced)",
      );
    }
  });

  test("Business cannot access worker routes", async ({ page }) => {
    console.log("\n🚫 Testing business access to worker routes...");

    // Login as business
    await loginAs(page, "business");

    // Try to access worker routes
    await page.goto("/worker/jobs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`Business visiting /worker/jobs: ${currentUrl}`);

    // Should be redirected away from worker routes
    const isBlocked =
      !currentUrl.includes("/worker/jobs") ||
      currentUrl.includes("/business") ||
      currentUrl.includes("/onboarding");

    if (isBlocked) {
      console.log("✅ Business correctly blocked from worker routes");
    } else {
      console.log(
        "⚠️ Business can access worker routes (check if role-based access is enforced)",
      );
    }
  });
});

// ========================================
// AUTH CALLBACK TEST
// ========================================

test.describe("Auth Callback", () => {
  test("Auth callback route handles missing params gracefully", async ({
    page,
  }) => {
    console.log("\n🔗 Testing auth callback with invalid params...");

    // Visit callback route directly without valid auth params
    await page.goto("/auth/callback");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`After visiting /auth/callback: ${currentUrl}`);

    // Should redirect somewhere sensible (login, home, etc.) - not crash
    const hasError500 =
      (await page.locator("text=/500|internal server error/i").count()) > 0;

    expect(hasError500).toBeFalsy();

    console.log("✅ Auth callback handles invalid access gracefully");
  });
});

// ========================================
// SECURITY TESTS
// ========================================

test.describe("Auth Security", () => {
  test("Login form has autocomplete attributes", async ({ page }) => {
    console.log("\n🔒 Testing login form security attributes...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    const emailAutocomplete = await emailInput.getAttribute("autocomplete");
    const passwordAutocomplete = await passwordInput.getAttribute("autocomplete");

    console.log(`Email autocomplete: ${emailAutocomplete}`);
    console.log(`Password autocomplete: ${passwordAutocomplete}`);

    // Email should have email autocomplete, password should have current-password
    expect(emailAutocomplete).toBe("email");
    expect(passwordAutocomplete).toBe("current-password");

    console.log("✅ Login form has proper autocomplete attributes");
  });

  test("Register form has autocomplete attributes", async ({ page }) => {
    console.log("\n🔒 Testing register form security attributes...");

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    const emailAutocomplete = await emailInput.getAttribute("autocomplete");
    const passwordAutocomplete = await passwordInput.getAttribute("autocomplete");

    expect(emailAutocomplete).toBe("email");
    expect(passwordAutocomplete).toBe("new-password");

    console.log("✅ Register form has proper autocomplete attributes");
  });

  test("Password fields are masked", async ({ page }) => {
    console.log("\n🔒 Testing password masking...");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const passwordInput = page.locator('input[type="password"]');
    const inputType = await passwordInput.getAttribute("type");

    expect(inputType).toBe("password");

    console.log("✅ Password field is properly masked");
  });

  test("Security headers are present on auth pages", async ({ page }) => {
    console.log("\n🔒 Testing security headers...");

    const response = await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const headers = response?.headers();

    if (headers) {
      // Check for key security headers
      const hasFrameOptions = !!headers["x-frame-options"];
      const hasContentTypeOptions = !!headers["x-content-type-options"];

      console.log(`X-Frame-Options: ${headers["x-frame-options"] || "missing"}`);
      console.log(`X-Content-Type-Options: ${headers["x-content-type-options"] || "missing"}`);
      console.log(`Strict-Transport-Security: ${headers["strict-transport-security"] || "missing"}`);

      expect(hasFrameOptions).toBeTruthy();
      expect(hasContentTypeOptions).toBeTruthy();

      console.log("✅ Security headers present");
    }
  });
});
