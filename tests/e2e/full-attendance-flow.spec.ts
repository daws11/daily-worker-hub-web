/**
 * E2E Test: Full Attendance Flow with Active Booking
 * 
 * Flow:
 * 1. Business: Create job with QR code
 * 2. Worker: Book the job
 * 3. Worker: Check-in with GPS
 * 4. Worker: Check-out
 * 5. Business: View real-time status
 * 6. Capture all features
 */

import { test } from '@playwright/test'

// Test credentials
const WORKER_EMAIL = 'test.worker@dailyworker.id'
const BUSINESS_EMAIL = 'test.business@dailyworker.id'
const PASSWORD = 'Test123!'

test.describe('Full Attendance Flow with Active Booking', () => {
  
  test('Setup: Create Job and Booking', async ({ page }) => {
    console.log('\n📝 Setting up test data...')
    
    // ===== BUSINESS: CREATE JOB =====
    console.log('\n=== BUSINESS: Creating Job ===')
    
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    
    const businessBtn = page.getByRole('button', { name: /bisnis|business/i })
    if (await businessBtn.count() > 0) {
      await businessBtn.first().click({ force: true })
    }
    
    await page.locator('form button[type="submit"]').click({ force: true })
    await page.waitForTimeout(5000)
    
    console.log(`Business logged in: ${page.url()}`)
    
    // Navigate to create job
    await page.goto('/business/jobs/create')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Screenshot: Create job page
    await page.screenshot({ 
      path: 'test-results/full-attendance/01-create-job-page.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 1: Create job page')
    
    // Fill job form
    const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first()
    if (await titleInput.count() > 0) {
      await titleInput.fill('Test Job for Attendance - Housekeeping')
    }
    
    const descInput = page.locator('textarea[name="description"], textarea').first()
    if (await descInput.count() > 0) {
      await descInput.fill('Test job for attendance tracking feature testing')
    }
    
    const wageInput = page.locator('input[name="wage"], input[type="number"]').first()
    if (await wageInput.count() > 0) {
      await wageInput.fill('150000')
    }
    
    // Select category if available
    const categoryBtn = page.locator('button').filter({ hasText: /housekeeping|cleaning/i }).first()
    if (await categoryBtn.count() > 0) {
      await categoryBtn.click({ force: true })
    }
    
    // Submit job
    const submitBtn = page.getByRole('button', { name: /create|submit|post|simpan/i })
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click({ force: true })
      await page.waitForTimeout(5000)
    }
    
    console.log(`After create job: ${page.url()}`)
    
    // Screenshot: Job created
    await page.screenshot({ 
      path: 'test-results/full-attendance/02-job-created.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 2: Job created')
    
    // ===== WORKER: VIEW JOB =====
    console.log('\n=== WORKER: Viewing Job ===')
    
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill(WORKER_EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('form button[type="submit"]').click({ force: true })
    await page.waitForTimeout(5000)
    
    console.log(`Worker logged in: ${page.url()}`)
    
    // Navigate to jobs
    await page.goto('/worker/jobs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Screenshot: Jobs list
    await page.screenshot({ 
      path: 'test-results/full-attendance/03-jobs-list.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 3: Jobs list')
    
    // Click on the test job
    const testJob = page.locator('text=Test Job for Attendance').first()
    if (await testJob.count() > 0) {
      await testJob.click({ force: true })
      await page.waitForTimeout(3000)
      
      // Screenshot: Job detail
      await page.screenshot({ 
        path: 'test-results/full-attendance/04-job-detail.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 4: Job detail')
      
      // Click apply/book button
      const applyBtn = page.getByRole('button', { name: /apply|book|lamar|daftar/i })
      if (await applyBtn.count() > 0) {
        await applyBtn.first().click({ force: true })
        await page.waitForTimeout(3000)
        
        // Screenshot: After apply
        await page.screenshot({ 
          path: 'test-results/full-attendance/05-after-apply.png', 
          fullPage: true 
        })
        console.log('✅ Screenshot 5: After apply')
      }
    }
    
    console.log('✅ Setup complete!')
  })
  
  test('Worker: Check-in with GPS', async ({ page }) => {
    console.log('\n📍 Worker: Testing Check-in with GPS...')
    
    // Login as worker
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill(WORKER_EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('form button[type="submit"]').click({ force: true })
    await page.waitForTimeout(5000)
    
    // Navigate to bookings
    await page.goto('/worker/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Screenshot: Bookings list
    await page.screenshot({ 
      path: 'test-results/full-attendance/06-worker-bookings.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 6: Worker bookings')
    
    // Navigate to attendance
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Screenshot: Attendance page before check-in
    await page.screenshot({ 
      path: 'test-results/full-attendance/07-attendance-before-checkin.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 7: Attendance before check-in')
    
    // Look for check-in button
    const checkInBtn = page.getByRole('button', { name: /check.?in|masuk/i })
    console.log(`Check-in buttons found: ${await checkInBtn.count()}`)
    
    if (await checkInBtn.count() > 0) {
      // Screenshot: Check-in button close-up
      await checkInBtn.first().screenshot({ path: 'test-results/full-attendance/08-check-in-button.png' })
      console.log('✅ Screenshot 8: Check-in button')
      
      // Click check-in
      await checkInBtn.first().click({ force: true })
      await page.waitForTimeout(5000)
      
      // Screenshot: After check-in (GPS capture)
      await page.screenshot({ 
        path: 'test-results/full-attendance/09-after-check-in.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 9: After check-in (GPS captured)')
      
      // Look for GPS coordinates display
      const gpsText = page.locator('text=/-?\\d+\\.\\d+,\\s*-?\\d+\\.\\d+/')
      if (await gpsText.count() > 0) {
        await gpsText.first().screenshot({ path: 'test-results/full-attendance/10-gps-coordinates.png' })
        console.log('✅ Screenshot 10: GPS coordinates')
      }
    }
    
    // Screenshot: Attendance page after check-in
    await page.screenshot({ 
      path: 'test-results/full-attendance/11-attendance-after-checkin.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 11: Attendance after check-in')
  })
  
  test('Worker: QR Scanner for Check-in', async ({ page }) => {
    console.log('\n📱 Worker: Testing QR Scanner...')
    
    // Login as worker
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill(WORKER_EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('form button[type="submit"]').click({ force: true })
    await page.waitForTimeout(5000)
    
    // Navigate to attendance
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Look for QR scan option
    const qrScanBtn = page.getByRole('button', { name: /scan|qr|camera|kamera/i })
    console.log(`QR scan buttons found: ${await qrScanBtn.count()}`)
    
    if (await qrScanBtn.count() > 0) {
      // Screenshot: QR scan button
      await qrScanBtn.first().screenshot({ path: 'test-results/full-attendance/12-qr-scan-button.png' })
      console.log('✅ Screenshot 12: QR scan button')
      
      // Click QR scan
      await qrScanBtn.first().click({ force: true })
      await page.waitForTimeout(3000)
      
      // Screenshot: QR scanner dialog
      await page.screenshot({ 
        path: 'test-results/full-attendance/13-qr-scanner-dialog.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 13: QR scanner dialog')
    }
    
    // Screenshot: Full page with QR option
    await page.screenshot({ 
      path: 'test-results/full-attendance/14-qr-scanner-page.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 14: QR scanner page')
  })
  
  test('Worker: Check-out', async ({ page }) => {
    console.log('\n🚪 Worker: Testing Check-out...')
    
    // Login as worker
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill(WORKER_EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('form button[type="submit"]').click({ force: true })
    await page.waitForTimeout(5000)
    
    // Navigate to attendance
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Look for check-out button (should appear after check-in)
    const checkOutBtn = page.getByRole('button', { name: /check.?out|keluar/i })
    console.log(`Check-out buttons found: ${await checkOutBtn.count()}`)
    
    if (await checkOutBtn.count() > 0) {
      // Screenshot: Check-out button
      await checkOutBtn.first().screenshot({ path: 'test-results/full-attendance/15-check-out-button.png' })
      console.log('✅ Screenshot 15: Check-out button')
      
      // Click check-out
      await checkOutBtn.first().click({ force: true })
      await page.waitForTimeout(5000)
      
      // Screenshot: After check-out
      await page.screenshot({ 
        path: 'test-results/full-attendance/16-after-check-out.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 16: After check-out')
    }
    
    // Screenshot: Attendance history with completed job
    await page.screenshot({ 
      path: 'test-results/full-attendance/17-attendance-history.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 17: Attendance history')
  })
  
  test('Business: QR Code and Worker Status', async ({ page }) => {
    console.log('\n🏢 Business: Testing QR Code & Worker Status...')
    
    // Login as business
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    
    const businessBtn = page.getByRole('button', { name: /bisnis|business/i })
    if (await businessBtn.count() > 0) {
      await businessBtn.first().click({ force: true })
    }
    
    await page.locator('form button[type="submit"]').click({ force: true })
    await page.waitForTimeout(5000)
    
    console.log(`Business logged in: ${page.url()}`)
    
    // Navigate to job attendance
    await page.goto('/business/job-attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Screenshot: Job attendance page
    await page.screenshot({ 
      path: 'test-results/full-attendance/18-business-job-attendance.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 18: Business job attendance')
    
    // Look for QR code
    const qrCode = page.locator('svg').first()
    if (await qrCode.count() > 0) {
      // Screenshot: QR code
      await qrCode.screenshot({ path: 'test-results/full-attendance/19-qr-code.png' })
      console.log('✅ Screenshot 19: QR Code')
    }
    
    // Look for job card with QR
    const jobCard = page.locator('[class*="card"]').first()
    if (await jobCard.count() > 0) {
      // Screenshot: Job card with QR
      await jobCard.screenshot({ path: 'test-results/full-attendance/20-job-card-qr.png' })
      console.log('✅ Screenshot 20: Job card with QR')
    }
    
    // Look for worker status
    const workerStatus = page.locator('text=/checked.?in|sudah hadir|pending|belum|completed|selesai/i')
    console.log(`Worker status elements found: ${await workerStatus.count()}`)
    
    if (await workerStatus.count() > 0) {
      // Screenshot: Worker status
      await workerStatus.first().screenshot({ path: 'test-results/full-attendance/21-worker-status.png' })
      console.log('✅ Screenshot 21: Worker status')
    }
    
    // Screenshot: Full page with all elements
    await page.screenshot({ 
      path: 'test-results/full-attendance/22-business-attendance-full.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 22: Business attendance full page')
    
    // Look for download/print buttons
    const downloadBtn = page.getByRole('button', { name: /download|unduh/i })
    const printBtn = page.getByRole('button', { name: /print|cetak/i })
    
    console.log(`Download buttons: ${await downloadBtn.count()}`)
    console.log(`Print buttons: ${await printBtn.count()}`)
    
    if (await downloadBtn.count() > 0) {
      await downloadBtn.first().screenshot({ path: 'test-results/full-attendance/23-download-button.png' })
      console.log('✅ Screenshot 23: Download button')
    }
    
    if (await printBtn.count() > 0) {
      await printBtn.first().screenshot({ path: 'test-results/full-attendance/24-print-button.png' })
      console.log('✅ Screenshot 24: Print button')
    }
    
    console.log('✅ All screenshots captured!')
  })
})
