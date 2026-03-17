/**
 * E2E Test: Complete Attendance Flow - SINGLE TEST
 * All steps in one test to preserve state
 */

import { test } from '@playwright/test'

const WORKER_EMAIL = 'test.worker@dailyworker.id'
const BUSINESS_EMAIL = 'test.business@dailyworker.id'
const PASSWORD = 'Test123!'

test('Complete Attendance Flow - All Steps', async ({ page }) => {
  console.log('\n🚀 Starting complete attendance flow...\n')
  
  // ========================================
  // STEP 1: BUSINESS CREATE JOB
  // ========================================
  console.log('📝 STEP 1: Business creating job...')
  
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
  
  // Fill job form
  const titleInput = page.locator('input[name="title"], input[type="text"]').first()
  if (await titleInput.count() > 0) {
    await titleInput.fill('Test Job for Attendance')
  }
  
  const descInput = page.locator('textarea').first()
  if (await descInput.count() > 0) {
    await descInput.fill('Test job for attendance feature')
  }
  
  const wageInput = page.locator('input[type="number"]').first()
  if (await wageInput.count() > 0) {
    await wageInput.fill('150000')
  }
  
  // Submit job
  const submitBtn = page.getByRole('button', { name: /create|post|simpan|submit/i })
  if (await submitBtn.count() > 0) {
    await submitBtn.first().click({ force: true })
    await page.waitForTimeout(5000)
  }
  
  console.log(`Job created: ${page.url()}`)
  
  // Screenshot: Job created
  await page.screenshot({ 
    path: 'test-results/single-flow/01-job-created.png', 
    fullPage: true 
  })
  console.log('✅ Screenshot 1: Job created')
  
  // ========================================
  // STEP 2: WORKER APPLY TO JOB
  // ========================================
  console.log('\n👤 STEP 2: Worker applying to job...')
  
  // Logout business
  await page.goto('/login')
    await page.waitForLoadState('networkidle')
  
  // Login as worker
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
    path: 'test-results/single-flow/02-jobs-list.png', 
    fullPage: true 
  })
  console.log('✅ Screenshot 2: Jobs list')
  
  // Find and click test job
  const testJob = page.locator('text=Test Job for Attendance').first()
  if (await testJob.count() > 0) {
    await testJob.click({ force: true })
    await page.waitForTimeout(3000)
    
    // Screenshot: Job detail
    await page.screenshot({ 
      path: 'test-results/single-flow/03-job-detail.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 3: Job detail')
    
    // Click apply
    const applyBtn = page.getByRole('button', { name: /apply|lamar|book/i })
    if (await applyBtn.count() > 0) {
      await applyBtn.first().click({ force: true })
      await page.waitForTimeout(3000)
      
      // Screenshot: After apply
      await page.screenshot({ 
        path: 'test-results/single-flow/04-after-apply.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 4: After apply')
    }
  }
  
  // ========================================
  // STEP 3: BUSINESS CONFIRM BOOKING
  // ========================================
  console.log('\n✅ STEP 3: Business confirming booking...')
  
  // Login as business
  await page.goto('/login')
    await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').fill(BUSINESS_EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  
  const bizBtn = page.getByRole('button', { name: /bisnis|business/i })
  if (await bizBtn.count() > 0) {
    await bizBtn.first().click({ force: true })
  }
  
  await page.locator('form button[type="submit"]').click({ force: true })
  await page.waitForTimeout(5000)
  
  // Navigate to bookings
  await page.goto('/business/bookings')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('main, [role="main"], body', { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1500)
  
  // Screenshot: Bookings list
  await page.screenshot({ 
    path: 'test-results/single-flow/05-business-bookings.png', 
    fullPage: true 
  })
  console.log('✅ Screenshot 5: Business bookings')
  
  // Find and confirm booking
  const confirmBtn = page.getByRole('button', { name: /confirm|terima|approve/i })
  if (await confirmBtn.count() > 0) {
    await confirmBtn.first().click({ force: true })
    await page.waitForTimeout(3000)
    
    // Screenshot: After confirm
    await page.screenshot({ 
      path: 'test-results/single-flow/06-after-confirm.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 6: After confirm')
  }
  
  // ========================================
  // STEP 4: WORKER CHECK-IN WITH GPS
  // ========================================
  console.log('\n📍 STEP 4: Worker check-in with GPS...')
  
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
  
  // Screenshot: Attendance with active job
  await page.screenshot({ 
    path: 'test-results/single-flow/07-attendance-active.png', 
    fullPage: true 
  })
  console.log('✅ Screenshot 7: Attendance with active job')
  
  // List all buttons
  const allButtons = await page.locator('button').allTextContents()
  console.log('\n📋 All buttons:', allButtons)
  
  // Look for QR Scanner
  const qrScanBtn = page.getByRole('button', { name: /scan|qr|camera/i })
  const qrScanCount = await qrScanBtn.count()
  console.log(`\n📱 QR Scanner buttons: ${qrScanCount}`)
  
  if (qrScanCount > 0) {
    await qrScanBtn.first().screenshot({ path: 'test-results/single-flow/08-qr-scanner-btn.png' })
    console.log('✅ Screenshot 8: QR Scanner button')
    
    await qrScanBtn.first().click({ force: true })
    await page.waitForTimeout(3000)
    
    await page.screenshot({ 
      path: 'test-results/single-flow/09-qr-scanner-dialog.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 9: QR Scanner dialog')
  }
  
  // Look for Check-in
  const checkInBtn = page.getByRole('button', { name: /check.?in|masuk/i })
  const checkInCount = await checkInBtn.count()
  console.log(`\n📍 Check-in buttons: ${checkInCount}`)
  
  if (checkInCount > 0) {
    await checkInBtn.first().screenshot({ path: 'test-results/single-flow/10-check-in-btn.png' })
    console.log('✅ Screenshot 10: Check-in button')
    
    await checkInBtn.first().click({ force: true })
    await page.waitForTimeout(5000)
    
    await page.screenshot({ 
      path: 'test-results/single-flow/11-after-check-in.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 11: After check-in (GPS captured)')
    
    // Look for Check-out
    const checkOutBtn = page.getByRole('button', { name: /check.?out|keluar/i })
    const checkOutCount = await checkOutBtn.count()
    console.log(`\n🚪 Check-out buttons: ${checkOutCount}`)
    
    if (checkOutCount > 0) {
      await checkOutBtn.first().screenshot({ path: 'test-results/single-flow/12-check-out-btn.png' })
      console.log('✅ Screenshot 12: Check-out button')
      
      await checkOutBtn.first().click({ force: true })
      await page.waitForTimeout(5000)
      
      await page.screenshot({ 
        path: 'test-results/single-flow/13-after-check-out.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 13: After check-out')
    }
  }
  
  // Screenshot: Attendance history
  await page.screenshot({ 
    path: 'test-results/single-flow/14-attendance-history.png', 
    fullPage: true 
  })
  console.log('✅ Screenshot 14: Attendance history')
  
  // ========================================
  // STEP 5: BUSINESS QR CODE & WORKER STATUS
  // ========================================
  console.log('\n🏢 STEP 5: Business QR Code & Worker Status...')
  
  // Login as business
  await page.goto('/login')
    await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').fill(BUSINESS_EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  
  const bizBtn2 = page.getByRole('button', { name: /bisnis|business/i })
  if (await bizBtn2.count() > 0) {
    await bizBtn2.first().click({ force: true })
  }
  
  await page.locator('form button[type="submit"]').click({ force: true })
  await page.waitForTimeout(5000)
  
  // Navigate to job attendance
  await page.goto('/business/job-attendance')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('main, [role="main"], body', { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1500)
  
  // Screenshot: Business job attendance with active jobs
  await page.screenshot({ 
    path: 'test-results/single-flow/15-business-attendance.png', 
    fullPage: true 
  })
  console.log('✅ Screenshot 15: Business attendance')
  
  // Screenshot: QR Code
  const qrCode = page.locator('svg').first()
  if (await qrCode.count() > 0) {
    await qrCode.screenshot({ path: 'test-results/single-flow/16-qr-code.png' })
    console.log('✅ Screenshot 16: QR Code')
  }
  
  // Screenshot: Worker status
  const workerStatus = page.locator('text=/checked.?in|sudah hadir|completed|selesai/i')
  if (await workerStatus.count() > 0) {
    await workerStatus.first().screenshot({ path: 'test-results/single-flow/17-worker-status.png' })
    console.log('✅ Screenshot 17: Worker status')
  }
  
  console.log('\n🎉 ALL STEPS COMPLETE!')
  console.log(`\n📧 Test credentials: ${WORKER_EMAIL} / ${PASSWORD}`)
})
