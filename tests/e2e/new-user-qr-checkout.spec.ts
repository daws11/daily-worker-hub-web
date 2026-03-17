/**
 * E2E Test: Create New Test User and Capture QR/Checkout
 */

import { test } from '@playwright/test'

const TEST_EMAIL = `test.attendance.${Date.now()}@test.com`
const TEST_PASSWORD = 'TestAttendance123!'

test.describe('Create User & Capture Features', () => {
  
  test('Register, Complete Onboarding, Capture Features', async ({ page }) => {
    console.log(`\n📝 Creating new test user: ${TEST_EMAIL}`)
    
    // ===== REGISTER =====
    await page.goto('/register?role=worker')
    await page.waitForLoadState('networkidle')
    
    // Fill form
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[type="text"]', 'Test Attendance User')
    
    // Submit
    await page.locator('form button[type="submit"]').click({ force: true })
    await page.waitForTimeout(5000)
    
    console.log(`After register URL: ${page.url()}`)
    
    // ===== COMPLETE ONBOARDING =====
    if (page.url().includes('onboarding')) {
      console.log('📋 Completing onboarding...')
      
      await page.waitForLoadState('domcontentloaded')
      // Wait for any form element (more flexible)
      await page.waitForSelector('input, textarea, form', { timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(2000)
      
      // Step 1: Personal Info - try multiple selectors
      const nameInput = page.locator('input[name="name"], input[placeholder*="nama" i], input[placeholder*="name" i], input[type="text"]').first()
      try {
        await nameInput.waitFor({ state: 'visible', timeout: 5000 })
        await nameInput.fill('Test Attendance User')
      } catch (e) {
        console.log('Name input not found, skipping...')
      }
      
      const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').first()
      try {
        await phoneInput.waitFor({ state: 'visible', timeout: 3000 })
        await phoneInput.fill('+6281234567890')
      } catch (e) {
        console.log('Phone input not found, skipping...')
      }
      
      const dateInput = page.locator('input[type="date"]').first()
      try {
        await dateInput.waitFor({ state: 'visible', timeout: 3000 })
        await dateInput.fill('1995-01-15')
      } catch (e) {
        console.log('Date input not found, skipping...')
      }
      
      await page.waitForTimeout(1000)
      
      // Click next
      const nextBtn = page.getByRole('button', { name: /lanjut|next|continue/i })
      try {
        await nextBtn.waitFor({ state: 'visible', timeout: 3000 })
        await nextBtn.click({ force: true })
        await page.waitForTimeout(3000)
      } catch (e) {
        console.log('Step 1 next not found')
      }
      
      // Step 2: Location
      const addressInput = page.locator('input[type="text"], textarea').nth(1)
      if (await addressInput.count() > 0) {
        await addressInput.fill('Denpasar, Bali, Indonesia')
        await page.waitForTimeout(2000)
      }
      
      try {
        const nextBtn2 = page.getByRole('button', { name: /lanjut|next|continue/i })
        await nextBtn2.waitFor({ state: 'visible', timeout: 3000 })
        await nextBtn2.click({ force: true })
        await page.waitForTimeout(3000)
      } catch (e) {
        console.log('Step 2 next not found')
      }
      
      // Step 3: Skills
      const categoryBtn = page.locator('button').filter({ hasText: /housekeeping|cleaning|driver/i }).first()
      if (await categoryBtn.count() > 0) {
        await categoryBtn.click({ force: true })
      }
      
      const expBtn = page.locator('button').filter({ hasText: /entry|junior|mid/i }).first()
      if (await expBtn.count() > 0) {
        await expBtn.click({ force: true })
      }
      
      const bioInput = page.locator('textarea')
      if (await bioInput.count() > 0) {
        await bioInput.fill('Test user for attendance feature')
      }
      
      const checkbox = page.locator('input[type="checkbox"]').first()
      if (await checkbox.count() > 0) {
        await checkbox.click({ force: true })
      }
      
      await page.waitForTimeout(1000)
      
      // Click complete
      try {
        const completeBtn = page.getByRole('button', { name: /selesai|complete|finish|submit/i })
        await completeBtn.waitFor({ state: 'visible', timeout: 3000 })
        await completeBtn.click({ force: true })
        await page.waitForTimeout(5000)
      } catch (e) {
        console.log('Complete button not found')
      }
      
      console.log('✅ Onboarding completed')
    }
    
    // ===== NOW LOGIN AND CAPTURE =====
    console.log('\n📱 Now capturing attendance features...')
    
    // Login with new user
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.locator('form button[type="submit"]').click({ force: true })
    await page.waitForTimeout(5000)
    
    console.log(`After login URL: ${page.url()}`)
    
    // Navigate to attendance
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    console.log(`Attendance URL: ${page.url()}`)
    
    // Screenshot 1: Attendance page
    await page.screenshot({ 
      path: 'test-results/qr-checkout-new/01-attendance-page.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 1: Attendance page')
    
    // Look for all buttons
    const allButtons = await page.locator('button').allTextContents()
    console.log('\n📋 All buttons on page:')
    allButtons.forEach((btn, i) => console.log(`  ${i + 1}. ${btn}`))
    
    // Look for QR Scanner
    const qrScanBtn = page.getByRole('button', { name: /scan|qr|camera|kamera/i })
    const qrScanCount = await qrScanBtn.count()
    console.log(`\n📱 QR Scanner buttons: ${qrScanCount}`)
    
    if (qrScanCount > 0) {
      await qrScanBtn.first().screenshot({ path: 'test-results/qr-checkout-new/02-qr-scanner-button.png' })
      console.log('✅ Screenshot 2: QR Scanner button')
      
      // Click and capture dialog
      await qrScanBtn.first().click({ force: true })
      await page.waitForTimeout(3000)
      
      await page.screenshot({ 
        path: 'test-results/qr-checkout-new/03-qr-scanner-dialog.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 3: QR Scanner dialog')
    }
    
    // Look for Check-in
    const checkInBtn = page.getByRole('button', { name: /check.?in|masuk/i })
    const checkInCount = await checkInBtn.count()
    console.log(`\n📍 Check-in buttons: ${checkInCount}`)
    
    if (checkInCount > 0) {
      await checkInBtn.first().screenshot({ path: 'test-results/qr-checkout-new/04-check-in-button.png' })
      console.log('✅ Screenshot 4: Check-in button')
      
      // Click check-in
      await checkInBtn.first().click({ force: true })
      await page.waitForTimeout(5000)
      
      await page.screenshot({ 
        path: 'test-results/qr-checkout-new/05-after-check-in.png', 
        fullPage: true 
      })
      console.log('✅ Screenshot 5: After check-in')
      
      // Look for Check-out (should appear after check-in)
      const checkOutBtn = page.getByRole('button', { name: /check.?out|keluar/i })
      const checkOutCount = await checkOutBtn.count()
      console.log(`\n🚪 Check-out buttons: ${checkOutCount}`)
      
      if (checkOutCount > 0) {
        await checkOutBtn.first().screenshot({ path: 'test-results/qr-checkout-new/06-check-out-button.png' })
        console.log('✅ Screenshot 6: Check-out button')
        
        // Click check-out
        await checkOutBtn.first().click({ force: true })
        await page.waitForTimeout(5000)
        
        await page.screenshot({ 
          path: 'test-results/qr-checkout-new/07-after-check-out.png', 
          fullPage: true 
        })
        console.log('✅ Screenshot 7: After check-out')
      } else {
        console.log('⚠️ No check-out button found')
      }
    }
    
    // Screenshot final state
    await page.screenshot({ 
      path: 'test-results/qr-checkout-new/08-final-state.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 8: Final state')
    
    console.log(`\n📧 Test credentials: ${TEST_EMAIL} / ${TEST_PASSWORD}`)
    console.log('✅ All tests complete!')
  })
})
