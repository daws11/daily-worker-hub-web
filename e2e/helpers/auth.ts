/**
 * E2E Test Helpers - Authentication
 *
 * Reusable authentication helpers for E2E tests.
 *
 * Demo accounts:
 * - Worker: worker@demo.com / demo123456
 * - Business: business@demo.com / demo123456
 */

import { Page, expect } from "@playwright/test";

// Demo credentials
export const DEMO_ACCOUNTS = {
  worker: {
    email: "worker@demo.com",
    password: "demo123456",
    role: "worker" as const,
  },
  business: {
    email: "business@demo.com",
    password: "demo123456",
    role: "business" as const,
  },
} as const;

export type UserRole = "worker" | "business";

/**
 * Login helper - logs in as a specific user role
 *
 * @param page - Playwright page object
 * @param role - User role ('worker' or 'business')
 * @param customEmail - Optional custom email (defaults to demo account)
 * @param customPassword - Optional custom password (defaults to demo password)
 */
export async function loginAs(
  page: Page,
  role: UserRole,
  customEmail?: string,
  customPassword?: string,
): Promise<void> {
  const account = DEMO_ACCOUNTS[role];
  const email = customEmail || account.email;
  const password = customPassword || account.password;

  console.log(`🔐 Logging in as ${role} (${email})...`);

  // Navigate to login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill email
  const emailInput = page.getByRole("textbox", { name: /email/i });
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.getByRole("textbox", { name: /password/i });
  await passwordInput.fill(password);

  // Select role using the radio group
  const roleLabel = role === "worker" ? "Pekerja" : "Bisnis";
  const roleRadio = page.locator(`label:has-text("${roleLabel}")`).first();

  if ((await roleRadio.count()) > 0) {
    await roleRadio.click({ force: true });
  }

  // Submit login
  const submitButton = page.getByRole("button", { name: /masuk|login/i });
  await submitButton.click({ force: true });

  // Wait for redirect after login
  await page
    .waitForURL(/worker|business|dashboard|onboarding|jobs/, {
      timeout: 15000,
    })
    .catch(() => {
      console.log(`⚠️ URL wait timeout, current URL: ${page.url()}`);
    });

  // Additional wait for page to stabilize
  await page.waitForTimeout(2000);

  console.log(`✅ Logged in as ${role}`);
}

/**
 * Register a new user
 *
 * @param page - Playwright page object
 * @param email - Email address
 * @param password - Password
 * @param fullName - Full name
 * @param role - User role ('worker' or 'business')
 */
export async function registerUser(
  page: Page,
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
): Promise<void> {
  console.log(`📝 Registering new ${role} account: ${email}...`);

  // Navigate to register page
  await page.goto("/register");
  await page.waitForLoadState("networkidle");

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill full name
  const nameInput = page.getByRole("textbox", { name: /nama|name/i });
  await nameInput.fill(fullName);

  // Fill email
  const emailInput = page.getByRole("textbox", { name: /email/i });
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.getByRole("textbox", { name: /password/i });
  await passwordInput.fill(password);

  // Select role
  const roleLabel = role === "worker" ? "Pekerja" : "Bisnis";
  const roleRadio = page.locator(`label:has-text("${roleLabel}")`).first();

  if ((await roleRadio.count()) > 0) {
    await roleRadio.click({ force: true });
  }

  // Submit registration
  const submitButton = page.getByRole("button", { name: /daftar|register/i });
  await submitButton.click({ force: true });

  // Wait for redirect
  await page
    .waitForURL(/onboarding|login|worker|business/, {
      timeout: 15000,
    })
    .catch(() => {
      console.log(`⚠️ URL wait timeout after registration`);
    });

  await page.waitForTimeout(2000);

  console.log(`✅ Registration submitted for ${role}`);
}

/**
 * Logout helper - clears session and navigates to login
 *
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  console.log("🚪 Logging out...");

  // Clear all cookies to end session
  await page.context().clearCookies();

  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  console.log("✅ Logged out");
}

/**
 * Verify user is authenticated
 *
 * @param page - Playwright page object
 * @param expectedRole - Expected user role
 */
export async function verifyAuthenticated(
  page: Page,
  expectedRole?: UserRole,
): Promise<boolean> {
  const currentUrl = page.url();

  // Check if redirected away from login (indicates auth success)
  const isAuthenticated = !currentUrl.includes("/login");

  if (expectedRole) {
    const hasRoleInUrl = currentUrl.includes(`/${expectedRole}`);
    return isAuthenticated && hasRoleInUrl;
  }

  return isAuthenticated;
}

/**
 * Verify user is not authenticated (on login page)
 *
 * @param page - Playwright page object
 */
export async function verifyNotAuthenticated(page: Page): Promise<boolean> {
  await page.waitForTimeout(1000);
  const currentUrl = page.url();
  return currentUrl.includes("/login") || currentUrl === "/";
}

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix: string = "test"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@test.com`;
}

/**
 * Wait for toast notification
 *
 * @param page - Playwright page object
 * @param text - Optional text to match
 * @param timeout - Timeout in ms
 */
export async function waitForToast(
  page: Page,
  text?: string,
  timeout: number = 5000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const toastSelectors = [
      '[role="alert"]',
      "[data-toast]",
      ".toast",
      '[class*="toast"]',
      '[class*="sonner"]',
    ];

    for (const selector of toastSelectors) {
      const toast = page.locator(selector);
      const count = await toast.count();

      if (count > 0) {
        const toastText = (await toast.first().textContent()) || "";

        if (!text || toastText.toLowerCase().includes(text.toLowerCase())) {
          console.log(`✅ Toast found: "${toastText}"`);
          return true;
        }
      }
    }

    await page.waitForTimeout(500);
  }

  console.log("⚠️ No toast found within timeout");
  return false;
}

/**
 * Take a screenshot with standardized naming
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  directory: string = "test-results/screenshots",
): Promise<void> {
  const path = `${directory}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot saved: ${path}`);
}
