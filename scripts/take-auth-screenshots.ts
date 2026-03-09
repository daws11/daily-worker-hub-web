import { chromium } from 'playwright'

async function takeScreenshots() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  })
  const page = await context.newPage()

  console.log('🚀 Starting authenticated screenshots...\n')

  // ========================================
  // WORKER ACCOUNT
  // ========================================
  console.log('👷 Logging in as Worker...')
  
  await page.goto('http://localhost:3000/login')
  await page.waitForTimeout(2000)
  
  // Fill login form
  await page.fill('input[type="email"]', 'worker@demo.com')
  await page.fill('input[type="password"]', 'demo123456')
  
  // Select worker role with force click
  await page.locator('text=Pekerja').click({ force: true })
  
  // Submit form
  await page.locator('button:has-text("Masuk")').click({ force: true })
  
  // Wait for redirect
  await page.waitForTimeout(5000)
  
  console.log('✅ Worker logged in!')
  
  // Take Worker Screenshots
  console.log('📸 Taking Worker screenshots...')
  
  // Worker Jobs
  await page.goto('http://localhost:3000/worker/jobs')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/dev/.openclaw/workspace/auth-final-worker-jobs.png', fullPage: false })
  console.log('  ✅ Worker Jobs')
  
  // Worker Applications
  await page.goto('http://localhost:3000/worker/applications')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/dev/.openclaw/workspace/auth-final-worker-applications.png', fullPage: false })
  console.log('  ✅ Worker Applications')
  
  // Worker Bookings
  await page.goto('http://localhost:3000/worker/bookings')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/dev/.openclaw/workspace/auth-final-worker-bookings.png', fullPage: false })
  console.log('  ✅ Worker Bookings')
  
  // Worker Wallet
  await page.goto('http://localhost:3000/worker/wallet')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/dev/.openclaw/workspace/auth-final-worker-wallet.png', fullPage: false })
  console.log('  ✅ Worker Wallet')
  
  // Logout
  await page.goto('http://localhost:3000/')
  await page.waitForTimeout(1000)
  
  // ========================================
  // BUSINESS ACCOUNT
  // ========================================
  console.log('\n🏢 Logging in as Business...')
  
  await page.goto('http://localhost:3000/login')
  await page.waitForTimeout(2000)
  
  // Fill login form
  await page.fill('input[type="email"]', 'business@demo.com')
  await page.fill('input[type="password"]', 'demo123456')
  
  // Select business role with force click
  await page.locator('text=Bisnis').click({ force: true })
  
  // Submit form
  await page.locator('button:has-text("Masuk")').click({ force: true })
  
  // Wait for redirect
  await page.waitForTimeout(5000)
  
  console.log('✅ Business logged in!')
  
  // Take Business Screenshots
  console.log('📸 Taking Business screenshots...')
  
  // Business Jobs
  await page.goto('http://localhost:3000/business/jobs')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/dev/.openclaw/workspace/auth-final-business-jobs.png', fullPage: false })
  console.log('  ✅ Business Jobs')
  
  // Business Messages
  await page.goto('http://localhost:3000/business/messages')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/dev/.openclaw/workspace/auth-final-business-messages.png', fullPage: false })
  console.log('  ✅ Business Messages')
  
  // Business Workers
  await page.goto('http://localhost:3000/business/workers')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/dev/.openclaw/workspace/auth-final-business-workers.png', fullPage: false })
  console.log('  ✅ Business Workers')
  
  // Business Bookings
  await page.goto('http://localhost:3000/business/bookings')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/dev/.openclaw/workspace/auth-final-business-bookings.png', fullPage: false })
  console.log('  ✅ Business Bookings')

  await browser.close()
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ ALL SCREENSHOTS CAPTURED!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

takeScreenshots()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
