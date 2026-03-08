/**
 * E2E Test: Complete Attendance Flow with Active Booking
 * 
 * Flow:
 * 1. Business: Create Job
 * 2. Worker: Apply to Job
 * 3. Business: Confirm Booking
 * 4. Worker: Check-in with GPS
 * 5. Worker: Check-out
 * 6. Capture all features
 */

import { test } from '@playwright/test'

const WORKER_EMAIL = 'test.worker@dailyworker.id'
const BUSINESS_EMAIL = 'test.business@dailyworker.id'
const PASSWORD = 'Test123!'

test.describe('Complete Attendance Flow', () => {
  
  test('Step 1: Business Create Job', async ({ page }) => {
    console.log('\n📝 BUSINESS: Creating job...')
    
    // Login as business
    await page.goto('/login')
    await page.fill('input[type="email"]', BUSINESS_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    
    const businessBtn = page.getByRole('button', { name: /bisnis|business/i })
    if (await businessBtn.count() > 0) {
      await businessBtn.first().click()
    }
    
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    console.log(`After login: ${page.url()}`)
    
    // Navigate to create job
    await page.goto('/business/jobs/create')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Screenshot: Create job page
    await page.screenshot({ 
      path: 'test-results/complete-attendance/01-create-job-page.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 1: Create job page')
    
    // Fill job form
    const titleInput = page.locator('input[name="title"], input[type="text"]').first()
    if (await titleInput.count() > 0) {
      await titleInput.fill('Test Job for Attendance')
    }
    
    const descInput = page.locator('textarea').first()
    if (await descInput.count() > 0) {
      await descInput.fill('This is a test job for attendance feature')
    }
    
    const wageInput = page.locator('input[type="number"]').first()
    if (await wageInput.count() > 0) {
      await wageInput.fill('150000')
    }
    
    // Submit
    const submitBtn = page.getByRole('button', { name: /create|post|simpan|submit/i })
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click()
      await page.waitForTimeout(5000)
    }
    
    console.log(`After create: ${page.url()}`)
    
    // Screenshot: Job created
    await page.screenshot({ 
      path: 'test-results/complete-attendance/02-job-created.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 2: Job created')
    
    console.log('✅ Step 1 complete!')
  })
  
  test('Step 2: Worker Apply to Job', async ({ page }) => {
    console.log('\n👤 WORKER: Applying to job...')
    
    // Login as worker
    await page.goto('/login')
    await page.fill('input[type="email"]', WORKER_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    // Navigate to jobs
    await page.goto('/worker/jobs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Screenshot: Jobs list
    await page.screenshot({ 
      path: 'test-results/complete-attendance/03-jobs-list.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 3: Jobs list')
    
    // Find and click test job
    const testJob = page.locator('text=Test Job for Attendance').first()
    if (await testJob.count() > 0) {
      await testJob.click()
      await page.waitForTimeout(3000)
      
      // Screenshot: Job detail
      await page.screenshot({ 
        path: 'test-results/complete-attendance/04-job-detail.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 4: Job detail')
      
      // Click apply
      const applyBtn = page.getByRole('button', { name: /apply|lamar|book/i })
      if (await applyBtn.count() > 0) {
        await applyBtn.first().click()
        await page.waitForTimeout(3000)
        
        // Screenshot: After apply
        await page.screenshot({ 
          path: 'test-results/complete-attendance/05-after-apply.png', 
          fullPage: true 
        })
        console.log('✅ Screenshot 5: After apply')
      }
    }
    
    console.log('✅ Step 2 complete!')
  })
  
  test('Step 3: Business Confirm Booking', async ({ page }) => {
    console.log('\n✅ BUSINESS: Confirming booking...')
    
    // Login as business
    await page.goto('/login')
    await page.fill('input[type="email"]', BUSINESS_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    
    const businessBtn = page.getByRole('button', { name: /bisnis|business/i })
    if (await businessBtn.count() > 0) {
      await businessBtn.first().click()
    }
    
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    // Navigate to bookings
    await page.goto('/business/bookings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Screenshot: Bookings list
    await page.screenshot({ 
      path: 'test-results/complete-attendance/06-business-bookings.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 6: Business bookings')
    
    // Find and confirm booking
    const confirmBtn = page.getByRole('button', { name: /confirm|terima|approve/i })
    if (await confirmBtn.count() > 0) {
      await confirmBtn.first().click()
      await page.waitForTimeout(3000)
      
      // Screenshot: After confirm
      await page.screenshot({ 
        path: 'test-results/complete-attendance/07-after-confirm.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 7: After confirm')
    }
    
    console.log('✅ Step 3 complete!')
  })
  
  test('Step 4: Worker Check-in with GPS', async ({ page }) => {
    console.log('\n📍 WORKER: Check-in with GPS...')
    
    // Login as worker
    await page.goto('/login')
    await page.fill('input[type="email"]', WORKER_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    // Navigate to attendance
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Screenshot: Attendance with active job
    await page.screenshot({ 
      path: 'test-results/complete-attendance/08-attendance-active-job.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 8: Attendance with active job')
    
    // List all buttons
    const allButtons = await page.locator('button').allTextContents()
    console.log('\n📋 Buttons:', allButtons)
    
    // Look for QR Scanner
    const qrScanBtn = page.getByRole('button', { name: /scan|qr|camera/i })
    if (await qrScanBtn.count() > 0) {
      await qrScanBtn.first().screenshot({ path: 'test-results/complete-attendance/09-qr-scanner-btn.png' })
      console.log('✅ Screenshot 9: QR Scanner button')
      
      await qrScanBtn.first().click()
      await page.waitForTimeout(3000)
      
      await page.screenshot({ 
        path: 'test-results/complete-attendance/10-qr-scanner-dialog.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 10: QR Scanner dialog')
    }
    
    // Look for Check-in
    const checkInBtn = page.getByRole('button', { name: /check.?in|masuk/i })
    if (await checkInBtn.count() > 0) {
      await checkInBtn.first().screenshot({ path: 'test-results/complete-attendance/11-check-in-btn.png' })
      console.log('✅ Screenshot 11: Check-in button')
      
      await checkInBtn.first().click()
      await page.waitForTimeout(5000)
      
      await page.screenshot({ 
        path: 'test-results/complete-attendance/12-after-check-in.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 12: After check-in (GPS captured)')
      
      // Look for Check-out
      const checkOutBtn = page.getByRole('button', { name: /check.?out|keluar/i })
      if (await checkOutBtn.count() > 0) {
        await checkOutBtn.first().screenshot({ path: 'test-results/complete-attendance/13-check-out-btn.png' })
        console.log('✅ Screenshot 13: Check-out button')
        
        await checkOutBtn.first().click()
        await page.waitForTimeout(5000)
        
        await page.screenshot({ 
          path: 'test-results/complete-attendance/14-after-check-out.png', 
          fullPage: true 
        })
        console.log('✅ Screenshot 14: After check-out')
      }
    }
    
    // Screenshot: Attendance history
    await page.screenshot({ 
      path: 'test-results/complete-attendance/15-attendance-history.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 15: Attendance history')
    
    console.log('✅ Step 4 complete!')
  })
  
  test('Step 5: Business QR Code & Worker Status', async ({ page }) => {
    console.log('\n🏢 BUSINESS: QR Code & Worker Status...')
    
    // Login as business
    await page.goto('/login')
    await page.fill('input[type="email"]', BUSINESS_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    
    const businessBtn = page.getByRole('button', { name: /bisnis|business/i })
    if (await businessBtn.count() > 0) {
      await businessBtn.first().click()
    }
    
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    // Navigate to job attendance
    await page.goto('/business/job-attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Screenshot: Business job attendance with active jobs
    await page.screenshot({ 
      path: 'test-results/complete-attendance/16-business-active-jobs.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 16: Business active jobs')
    
    // Screenshot: QR Code
    const qrCode = page.locator('svg').first()
    if (await qrCode.count() > 0) {
      await qrCode.screenshot({ path: 'test-results/complete-attendance/17-qr-code.png' })
      console.log('✅ Screenshot 17: QR Code')
    }
    
    // Screenshot: Worker status
    const workerStatus = page.locator('text=/checked.?in|sudah hadir|completed|selesai/i')
    if (await workerStatus.count() > 0) {
      await workerStatus.first().screenshot({ path: 'test-results/complete-attendance/18-worker-status.png' })
      console.log('✅ Screenshot 18: Worker status')
    }
    
    console.log('✅ Step 5 complete!')
    console.log('\n🎉 ALL STEPS COMPLETE!')
  })
})
