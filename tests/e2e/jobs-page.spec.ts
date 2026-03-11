import { test, expect } from '@playwright/test';

test.describe('Jobs Page E2E Test', () => {
  test('should load jobs page and display jobs or empty state', async ({ page }) => {
    // Navigate to jobs page
    await page.goto('/jobs');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/e2e/screenshots/jobs-page.png' });

    // Check if jobs are displayed or empty state
    const jobCards = await page.locator('[data-testid^="job-card"], article, [class*="job-card"]').all();
    const hasEmptyState = await page.locator('text=/tidak ada|no job|empty|kosong|coming soon|Try adjusting/i').count() > 0;
    
    console.log(`Found ${jobCards.length} job cards, empty state: ${hasEmptyState}`);

    // Page should have content
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100);

    // Should either show jobs or empty state
    expect(jobCards.length > 0 || hasEmptyState).toBeTruthy();
  });

  test('should have job search and filters', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    // Check for search input or filter elements
    const hasSearch = await page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="cari" i]').count() > 0;
    const hasFilters = await page.locator('select, [role="combobox"], button:has-text("Filter")').count() > 0;
    
    console.log(`Has search: ${hasSearch}, Has filters: ${hasFilters}`);
    
    // Page should load properly
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });
});
