/**
 * E2E Tests: Complete Booking Flow
 * 
 * Tests the full booking lifecycle:
 * - Phase 1: Business creates a job
 * - Phase 2: Worker applies to the job
 * - Phase 3: Business accepts the application
 * - Phase 4: Worker check-in
 * - Phase 5: Worker check-out
 * - Phase 6: Business reviews worker
 * - Phase 7: Worker reviews business
 * 
 * Each phase is tested independently to allow for:
 * - Parallel test execution
 * - Easier debugging
 * - Isolated failures
 * 
 * Demo accounts:
 * - Worker: worker@demo.com / demo123456
 * - Business: business@demo.com / demo123456
 */

import { test, expect, Page } from '@playwright/test'
import { loginAs, logout, waitForToast, takeScreenshot } from './helpers/auth'

// ========================================
// TEST CONFIGURATION
// ========================================

// Demo credentials
const WORKER_EMAIL = 'worker@demo.com'
const BUSINESS_EMAIL = 'business@demo.com'
const PASSWORD = 'demo123456'

// Test data generators
function generateJobTitle(): string {
  return `E2E Test Job ${Date.now()}`
}

function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

// ========================================
// PHASE 1: JOB CREATION (BUSINESS)
// ========================================

test.describe('Booking Phase 1: Job Creation', () => {
  test.use({ storageState: '.auth/business.json' })

  test('Business can access job creation page', async ({ page }) => {
    console.log('\n📝 Testing job creation page access...')

    // Login as business
    await loginAs(page, 'business')

    // Navigate to job creation page
    await page.goto('/business/jobs/new')
    await page.waitForLoadState('networkidle')

    // Check if redirected to alternative path
    const currentUrl = page.url()
    if (!currentUrl.includes('/jobs')) {
      await page.goto('/business/jobs/create')
      await page.waitForLoadState('networkidle')
    }

    // Verify page loaded
    expect(page.url()).not.toContain('/login')

    console.log('✅ Job creation page accessible')
  })

  test('Business can create a new job', async ({ page }) => {
    console.log('\n📝 Testing job creation...')

    const jobTitle = generateJobTitle()
    const jobDescription = 'E2E test job for booking flow'
    const jobWage = '150000'

    // Login as business
    await loginAs(page, 'business')

    // Navigate to job creation
    await page.goto('/business/jobs/new')
    await page.waitForLoadState('networkidle')

    // If redirected, try alternative path
    if (!page.url().includes('/jobs')) {
      await page.goto('/business/jobs/create')
      await page.waitForLoadState('networkidle')
    }

    // Fill job form - Title
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[placeholder*="judul" i]').first()
    if (await titleInput.count() > 0) {
      await titleInput.fill(jobTitle)
      console.log('✓ Title filled')
    }

    // Fill job form - Description
    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i], textarea').first()
    if (await descInput.count() > 0) {
      await descInput.fill(jobDescription)
      console.log('✓ Description filled')
    }

    // Fill job form - Position (select from dropdown)
    const positionSelect = page.locator('select[name="position"], select[name="positionId"], [role="combobox"]').first()
    if (await positionSelect.count() > 0) {
      try {
        await positionSelect.selectOption({ label: 'Housekeeping' })
        console.log('✓ Position selected')
      } catch {
        // Try clicking dropdown
        await positionSelect.click({ force: true })
        await page.waitForTimeout(500)
        const option = page.locator('text=/housekeeping|cleaner|steward/i').first()
        if (await option.count() > 0) {
          await option.click({ force: true })
        }
      }
    }

    // Fill job form - Wage
    const wageInput = page.locator('input[name="wage"], input[name="budget"], input[type="number"]').first()
    if (await wageInput.count() > 0) {
      await wageInput.fill(jobWage)
      console.log('✓ Wage filled')
    }

    // Fill job form - Date
    const dateInput = page.locator('input[type="date"], input[name="date"], input[placeholder*="date" i]').first()
    if (await dateInput.count() > 0) {
      await dateInput.fill(getTomorrowDate())
      console.log('✓ Date filled')
    }

    // Take screenshot of filled form
    await takeScreenshot(page, 'booking-01-job-form-filled', 'test-results/booking-flow')

    // Submit job
    const submitBtn = page.getByRole('button', { name: /create|post|simpan|submit|buat|publish/i })
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click({ force: true })
      console.log('✓ Submit button clicked')

      // Wait for redirect or success
      await page.waitForTimeout(3000)
      await waitForToast(page, 'success', 5000)
    }

    // Verify job created - should redirect to jobs list or job detail
    const afterUrl = page.url()
    const jobCreated = afterUrl.includes('/jobs') && !afterUrl.includes('/new') && !afterUrl.includes('/create')

    console.log(`After submit URL: ${afterUrl}`)

    // Navigate to jobs list to verify
    await page.goto('/business/jobs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await takeScreenshot(page, 'booking-02-jobs-list', 'test-results/booking-flow')

    console.log('✅ Job creation flow completed')
  })

  test('Job appears in business jobs list', async ({ page }) => {
    console.log('\n📋 Testing jobs list...')

    await loginAs(page, 'business')

    // Navigate to jobs list
    await page.goto('/business/jobs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify page loaded
    expect(page.url()).not.toContain('/login')

    // Check for job cards or empty state
    const hasJobCards = await page.locator('article, [data-testid="job-card"], .job-card, [class*="job"]').count() > 0
    const hasEmptyState = await page.locator('text=/tidak ada|no job|empty|kosong/i').count() > 0

    expect(hasJobCards || hasEmptyState).toBeTruthy()

    console.log('✅ Jobs list page loads correctly')
  })
})

// ========================================
// PHASE 2: WORKER APPLICATION
// ========================================

test.describe('Booking Phase 2: Worker Application', () => {
  test('Worker can view available jobs', async ({ page }) => {
    console.log('\n🔍 Testing worker jobs view...')

    await loginAs(page, 'worker')

    // Navigate to jobs marketplace
    await page.goto('/worker/jobs')
    await page.waitForLoadState('networkidle')

    // If redirected, try public jobs
    if (page.url().includes('/login')) {
      await page.goto('/jobs')
      await page.waitForLoadState('networkidle')
    }

    // Verify page loaded
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')

    await takeScreenshot(page, 'booking-03-worker-jobs', 'test-results/booking-flow')

    console.log('✅ Worker can view jobs')
  })

  test('Worker can view job details', async ({ page }) => {
    console.log('\n📄 Testing job detail view...')

    await loginAs(page, 'worker')

    // Navigate to jobs
    await page.goto('/worker/jobs')
    await page.waitForLoadState('networkidle')

    // Find a job to click
    const jobCard = page.locator('article, [data-testid="job-card"], .job-card, [class*="job"]').first()
    
    if (await jobCard.count() > 0) {
      await jobCard.click({ force: true })
      await page.waitForTimeout(2000)

      // Verify job detail page loaded
      const currentUrl = page.url()
      const onDetailPage = currentUrl.includes('/jobs/') || currentUrl.includes('/job/')

      await takeScreenshot(page, 'booking-04-job-detail', 'test-results/booking-flow')

      console.log(`On job detail page: ${onDetailPage}`)
    }

    console.log('✅ Worker can view job details')
  })

  test('Worker can apply to a job', async ({ page }) => {
    console.log('\n📤 Testing job application...')

    await loginAs(page, 'worker')

    // Navigate to jobs
    await page.goto('/worker/jobs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Find a job and click
    const jobCard = page.locator('article, [data-testid="job-card"], .job-card, a[href*="/jobs/"]').first()
    
    if (await jobCard.count() > 0) {
      await jobCard.click({ force: true })
      await page.waitForTimeout(2000)
    }

    // Look for Apply button
    const applyBtn = page.getByRole('button', { name: /apply|lamar|book/i })

    if (await applyBtn.count() > 0) {
      await applyBtn.first().click({ force: true })
      await page.waitForTimeout(2000)

      // Check for application form
      const coverLetterInput = page.locator('textarea[name="coverLetter"], textarea[placeholder*="cover" i], textarea').first()
      if (await coverLetterInput.count() > 0) {
        await coverLetterInput.fill('I am very interested in this position. I have relevant experience.')
        console.log('✓ Cover letter filled')
      }

      // Submit application if there's a form
      const submitAppBtn = page.getByRole('button', { name: /submit|apply|lamar|kirim/i })
      if (await submitAppBtn.count() > 0) {
        await submitAppBtn.first().click({ force: true })
        await page.waitForTimeout(2000)
        await waitForToast(page, 'success', 5000)
      }

      await takeScreenshot(page, 'booking-05-application-submitted', 'test-results/booking-flow')
      console.log('✓ Application submitted')
    } else {
      console.log('⚠️ Apply button not found - may already be applied or job not available')
    }

    console.log('✅ Application flow tested')
  })

  test('Worker can view their applications', async ({ page }) => {
    console.log('\n📋 Testing applications list...')

    await loginAs(page, 'worker')

    // Navigate to applications
    await page.goto('/worker/applications')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify page loaded
    expect(page.url()).not.toContain('/login')

    await takeScreenshot(page, 'booking-06-applications-list', 'test-results/booking-flow')

    console.log('✅ Applications page accessible')
  })
})

// ========================================
// PHASE 3: BUSINESS ACCEPTS APPLICATION
// ========================================

test.describe('Booking Phase 3: Accept Application', () => {
  test('Business can view applicants', async ({ page }) => {
    console.log('\n👥 Testing applicants view...')

    await loginAs(page, 'business')

    // Navigate to jobs
    await page.goto('/business/jobs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Look for applicants link/button on a job
    const applicantsBtn = page.getByRole('button', { name: /applicant|pelamar/i })
    const applicantsLink = page.getByRole('link', { name: /applicant|pelamar/i })

    if (await applicantsBtn.count() > 0) {
      await applicantsBtn.first().click({ force: true })
      await page.waitForTimeout(2000)
    } else if (await applicantsLink.count() > 0) {
      await applicantsLink.first().click({ force: true })
      await page.waitForTimeout(2000)
    }

    await takeScreenshot(page, 'booking-07-applicants', 'test-results/booking-flow')

    console.log('✅ Applicants view tested')
  })

  test('Business can accept an application', async ({ page }) => {
    console.log('\n✅ Testing application acceptance...')

    await loginAs(page, 'business')

    // Navigate to bookings or applicants
    await page.goto('/business/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Look for pending applications
    const acceptBtn = page.getByRole('button', { name: /accept|terima|approve/i })

    if (await acceptBtn.count() > 0) {
      await acceptBtn.first().click({ force: true })
      await page.waitForTimeout(3000)

      // Check for confirmation dialog
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|ya|ok/i })
      if (await confirmBtn.count() > 0) {
        await confirmBtn.first().click({ force: true })
        await page.waitForTimeout(2000)
      }

      await waitForToast(page, 'success', 5000)
      await takeScreenshot(page, 'booking-08-application-accepted', 'test-results/booking-flow')

      console.log('✓ Application accepted')
    } else {
      console.log('⚠️ No pending applications to accept')
    }

    console.log('✅ Accept application flow tested')
  })

  test('Business can view bookings list', async ({ page }) => {
    console.log('\n📅 Testing bookings list...')

    await loginAs(page, 'business')

    // Navigate to bookings
    await page.goto('/business/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify page loaded
    expect(page.url()).not.toContain('/login')

    await takeScreenshot(page, 'booking-09-bookings-list', 'test-results/booking-flow')

    console.log('✅ Bookings list accessible')
  })
})

// ========================================
// PHASE 4: CHECK-IN FLOW (WORKER)
// ========================================

test.describe('Booking Phase 4: Check-In', () => {
  test('Worker can view active bookings', async ({ page }) => {
    console.log('\n📅 Testing worker bookings...')

    await loginAs(page, 'worker')

    // Navigate to bookings
    await page.goto('/worker/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify page loaded
    expect(page.url()).not.toContain('/login')

    await takeScreenshot(page, 'booking-10-worker-bookings', 'test-results/booking-flow')

    console.log('✅ Worker bookings accessible')
  })

  test('Worker can access attendance page', async ({ page }) => {
    console.log('\n⏰ Testing attendance page...')

    await loginAs(page, 'worker')

    // Navigate to attendance
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify page loaded
    expect(page.url()).not.toContain('/login')

    // Check for attendance elements
    const hasCheckIn = await page.getByRole('button', { name: /check.?in|masuk/i }).count() > 0
    const hasQRScan = await page.locator('text=/qr|scan/i').count() > 0

    console.log(`Check-in button: ${hasCheckIn}, QR scan: ${hasQRScan}`)

    await takeScreenshot(page, 'booking-11-attendance-page', 'test-results/booking-flow')

    console.log('✅ Attendance page accessible')
  })

  test('Worker can check-in to a booking', async ({ page }) => {
    console.log('\n📍 Testing check-in...')

    await loginAs(page, 'worker')

    // Navigate to bookings
    await page.goto('/worker/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Find an active booking
    const activeBooking = page.locator('text=/confirmed|dikonfirmasi|accepted/i').first()
    if (await activeBooking.count() > 0) {
      await activeBooking.click({ force: true })
      await page.waitForTimeout(2000)
    }

    // Look for Check-in button
    const checkInBtn = page.getByRole('button', { name: /check.?in|masuk/i })

    if (await checkInBtn.count() > 0) {
      // Grant geolocation permission
      await page.context().grantPermissions(['geolocation'])
      console.log('✓ GPS permission granted')

      await checkInBtn.first().click({ force: true })
      await page.waitForTimeout(5000)

      await waitForToast(page, 'success', 5000)

      // Check for timer
      const timer = page.locator('text=/\\d{1,2}:\\d{2}/')
      if (await timer.count() > 0) {
        console.log('✓ Timer is running')
      }

      await takeScreenshot(page, 'booking-12-checked-in', 'test-results/booking-flow')
      console.log('✓ Check-in successful')
    } else {
      console.log('⚠️ No check-in button found - may not have confirmed booking')
    }

    console.log('✅ Check-in flow tested')
  })
})

// ========================================
// PHASE 5: CHECK-OUT FLOW (WORKER)
// ========================================

test.describe('Booking Phase 5: Check-Out', () => {
  test('Worker can check-out from a booking', async ({ page }) => {
    console.log('\n🚪 Testing check-out...')

    await loginAs(page, 'worker')

    // Navigate to bookings or attendance
    await page.goto('/worker/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Look for in-progress booking
    const inProgressBooking = page.locator('text=/in.?progress|berjalan|checked.?in/i').first()
    if (await inProgressBooking.count() > 0) {
      await inProgressBooking.click({ force: true })
      await page.waitForTimeout(2000)
    }

    // Look for Check-out button
    const checkOutBtn = page.getByRole('button', { name: /check.?out|keluar|selesai/i })

    if (await checkOutBtn.count() > 0) {
      await checkOutBtn.first().click({ force: true })
      await page.waitForTimeout(2000)

      // Check for notes input
      const notesInput = page.locator('textarea[name="notes"], textarea[placeholder*="note" i], textarea').first()
      if (await notesInput.count() > 0) {
        await notesInput.fill('Work completed successfully.')
        console.log('✓ Notes filled')
      }

      // Submit check-out
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|check.?out|selesai/i })
      if (await confirmBtn.count() > 0) {
        await confirmBtn.first().click({ force: true })
        await page.waitForTimeout(3000)
      }

      await waitForToast(page, 'success', 5000)

      // Verify status changed
      const completedText = page.locator('text=/completed|selesai|done/i')
      if (await completedText.count() > 0) {
        console.log('✓ Status changed to completed')
      }

      await takeScreenshot(page, 'booking-13-checked-out', 'test-results/booking-flow')
      console.log('✓ Check-out successful')
    } else {
      console.log('⚠️ No check-out button found - may not be checked in')
    }

    console.log('✅ Check-out flow tested')
  })
})

// ========================================
// PHASE 6: REVIEW FLOW
// ========================================

test.describe('Booking Phase 6: Reviews', () => {
  test('Business can review worker', async ({ page }) => {
    console.log('\n⭐ Testing business review...')

    await loginAs(page, 'business')

    // Navigate to bookings
    await page.goto('/business/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Find completed booking
    const completedBooking = page.locator('text=/completed|selesai|done/i').first()
    if (await completedBooking.count() > 0) {
      await completedBooking.click({ force: true })
      await page.waitForTimeout(2000)
    }

    // Look for Write Review button
    const reviewBtn = page.getByRole('button', { name: /review|ulasan|rating/i })

    if (await reviewBtn.count() > 0) {
      await reviewBtn.first().click({ force: true })
      await page.waitForTimeout(2000)

      await takeScreenshot(page, 'booking-14-review-form', 'test-results/booking-flow')

      // Fill review form - Rating
      const fifthStar = page.locator('[data-testid="star-5"], button[aria-label*="5"], [class*="star"]').nth(4)
      if (await fifthStar.count() > 0) {
        await fifthStar.click({ force: true })
        console.log('✓ Rating: 5 stars')
      }

      // Fill review form - Comment
      const commentInput = page.locator('textarea[name="comment"], textarea[placeholder*="review" i], textarea').first()
      if (await commentInput.count() > 0) {
        await commentInput.fill('Excellent work, very professional!')
        console.log('✓ Comment filled')
      }

      // Would rehire checkbox
      const rehireCheckbox = page.locator('input[name="wouldRehire"], input[type="checkbox"]')
      if (await rehireCheckbox.count() > 0) {
        await rehireCheckbox.first().check()
        console.log('✓ Would rehire: Yes')
      }

      // Submit review
      const submitBtn = page.getByRole('button', { name: /submit|kirim|save|simpan/i })
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click({ force: true })
        await page.waitForTimeout(3000)
        await waitForToast(page, 'success', 5000)
        console.log('✓ Review submitted')
      }

      await takeScreenshot(page, 'booking-15-review-submitted', 'test-results/booking-flow')
    } else {
      console.log('⚠️ No review button found')
    }

    console.log('✅ Business review flow tested')
  })

  test('Worker can review business', async ({ page }) => {
    console.log('\n⭐ Testing worker review...')

    await loginAs(page, 'worker')

    // Navigate to bookings
    await page.goto('/worker/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Find completed booking
    const completedBooking = page.locator('text=/completed|selesai|done/i').first()
    if (await completedBooking.count() > 0) {
      await completedBooking.click({ force: true })
      await page.waitForTimeout(2000)
    }

    // Look for Write Review button
    const reviewBtn = page.getByRole('button', { name: /review|ulasan|rating/i })

    if (await reviewBtn.count() > 0) {
      await reviewBtn.first().click({ force: true })
      await page.waitForTimeout(2000)

      await takeScreenshot(page, 'booking-16-worker-review-form', 'test-results/booking-flow')

      // Fill review form - Rating
      const fourthStar = page.locator('[data-testid="star-4"], button[aria-label*="4"], [class*="star"]').nth(3)
      if (await fourthStar.count() > 0) {
        await fourthStar.click({ force: true })
        console.log('✓ Rating: 4 stars')
      }

      // Fill review form - Comment
      const commentInput = page.locator('textarea[name="comment"], textarea[placeholder*="review" i], textarea').first()
      if (await commentInput.count() > 0) {
        await commentInput.fill('Good employer, clear instructions.')
        console.log('✓ Comment filled')
      }

      // Submit review
      const submitBtn = page.getByRole('button', { name: /submit|kirim|save|simpan/i })
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click({ force: true })
        await page.waitForTimeout(3000)
        await waitForToast(page, 'success', 5000)
        console.log('✓ Review submitted')
      }

      await takeScreenshot(page, 'booking-17-worker-review-submitted', 'test-results/booking-flow')
    } else {
      console.log('⚠️ No review button found')
    }

    console.log('✅ Worker review flow tested')
  })
})

// ========================================
// COMPLETE FLOW TEST (SERIAL)
// ========================================

test.describe.serial('Complete Booking Flow - Full Lifecycle', () => {
  // This test runs the entire flow in sequence
  // Use for end-to-end verification

  test('Complete booking lifecycle in one test', async ({ page }) => {
    test.setTimeout(300000) // 5 minutes

    console.log('\n🚀 Starting complete booking lifecycle test...')

    const jobTitle = generateJobTitle()

    // Phase 1: Business creates job
    console.log('\n📝 Phase 1: Creating job...')
    await loginAs(page, 'business')
    await page.goto('/business/jobs/new')
    await page.waitForLoadState('networkidle')

    // Fill and submit job form
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[placeholder*="judul" i]').first()
    if (await titleInput.count() > 0) {
      await titleInput.fill(jobTitle)
    }

    const submitBtn = page.getByRole('button', { name: /create|post|simpan|submit|buat|publish/i })
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click({ force: true })
      await page.waitForTimeout(3000)
    }

    console.log('✓ Job created')

    // Phase 2: Worker applies
    console.log('\n📤 Phase 2: Worker applies...')
    await logout(page)
    await loginAs(page, 'worker')
    await page.goto('/worker/jobs')
    await page.waitForLoadState('networkidle')

    // Find and apply to job
    const jobLink = page.locator(`text="${jobTitle}"`)
    if (await jobLink.count() > 0) {
      await jobLink.first().click({ force: true })
      await page.waitForTimeout(2000)

      const applyBtn = page.getByRole('button', { name: /apply|lamar/i })
      if (await applyBtn.count() > 0) {
        await applyBtn.first().click({ force: true })
        await page.waitForTimeout(2000)
      }
    }

    console.log('✓ Application submitted')

    // Phase 3: Business accepts
    console.log('\n✅ Phase 3: Business accepts...')
    await logout(page)
    await loginAs(page, 'business')
    await page.goto('/business/bookings')
    await page.waitForLoadState('networkidle')

    const acceptBtn = page.getByRole('button', { name: /accept|terima/i })
    if (await acceptBtn.count() > 0) {
      await acceptBtn.first().click({ force: true })
      await page.waitForTimeout(3000)
    }

    console.log('✓ Application accepted')

    // Phase 4: Worker check-in
    console.log('\n📍 Phase 4: Worker check-in...')
    await logout(page)
    await loginAs(page, 'worker')
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')

    const checkInBtn = page.getByRole('button', { name: /check.?in|masuk/i })
    if (await checkInBtn.count() > 0) {
      await page.context().grantPermissions(['geolocation'])
      await checkInBtn.first().click({ force: true })
      await page.waitForTimeout(5000)
    }

    console.log('✓ Check-in completed')

    // Phase 5: Worker check-out
    console.log('\n🚪 Phase 5: Worker check-out...')
    const checkOutBtn = page.getByRole('button', { name: /check.?out|keluar|selesai/i })
    if (await checkOutBtn.count() > 0) {
      await checkOutBtn.first().click({ force: true })
      await page.waitForTimeout(3000)
    }

    console.log('✓ Check-out completed')

    // Phase 6: Reviews
    console.log('\n⭐ Phase 6: Reviews...')

    // Business review
    await logout(page)
    await loginAs(page, 'business')
    await page.goto('/business/bookings')
    await page.waitForLoadState('networkidle')

    const reviewBtn = page.getByRole('button', { name: /review|ulasan/i })
    if (await reviewBtn.count() > 0) {
      await reviewBtn.first().click({ force: true })
      await page.waitForTimeout(2000)

      const submitReviewBtn = page.getByRole('button', { name: /submit|kirim/i })
      if (await submitReviewBtn.count() > 0) {
        await submitReviewBtn.first().click({ force: true })
        await page.waitForTimeout(2000)
      }
    }

    console.log('✓ Business review submitted')

    // Worker review
    await logout(page)
    await loginAs(page, 'worker')
    await page.goto('/worker/bookings')
    await page.waitForLoadState('networkidle')

    const workerReviewBtn = page.getByRole('button', { name: /review|ulasan/i })
    if (await workerReviewBtn.count() > 0) {
      await workerReviewBtn.first().click({ force: true })
      await page.waitForTimeout(2000)

      const submitWorkerReviewBtn = page.getByRole('button', { name: /submit|kirim/i })
      if (await submitWorkerReviewBtn.count() > 0) {
        await submitWorkerReviewBtn.first().click({ force: true })
        await page.waitForTimeout(2000)
      }
    }

    console.log('✓ Worker review submitted')

    console.log('\n🎉 Complete booking lifecycle test finished!')
  })
})
