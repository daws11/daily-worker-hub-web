/**
 * Debug Login Test - Full console capture
 */

import { test, expect } from '@playwright/test'

const WORKER_EMAIL = 'worker@demo.com'
const WORKER_PASSWORD = 'demo123456'

test('Debug: Full console capture', async ({ page }) => {
  console.log('\n🔍 Full debug login test...')
  
  // Capture ALL console logs
  const allLogs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    allLogs.push(`[${msg.type()}] ${text}`)
    // Also print to terminal for real-time monitoring
    console.log(`  BROWSER: [${msg.type()}] ${text}`)
  })
  
  // Capture page errors
  const pageErrors: string[] = []
  page.on('pageerror', err => {
    pageErrors.push(err.message)
    console.log(`  PAGE ERROR: ${err.message}`)
  })
  
  // Navigate to login
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  
  // Fill form
  await page.fill('input[type="email"]', WORKER_EMAIL)
  await page.fill('input[type="password"]', WORKER_PASSWORD)
  
  // Select worker
  const workerLabel = page.locator('label:has-text("Pekerja")').first()
  await workerLabel.click()
  await page.waitForTimeout(300)
  
  // Submit
  console.log('\n📤 Submitting...')
  await page.locator('button[type="submit"]').click()
  
  // Wait longer
  console.log('\n⏳ Waiting 10 seconds...')
  await page.waitForTimeout(10000)
  
  const finalUrl = page.url()
  console.log(`\n📍 Final URL: ${finalUrl}`)
  
  // Check page state
  const formVisible = await page.locator('form').isVisible()
  const hasToast = await page.locator('[data-sonner-toast], [role="status"]').count() > 0
  const toastText = hasToast ? await page.locator('[data-sonner-toast], [role="status"]').first().textContent() : 'none'
  
  console.log(`\n📊 Page state:`)
  console.log(`  Form visible: ${formVisible}`)
  console.log(`  Has toast: ${hasToast}`)
  console.log(`  Toast text: ${toastText}`)
  
  // Print auth-related logs
  console.log('\n📜 Auth-related console logs:')
  allLogs
    .filter(log => log.toLowerCase().includes('auth') || 
                   log.toLowerCase().includes('redirect') ||
                   log.toLowerCase().includes('error') ||
                   log.toLowerCase().includes('role'))
    .forEach(log => console.log(`  ${log}`))
  
  if (pageErrors.length > 0) {
    console.log('\n❌ Page errors:')
    pageErrors.forEach(err => console.log(`  ${err}`))
  }
  
  await page.screenshot({ path: 'test-results/debug-login-2-final.png', fullPage: true })
})
