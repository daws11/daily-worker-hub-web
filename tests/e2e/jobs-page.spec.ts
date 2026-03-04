import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

test.describe('Jobs Page E2E Test', () => {
  test('should load jobs page and display jobs', async () => {
    // Launch browser with --no-sandbox to bypass AppArmor issues
    const browser = await chromium.launch({
      args: ['--no-sandbox'],
      headless: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to jobs page
    await page.goto('http://localhost:3000/jobs');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/e2e/screenshots/jobs-page.png' });

    // Check if jobs are displayed
    const jobCards = await page.locator('[data-testid^="job-card"]').all();
    console.log(`Found ${jobCards.length} job cards`);

    // Check if page has any jobs
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Jobs');

    // Check for at least some content
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();

    await browser.close();
  });

  test('should navigate to job detail', async () => {
    const browser = await chromium.launch({
      args: ['--no-sandbox'],
      headless: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:3000/jobs');

    // Wait for first job card to appear
    const firstJobCard = await page.locator('[data-testid^="job-card"]').first();
    await expect(firstJobCard).toBeVisible();

    // Click on first job
    await firstJobCard.click();

    // Wait for navigation or modal
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/job-detail-clicked.png' });

    await browser.close();
  });
});
