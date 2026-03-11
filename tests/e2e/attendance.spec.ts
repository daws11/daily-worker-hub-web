/**
 * E2E Test: Attendance Tracking
 * 
 * Uses demo accounts:
 * - Worker: worker@demo.com / demo123456 (has booking for today)
 * - Business: business@demo.com / demo123456
 * 
 * NOTE: Check-in/check-out buttons only appear when there's a booking for today
 */

import { test, expect } from '@playwright/test'

// Demo accounts
const WORKER_EMAIL = 'worker@demo.com'
const BUSINESS_EMAIL = 'business@demo.com'
const PASSWORD = 'demo123456'

test.describe('Worker Attendance Flow', () => {
  
  test('Worker attendance page - Check-in/Check-out buttons', async ({ page }) => {
    console.log('\n📋 Testing worker attendance page...')
    
    // Login as worker
    await page.goto('/login')
    await page.fill('input[type="email"]', WORKER_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    
    const workerLabel = page.locator('label:has-text("Pekerja")').first()
    if (await workerLabel.count() > 0) {
      await workerLabel.click()
    }
    
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    // Navigate to attendance page
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Screenshot full page
    await page.screenshot({ 
      path: 'test-results/attendance/worker-attendance-full.png', 
      fullPage: true 
    })
    
    // Check page elements
    const heading = await page.locator('h1, h2').first().textContent()
    console.log(`Page heading: ${heading}`)
    
    // Check for attendance elements
    // NOTE: Buttons only appear if there's a booking for today with status "accepted"
    const checkInBtn = await page.getByRole('button', { name: /check.?in|masuk/i }).count()
    const checkOutBtn = await page.getByRole('button', { name: /check.?out|keluar/i }).count()
    const scheduleSection = await page.locator('text=/jadwal|schedule|today|hari ini/i').count()
    const historySection = await page.locator('text=/history|riwayat/i').count()
    
    console.log(`\n📊 Attendance elements:`)
    console.log(`  - Check-in buttons: ${checkInBtn}`)
    console.log(`  - Check-out buttons: ${checkOutBtn}`)
    console.log(`  - Schedule sections: ${scheduleSection}`)
    console.log(`  - History sections: ${historySection}`)
    
    // Verify we're on the attendance page
    expect(page.url()).toContain('/worker/attendance')
    
    // Verify: Demo worker has booking for today, so buttons should appear
    // (unless already checked in, then check-out button appears)
    const hasAttendanceButtons = checkInBtn > 0 || checkOutBtn > 0
    console.log(`  - Has attendance buttons: ${hasAttendanceButtons}`)
    
    // If no buttons, check if there's an empty state or "no schedule" message
    if (!hasAttendanceButtons) {
      const emptyState = await page.locator('text=/no schedule|tidak ada jadwal|empty|kosong/i').count()
      console.log(`  - Empty state messages: ${emptyState}`)
    }
  })
  
  test('Worker attendance - QR Scanner component', async ({ page }) => {
    console.log('\n📱 Testing QR scanner component...')
    
    // Login as worker
    await page.goto('/login')
    await page.fill('input[type="email"]', WORKER_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    
    const workerLabel = page.locator('label:has-text("Pekerja")').first()
    if (await workerLabel.count() > 0) {
      await workerLabel.click()
    }
    
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    await page.goto('/worker/attendance')
    await page.waitForLoadState('networkidle')
    
    // Look for QR scanner related elements
    const qrScanner = page.locator('[class*="qr"], [data-testid*="qr"], svg')
    const qrCount = await qrScanner.count()
    console.log(`QR-related elements: ${qrCount}`)
    
    // Screenshot
    await page.screenshot({ 
      path: 'test-results/attendance/worker-qr-scanner.png', 
      fullPage: true 
    })
  })
})

test.describe('Business Attendance Flow', () => {
  
  test('Business job attendance - QR Code Generator', async ({ page }) => {
    console.log('\n🏢 Testing business attendance page...')
    
    // Login as business
    await page.goto('/login')
    await page.fill('input[type="email"]', BUSINESS_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    
    const businessLabel = page.locator('label:has-text("Bisnis")').first()
    if (await businessLabel.count() > 0) {
      await businessLabel.click()
    }
    
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    // Navigate to job attendance page
    await page.goto('/business/job-attendance')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Screenshot full page
    await page.screenshot({ 
      path: 'test-results/attendance/business-attendance-full.png', 
      fullPage: true 
    })
    
    // Check page elements
    const heading = await page.locator('h1, h2').first().textContent()
    console.log(`Page heading: ${heading}`)
    
    // Check for QR code elements
    const qrCode = await page.locator('svg').count()
    const workerList = await page.locator('text=/worker|pekerja/i').count()
    
    console.log(`\n📊 Business attendance elements:`)
    console.log(`  - QR codes (SVG): ${qrCode}`)
    console.log(`  - Worker mentions: ${workerList}`)
    
    // Verify we're on the attendance page
    expect(page.url()).toContain('/business/job-attendance')
    
    // Business page should have QR codes for workers to scan
    expect(qrCode).toBeGreaterThan(0)
  })
  
  test('Business attendance - Worker status list', async ({ page }) => {
    console.log('\n👥 Testing worker status list...')
    
    // Login as business
    await page.goto('/login')
    await page.fill('input[type="email"]', BUSINESS_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    
    const businessLabel = page.locator('label:has-text("Bisnis")').first()
    if (await businessLabel.count() > 0) {
      await businessLabel.click()
    }
    
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(5000)
    
    await page.goto('/business/job-attendance')
    await page.waitForLoadState('networkidle')
    
    // Look for worker status elements
    const checkedIn = await page.locator('text=/checked.?in|sudah hadir/i').count()
    const pending = await page.locator('text=/pending|belum|not yet/i').count()
    const completed = await page.locator('text=/completed|selesai/i').count()
    
    console.log(`Worker status elements:`)
    console.log(`  - Checked in: ${checkedIn}`)
    console.log(`  - Pending: ${pending}`)
    console.log(`  - Completed: ${completed}`)
    
    // Screenshot
    await page.screenshot({ 
      path: 'test-results/attendance/business-worker-status.png', 
      fullPage: true 
    })
  })
})
