/**
 * E2E Test: Attendance Tracking with Authenticated Users
 * Uses test accounts created in setup-accounts.spec.ts
 */

import { test, expect } from '@playwright/test'

test.describe('Worker Attendance Flow', () => {
  test.use({ storageState: 'playwright/.auth/worker.json' })
  
  test('Worker attendance page - Check-in/Check-out', async ({ page }) => {
    console.log('\n📋 Testing worker attendance page...')
    
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
    const checkInBtn = await page.getByRole('button', { name: /check.?in/i }).count()
    const checkOutBtn = await page.getByRole('button', { name: /check.?out/i }).count()
    const scheduleSection = await page.locator('text=/jadwal|schedule|today/i').count()
    const historySection = await page.locator('text=/history|riwayat/i').count()
    
    console.log(`\n📊 Attendance elements:`)
    console.log(`  - Check-in buttons: ${checkInBtn}`)
    console.log(`  - Check-out buttons: ${checkOutBtn}`)
    console.log(`  - Schedule sections: ${scheduleSection}`)
    console.log(`  - History sections: ${historySection}`)
    
    // Verify we're on the attendance page
    expect(page.url()).toContain('/worker/attendance')
  })
  
  test('Worker attendance - QR Scanner component', async ({ page }) => {
    console.log('\n📱 Testing QR scanner component...')
    
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
  test.use({ storageState: 'playwright/.auth/business.json' })
  
  test('Business job attendance - QR Code Generator', async ({ page }) => {
    console.log('\n🏢 Testing business attendance page...')
    
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
    const downloadBtn = await page.getByRole('button', { name: /download|unduh/i }).count()
    const printBtn = await page.getByRole('button', { name: /print|cetak/i }).count()
    
    console.log(`\n📊 Business attendance elements:`)
    console.log(`  - QR codes (SVG): ${qrCode}`)
    console.log(`  - Worker mentions: ${workerList}`)
    console.log(`  - Download buttons: ${downloadBtn}`)
    console.log(`  - Print buttons: ${printBtn}`)
    
    // Verify we're on the attendance page
    expect(page.url()).toContain('/business/job-attendance')
  })
  
  test('Business attendance - Worker status list', async ({ page }) => {
    console.log('\n👥 Testing worker status list...')
    
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
