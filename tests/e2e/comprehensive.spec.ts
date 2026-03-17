import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
import path from 'path';

test.describe('Daily Worker Hub - Comprehensive E2E Testing', () => {
  let browser: any;
  let page: any;

  test.beforeAll(async () => {
    // Launch browser with --no-sandbox to bypass AppArmor
    browser = await chromium.launch({
      args: ['--no-sandbox'],
      headless: true, // Use headless mode (no display needed)
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    page = await context.newPage();

    // Login as test worker (would need credentials)
    // For now, just navigate through public pages
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('1. Jobs Page - Home', async () => {
    console.log('Test 1: Jobs Page');
    await page.goto('http://localhost:3000/jobs');

    // Wait for DOM content (faster than networkidle)
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('main, [role="main"], body', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Take full page screenshot
    await page.screenshot({
      path: 'screenshots/01-jobs-page.png',
      fullPage: true
    });

    console.log('✓ Jobs page screenshot saved');
  });

  test('2. Worker Login Page', async () => {
    console.log('Test 2: Worker Login Page');
    await page.goto('http://localhost:3000/login?role=worker');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'screenshots/02-worker-login.png',
      fullPage: true
    });

    console.log('✓ Worker login page screenshot saved');
  });

  test('3. Business Login Page', async () => {
    console.log('Test 3: Business Login Page');
    await page.goto('http://localhost:3000/login?role=business');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'screenshots/03-business-login.png',
      fullPage: true
    });

    console.log('✓ Business login page screenshot saved');
  });

  test('4. Worker Dashboard', async () => {
    console.log('Test 4: Worker Dashboard');
    await page.goto('http://localhost:3000/worker');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/04-worker-dashboard.png',
      fullPage: true
    });

    console.log('✓ Worker dashboard screenshot saved');
  });

  test('5. Business Dashboard', async () => {
    console.log('Test 5: Business Dashboard');
    await page.goto('http://localhost:3000/business');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/05-business-dashboard.png',
      fullPage: true
    });

    console.log('✓ Business dashboard screenshot saved');
  });

  test('6. Job Detail Page', async () => {
    console.log('Test 6: Job Detail Page');
    await page.goto('http://localhost:3000/jobs');

    // Wait for job cards to load
    await page.waitForTimeout(3000);

    // Try to click on first job card
    const jobCards = await page.locator('article').all();
    if (jobCards.length > 0) {
      console.log(`Found ${jobCards.length} job cards`);

      // Click on first job
      await jobCards[0].click();

      // Wait for navigation to job detail
      await page.waitForTimeout(2000);

      // Take screenshot of job detail
      await page.screenshot({
        path: 'screenshots/06-job-detail.png',
        fullPage: true
      });

      console.log('✓ Job detail page screenshot saved');
    } else {
      console.log('⚠ No job cards found - taking screenshot of empty page');
      await page.screenshot({
        path: 'screenshots/06-jobs-empty.png',
        fullPage: true
      });
    }
  });

  test('7. Worker Applications Page', async () => {
    console.log('Test 7: Worker Applications Page');
    await page.goto('http://localhost:3000/worker/applications');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/07-worker-applications.png',
      fullPage: true
    });

    console.log('✓ Worker applications page screenshot saved');
  });

  test('8. Worker Bookings Page', async () => {
    console.log('Test 8: Worker Bookings Page');
    await page.goto('http://localhost:3000/worker/bookings');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/08-worker-bookings.png',
      fullPage: true
    });

    console.log('✓ Worker bookings page screenshot saved');
  });

  test('9. Business Jobs Page', async () => {
    console.log('Test 9: Business Jobs Page');
    await page.goto('http://localhost:3000/business/jobs');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/09-business-jobs.png',
      fullPage: true
    });

    console.log('✓ Business jobs page screenshot saved');
  });

  test('10. Job Creation Page', async () => {
    console.log('Test 10: Job Creation Page');
    await page.goto('http://localhost:3000/business/jobs/new');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/10-job-creation.png',
      fullPage: true
    });

    console.log('✓ Job creation page screenshot saved');
  });

  test('11. Booking Interview Page (Example)', async () => {
    console.log('Test 11: Booking Interview Page');
    await page.goto('http://localhost:3000/business/interview/test');

    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/11-booking-interview.png',
      fullPage: true
    });

    console.log('✓ Booking interview page screenshot saved');
  });
});
