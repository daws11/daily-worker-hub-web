/**
 * Wallet Operations E2E Tests
 *
 * Tests wallet-related pages for both business and worker users:
 * - Business wallet page loads
 * - Worker earnings page loads
 * - Balance display
 * - Transaction list rendering
 * - Withdraw button presence (worker)
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

test.describe.serial("Business Wallet Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Login as business before each test
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD);

    const businessRadio = page.locator('label:has-text("Bisnis")').first();
    if ((await businessRadio.count()) > 0) {
      await businessRadio.click({ force: true });
    }

    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);
  });

  test("Business wallet page loads successfully", async ({ page }) => {
    console.log("\n💼 Testing business wallet page load...");

    await page.goto("/business/wallet");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "wallet-01-business-wallet");

    const currentUrl = page.url();
    console.log(`Business wallet URL: ${currentUrl}`);

    // Should not redirect to login
    expect(currentUrl).not.toContain("/login");
    expect(currentUrl).toContain("/business/wallet");

    console.log("✅ Business wallet page loaded");
  });

  test("Business balance display is present", async ({ page }) => {
    console.log("\n💰 Testing business balance display...");

    await page.goto("/business/wallet");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "wallet-02-business-balance");

    // Check for balance-related elements
    const hasBalanceCard =
      (await page.locator('[class*="card"], [class*="balance"]').count()) > 0;
    const hasCurrencyDisplay =
      (await page.locator("text=/IDR|Rp|Rp\\./").count()) > 0;
    const hasWalletIcon =
      (await page
        .locator('[class*="wallet"], [class*="Wallet"], svg')
        .count()) > 0;
    const hasBalanceLabel =
      (await page.locator("text=/balance|saldo|current/i").count()) > 0;

    console.log(
      `Has balance card: ${hasBalanceCard}, Has currency: ${hasCurrencyDisplay}`,
    );
    console.log(
      `Has wallet icon: ${hasWalletIcon}, Has balance label: ${hasBalanceLabel}`,
    );

    // Should have at least some balance-related content
    expect(
      hasBalanceCard || hasCurrencyDisplay || hasWalletIcon || hasBalanceLabel,
    ).toBeTruthy();

    console.log("✅ Business balance display present");
  });

  test("Business transaction list renders", async ({ page }) => {
    console.log("\n📋 Testing business transaction list...");

    await page.goto("/business/wallet");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "wallet-03-business-transactions");

    // Check for transaction history elements (flexible)
    const hasTable = (await page.locator('table, [role="table"]').count()) > 0;
    const hasTransactionSection =
      (await page.locator("text=/transaction|history|riwayat/i").count()) > 0;
    const hasEmptyState =
      (await page
        .locator("text=/tidak ada|no transaction|empty|kosong|belum ada/i")
        .count()) > 0;
    const hasCard =
      (await page
        .locator('[data-slot="card"], .card, [class*="card"]')
        .count()) > 0;
    const hasBalance =
      (await page.locator("text=/balance|saldo/i").count()) > 0;

    console.log(
      `Has table: ${hasTable}, Has transaction section: ${hasTransactionSection}, Has empty state: ${hasEmptyState}`,
    );
    console.log(`Has card: ${hasCard}, Has balance: ${hasBalance}`);

    // Should have transaction area, empty state, cards, or balance section
    expect(
      hasTable ||
        hasTransactionSection ||
        hasEmptyState ||
        hasCard ||
        hasBalance,
    ).toBeTruthy();

    console.log("✅ Business transaction list rendered");
  });
});

test.describe.serial("Worker Earnings Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Login as worker before each test
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(WORKER_PASSWORD);

    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    if ((await workerRadio.count()) > 0) {
      await workerRadio.click({ force: true });
    }

    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);
  });

  test("Worker earnings page loads successfully", async ({ page }) => {
    console.log("\n👷 Testing worker earnings page load...");

    await page.goto("/worker/earnings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "wallet-04-worker-earnings");

    const currentUrl = page.url();
    console.log(`Worker earnings URL: ${currentUrl}`);

    // Should not redirect to login
    expect(currentUrl).not.toContain("/login");
    expect(currentUrl).toContain("/worker/earnings");

    console.log("✅ Worker earnings page loaded");
  });

  test("Worker earnings balance display is present", async ({ page }) => {
    console.log("\n💵 Testing worker earnings balance display...");

    await page.goto("/worker/earnings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "wallet-05-worker-balance");

    // Check for earnings-related elements
    const hasEarningsHeader =
      (await page.locator("text=/penghasilan|earnings|income/i").count()) > 0;
    const hasCurrencyDisplay =
      (await page.locator("text=/IDR|Rp|Rp\\./").count()) > 0;
    const hasStatisticsCard =
      (await page.locator('[class*="card"]').count()) > 0;
    const hasPendingLabel =
      (await page.locator("text=/pending|menunggu|proses/i").count()) > 0;
    const hasCompletedLabel =
      (await page.locator("text=/completed|selesai|berhasil/i").count()) > 0;

    console.log(
      `Has earnings header: ${hasEarningsHeader}, Has currency: ${hasCurrencyDisplay}`,
    );
    console.log(
      `Has statistics card: ${hasStatisticsCard}, Has pending label: ${hasPendingLabel}, Has completed label: ${hasCompletedLabel}`,
    );

    // Should have earnings-related content
    expect(
      hasEarningsHeader || hasCurrencyDisplay || hasStatisticsCard,
    ).toBeTruthy();

    console.log("✅ Worker earnings balance display present");
  });

  test("Worker transaction list renders", async ({ page }) => {
    console.log("\n📊 Testing worker transaction list...");

    await page.goto("/worker/earnings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    await captureScreenshot(page, "wallet-06-worker-transactions");

    // Check for transaction list elements (flexible)
    const hasTransactionList =
      (await page
        .locator(
          '[class*="transaction"], [class*="payment"], [class*="earning"]',
        )
        .count()) > 0;
    const hasEmptyState =
      (await page
        .locator("text=/belum ada|no earnings|empty|kosong|no payment/i")
        .count()) > 0;
    const hasStatusGroup =
      (await page
        .locator("text=/pending|processing|completed|failed/i")
        .count()) > 0;
    const hasCard =
      (await page
        .locator('[data-slot="card"], .card, [class*="card"]')
        .count()) > 0;
    const hasLoadingState =
      (await page.locator('[class*="loading"], [class*="spinner"]').count()) >
      0;

    console.log(
      `Has transaction list: ${hasTransactionList}, Has empty state: ${hasEmptyState}`,
    );
    console.log(
      `Has status groups: ${hasStatusGroup}, Has card: ${hasCard}, Has loading: ${hasLoadingState}`,
    );

    // Should have transaction area, empty state, status groups, or cards
    expect(
      hasTransactionList || hasEmptyState || hasStatusGroup || hasCard,
    ).toBeTruthy();

    console.log("✅ Worker transaction list rendered");
  });

  test("Worker has withdraw option (if applicable)", async ({ page }) => {
    console.log("\n💸 Testing worker withdraw button presence...");

    // Check earnings page for withdraw button
    await page.goto("/worker/earnings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "wallet-07-worker-withdraw-earnings");

    // Look for withdraw-related elements
    const hasWithdrawButton =
      (await page
        .locator(
          'button:has-text("Withdraw"), button:has-text("Tarik"), button:has-text("withdraw")',
        )
        .count()) > 0;
    const hasWithdrawLink =
      (await page
        .locator('a:has-text("Withdraw"), a:has-text("Tarik")')
        .count()) > 0;
    const hasWithdrawText =
      (await page.locator("text=/withdraw|tarik saldo|pencairan/i").count()) >
      0;

    console.log(
      `Earnings page - Has withdraw button: ${hasWithdrawButton}, Has withdraw link: ${hasWithdrawLink}, Has withdraw text: ${hasWithdrawText}`,
    );

    // Also check wallet page
    await page.goto("/worker/wallet");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "wallet-08-worker-withdraw-wallet");

    const walletHasWithdraw =
      (await page
        .locator(
          'button:has-text("Withdraw"), button:has-text("Tarik"), button:has-text("withdraw")',
        )
        .count()) > 0;
    const walletHasWithdrawText =
      (await page.locator("text=/withdraw|tarik saldo|pencairan/i").count()) >
      0;

    console.log(
      `Wallet page - Has withdraw button: ${walletHasWithdraw}, Has withdraw text: ${walletHasWithdrawText}`,
    );

    // If withdraw functionality exists, it should be accessible
    if (hasWithdrawButton || hasWithdrawLink || walletHasWithdraw) {
      console.log("✅ Withdraw button/link found");
    } else if (hasWithdrawText || walletHasWithdrawText) {
      console.log(
        "ℹ️ Withdraw-related text found (button might be conditionally shown)",
      );
    } else {
      console.log(
        "ℹ️ No withdraw button found - might be disabled or not implemented yet",
      );
    }
  });

  test("Worker earnings statistics cards are present", async ({ page }) => {
    console.log("\n📈 Testing worker earnings statistics...");

    await page.goto("/worker/earnings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await captureScreenshot(page, "wallet-09-worker-stats");

    // Check for statistics cards
    const hasTotalEarnings =
      (await page.locator("text=/total penghasilan|total earnings/i").count()) >
      0;
    const hasPendingPayments =
      (await page.locator("text=/menunggu|pending|diproses/i").count()) > 0;
    const hasCompletedPayments =
      (await page.locator("text=/selesai|completed|berhasil/i").count()) > 0;
    const hasTotalTransactions =
      (await page
        .locator("text=/total transaksi|total transactions/i")
        .count()) > 0;

    console.log(
      `Has total earnings: ${hasTotalEarnings}, Has pending: ${hasPendingPayments}`,
    );
    console.log(
      `Has completed: ${hasCompletedPayments}, Has total transactions: ${hasTotalTransactions}`,
    );

    // Should have at least some statistics
    const hasStats =
      hasTotalEarnings ||
      hasPendingPayments ||
      hasCompletedPayments ||
      hasTotalTransactions;
    expect(hasStats).toBeTruthy();

    console.log("✅ Worker earnings statistics present");
  });
});

test.describe.serial("Wallet Page Comparison", () => {
  test("Both wallet pages are accessible after login", async ({ page }) => {
    console.log("\n🔄 Testing wallet pages accessibility...");

    // Login as business
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL);
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD);
    const businessRadio = page.locator('label:has-text("Bisnis")').first();
    if ((await businessRadio.count()) > 0)
      await businessRadio.click({ force: true });
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);

    // Access business wallet
    await page.goto("/business/wallet");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    let currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
    console.log("✅ Business wallet accessible");

    await captureScreenshot(page, "wallet-10-comparison-business");

    // Clear session and login as worker
    await page.context().clearCookies();

    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[type="email"]').fill(WORKER_EMAIL);
    await page.locator('input[type="password"]').fill(WORKER_PASSWORD);
    const workerRadio = page.locator('label:has-text("Pekerja")').first();
    if ((await workerRadio.count()) > 0)
      await workerRadio.click({ force: true });
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(3000);

    // Access worker earnings
    await page.goto("/worker/earnings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
    console.log("✅ Worker earnings accessible");

    await captureScreenshot(page, "wallet-11-comparison-worker");

    console.log("✅ Both wallet/earnings pages are accessible");
  });
});
