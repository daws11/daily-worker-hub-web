/**
 * E2E Test: Detailed Attendance Features Screenshots
 * 
 * Fitur yang akan di-screenshot:
 * - Worker: Check-in/Check-out dengan GPS
 * - Worker: QR Code Scanner
 * - Worker: Attendance History
 * - Business: QR Code Generator
 * - Business: Real-time Worker Status
 */

import { test } from '@playwright/test'

// Test credentials
const WORKER_EMAIL = 'test.worker@dailyworker.id'
const BUSINESS_EMAIL = 'test.business@dailyworker.id'
const PASSWORD = 'Test123!'

test.describe('Detailed Attendance Features', () => {
  
  test('Worker: Check-in/Check-out with GPS', async ({ page }) => {
    console.log('\n📍 Worker: Testing Check-in/Check-out with GPS...')
    
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
    
    // Screenshot 1: Attendance page with check-in/check-out buttons
    await page.screenshot({ 
      path: 'test-results/attendance-features/01-worker-attendance-main.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 1: Worker attendance main page')
    
    // Look for check-in/check-out buttons specifically
    const checkInBtn = page.getByRole('button', { name: /check.?in|masuk/i })
    const checkOutBtn = page.getByRole('button', { name: /check.?out|keluar/i })
    
    console.log(`Check-in buttons found: ${await checkInBtn.count()}`)
    console.log(`Check-out buttons found: ${await checkOutBtn.count()}`)
    
    // Try to find GPS/location related elements
    const gpsElements = page.locator('text=/gps|location|lokasi|koordinat|latitude|longitude/i')
    console.log(`GPS/Location elements found: ${await gpsElements.count()}`)
    
    // Screenshot 2: Close-up of check-in section
    const checkInSection = page.locator('[class*="check-in"], [class*="checkin"]').first()
    if (await checkInSection.count() > 0) {
      await checkInSection.screenshot({ path: 'test-results/attendance-features/02-check-in-section.png' })
      console.log('✅ Screenshot 2: Check-in section')
    }
    
    // Screenshot 3: GPS/Location display
    const locationDisplay = page.locator('text=/location|lokasi/i').first()
    if (await locationDisplay.count() > 0) {
      await locationDisplay.screenshot({ path: 'test-results/attendance-features/03-gps-location.png' })
      console.log('✅ Screenshot 3: GPS location display')
    }
  })
  
  test('Worker: QR Code Scanner', async ({ page }) => {
    console.log('\n📱 Worker: Testing QR Code Scanner...')
    
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
    
    // Look for QR scanner elements
    const qrScannerBtn = page.getByRole('button', { name: /scan|qr|camera|kamera/i })
    const qrScannerSection = page.locator('[class*="qr"], [class*="scanner"]')
    
    console.log(`QR Scanner buttons found: ${await qrScannerBtn.count()}`)
    console.log(`QR Scanner sections found: ${await qrScannerSection.count()}`)
    
    // Screenshot 4: QR Scanner button/section
    if (await qrScannerBtn.count() > 0) {
      await qrScannerBtn.first().screenshot({ path: 'test-results/attendance-features/04-qr-scanner-button.png' })
      console.log('✅ Screenshot 4: QR Scanner button')
    }
    
    if (await qrScannerSection.count() > 0) {
      await qrScannerSection.first().screenshot({ path: 'test-results/attendance-features/05-qr-scanner-section.png' })
      console.log('✅ Screenshot 5: QR Scanner section')
    }
    
    // Screenshot 6: Full page showing scanner option
    await page.screenshot({ 
      path: 'test-results/attendance-features/06-qr-scanner-page.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 6: Full page with QR scanner')
  })
  
  test('Worker: Attendance History', async ({ page }) => {
    console.log('\n📜 Worker: Testing Attendance History...')
    
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
    
    // Look for history section
    const historySection = page.locator('[class*="history"], [class*="riwayat"]').first()
    const historyText = page.locator('text=/history|riwayat|completed|selesai/i')
    
    console.log(`History sections found: ${await historySection.count()}`)
    console.log(`History text found: ${await historyText.count()}`)
    
    // Screenshot 7: History section
    if (await historySection.count() > 0) {
      await historySection.screenshot({ path: 'test-results/attendance-features/07-history-section.png' })
      console.log('✅ Screenshot 7: History section')
    }
    
    // Screenshot 8: History list
    if (await historyText.count() > 0) {
      await historyText.first().screenshot({ path: 'test-results/attendance-features/08-history-text.png' })
      console.log('✅ Screenshot 8: History text')
    }
    
    // Screenshot 9: Full page with history
    await page.screenshot({ 
      path: 'test-results/attendance-features/09-attendance-history-full.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 9: Full page with history')
  })
  
  test('Business: QR Code Generator', async ({ page }) => {
    console.log('\n🔲 Business: Testing QR Code Generator...')
    
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
    
    // Look for QR code elements
    const qrCodeSVG = page.locator('svg').first()
    const qrCodeSection = page.locator('[class*="qr"], [class*="qr-code"]')
    
    console.log(`QR Code SVGs found: ${await page.locator('svg').count()}`)
    console.log(`QR Code sections found: ${await qrCodeSection.count()}`)
    
    // Screenshot 10: QR Code SVG
    if (await qrCodeSVG.count() > 0) {
      await qrCodeSVG.screenshot({ path: 'test-results/attendance-features/10-qr-code-svg.png' })
      console.log('✅ Screenshot 10: QR Code SVG')
    }
    
    // Screenshot 11: QR Code section
    if (await qrCodeSection.count() > 0) {
      await qrCodeSection.first().screenshot({ path: 'test-results/attendance-features/11-qr-code-section.png' })
      console.log('✅ Screenshot 11: QR Code section')
    }
    
    // Screenshot 12: Full page with QR codes
    await page.screenshot({ 
      path: 'test-results/attendance-features/12-qr-generator-full.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 12: Full page with QR codes')
  })
  
  test('Business: Real-time Worker Status', async ({ page }) => {
    console.log('\n👥 Business: Testing Real-time Worker Status...')
    
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
    
    // Look for worker status elements
    const workerStatus = page.locator('text=/checked.in|sudah hadir|pending|belum|completed|selesai/i')
    const workerList = page.locator('[class*="worker"], [class*="pekerja"]')
    
    console.log(`Worker status elements found: ${await workerStatus.count()}`)
    console.log(`Worker list sections found: ${await workerList.count()}`)
    
    // Screenshot 13: Worker status section
    if (await workerStatus.count() > 0) {
      await workerStatus.first().screenshot({ path: 'test-results/attendance-features/13-worker-status.png' })
      console.log('✅ Screenshot 13: Worker status')
    }
    
    // Screenshot 14: Worker list
    if (await workerList.count() > 0) {
      await workerList.first().screenshot({ path: 'test-results/attendance-features/14-worker-list.png' })
      console.log('✅ Screenshot 14: Worker list')
    }
    
    // Screenshot 15: Full page with worker status
    await page.screenshot({ 
      path: 'test-results/attendance-features/15-worker-status-full.png', 
      fullPage: true 
    })
    console.log('✅ Screenshot 15: Full page with worker status')
  })
})
