/**
 * Quick Test: Check Attendance Page After Fix
 */

import { test } from '@playwright/test'

const WORKER_EMAIL = 'test.worker@dailyworker.id'
const PASSWORD = 'Test123!'

test('Attendance - Check for Check-in Button', async ({ page }) => {
  console.log('\n📍 Testing attendance page after fix...')
  
  // Login
  await page.goto('/login')
  await page.fill('input[type="email"]', WORKER_EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.locator('form button[type="submit"]').click()
  await page.waitForTimeout(8000)
  
  console.log(`After login: ${page.url()}`)
  
  // Navigate to attendance
  await page.goto('/worker/attendance')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(5000)
  
  console.log(`Attendance URL: ${page.url()}`)
  
  // Screenshot full page
  await page.screenshot({ 
    path: 'test-results/fixed-attendance/01-attendance-full.png', 
    fullPage: true 
  })
  
  // List all buttons
  const allButtons = await page.locator('button').allTextContents()
  console.log('\n📋 All buttons:', allButtons)
  
  // Look for check-in button
  const checkInBtn = page.getByRole('button', { name: /check.?in|masuk|absen masuk/i })
  const checkInCount = await checkInBtn.count()
  console.log(`\n📍 Check-in buttons found: ${checkInCount}`)
  
  if (checkInCount > 0) {
    console.log('✅ CHECK-IN BUTTON FOUND!')
    await checkInBtn.first().screenshot({ path: 'test-results/fixed-attendance/02-check-in-button.png' })
  }
  
  // Look for QR scanner button
  const qrBtn = page.getByRole('button', { name: /scan|qr|camera/i })
  const qrCount = await qrBtn.count()
  console.log(`📱 QR Scanner buttons found: ${qrCount}`)
  
  // Look for check-out button
  const checkOutBtn = page.getByRole('button', { name: /check.?out|keluar|absen keluar/i })
  const checkOutCount = await checkOutBtn.count()
  console.log(`🚪 Check-out buttons found: ${checkOutCount}`)
  
  console.log('\n✅ Test complete!')
})
