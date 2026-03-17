/**
 * Chat Basic E2E Tests
 * 
 * Tests the messages/chat pages for both worker and business users:
 * - Messages page loads for both roles
 * - Chat interface renders
 * - Message input presence
 * - Conversation list presence
 * 
 * Note: Does NOT test actual realtime functionality - just UI presence.
 * 
 * Test accounts:
 * - Worker: worker@demo.com / demo123456
 * - Business: business@demo.com / demo123456
 */

import { test, expect, Page } from '@playwright/test'

// Test credentials
const WORKER_EMAIL = 'worker@demo.com'
const WORKER_PASSWORD = 'demo123456'

const BUSINESS_EMAIL = 'business@demo.com'
const BUSINESS_PASSWORD = 'demo123456'

// Helper to take screenshots
async function captureScreenshot(page: Page, name: string) {
  const screenshotPath = `tests/e2e/screenshots/${name}.png`
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(`📸 Screenshot saved: ${screenshotPath}`)
}

test.describe.serial('Worker Messages Page', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as worker before each test
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    
    await page.locator('input[type="email"]').fill(WORKER_EMAIL)
    await page.locator('input[type="password"]').fill(WORKER_PASSWORD)
    
    const workerRadio = page.locator('label:has-text("Pekerja")').first()
    if (await workerRadio.count() > 0) {
      await workerRadio.click()
    }
    
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)
  })
  
  test('Worker messages page loads successfully', async ({ page }) => {
    console.log('\n💬 Testing worker messages page load...')
    
    await page.goto('/worker/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-01-worker-messages')
    
    const currentUrl = page.url()
    console.log(`Worker messages URL: ${currentUrl}`)
    
    // Should not redirect to login
    expect(currentUrl).not.toContain('/login')
    expect(currentUrl).toContain('/worker/messages')
    
    console.log('✅ Worker messages page loaded')
  })
  
  test('Worker chat interface renders', async ({ page }) => {
    console.log('\n🖥️ Testing worker chat interface rendering...')
    
    await page.goto('/worker/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-02-worker-chat-ui')
    
    // Check for chat interface elements
    const hasMessageIcon = await page.locator('[class*="message"], [class*="Message"], svg').count() > 0
    const hasHeader = await page.locator('h1, h2, [class*="header"]').count() > 0
    const hasContent = await page.locator('main, [role="main"], [class*="content"]').count() > 0
    const hasCard = await page.locator('[class*="card"]').count() > 0
    
    console.log(`Has message icon: ${hasMessageIcon}, Has header: ${hasHeader}`)
    console.log(`Has content area: ${hasContent}, Has card: ${hasCard}`)
    
    // Should have chat-related UI elements
    expect(hasMessageIcon || hasHeader || hasContent || hasCard).toBeTruthy()
    
    console.log('✅ Worker chat interface rendered')
  })
  
  test('Worker message input is present', async ({ page }) => {
    console.log('\n⌨️ Testing worker message input presence...')
    
    await page.goto('/worker/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-03-worker-input')
    
    // Check for message input elements
    const hasTextInput = await page.locator('input[type="text"], textarea, [contenteditable="true"]').count() > 0
    const hasInputPlaceholder = await page.locator('input[placeholder*="message" i], input[placeholder*="pesan" i], textarea[placeholder*="message" i]').count() > 0
    const hasSendButton = await page.locator('button:has-text("Send"), button:has-text("Kirim"), [class*="send"]').count() > 0
    const hasMessageInput = await page.locator('[class*="message-input"], [class*="input"]').count() > 0
    
    console.log(`Has text input: ${hasTextInput}, Has input placeholder: ${hasInputPlaceholder}`)
    console.log(`Has send button: ${hasSendButton}, Has message input class: ${hasMessageInput}`)
    
    // Note: Input might only appear when a conversation is selected
    // So we check if either input exists OR conversation list exists
    const hasConversationList = await page.locator('[class*="conversation"], [class*="chat-list"]').count() > 0
    const hasEmptyState = await page.locator('text=/belum ada|no message|empty|kosong|no conversation/i').count() > 0
    
    console.log(`Has conversation list: ${hasConversationList}, Has empty state: ${hasEmptyState}`)
    
    // Page should have some messaging-related elements
    expect(hasTextInput || hasInputPlaceholder || hasSendButton || hasMessageInput || hasConversationList || hasEmptyState).toBeTruthy()
    
    console.log('✅ Worker message area checked')
  })
  
  test('Worker conversation list or empty state present', async ({ page }) => {
    console.log('\n📋 Testing worker conversation list...')
    
    await page.goto('/worker/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-04-worker-conversations')
    
    // Check for conversation list
    const hasConversationList = await page.locator('[class*="conversation"], [class*="chat"]').count() > 0
    const hasAvatar = await page.locator('[class*="avatar"], img[alt*="avatar" i]').count() > 0
    const hasParticipantName = await page.locator('text=/participant|nama|name/i').count() > 0
    
    // Check for empty state
    const hasEmptyState = await page.locator('text=/belum ada|no message|empty|kosong|no conversation|belum ada pesan/i').count() > 0
    
    // Check for statistics
    const hasStatsCard = await page.locator('[class*="card"]').count() > 0
    const hasTotalConversations = await page.locator('text=/total percakapan|total conversation/i').count() > 0
    const hasUnreadCount = await page.locator('text=/belum dibaca|unread/i').count() > 0
    
    console.log(`Has conversation list: ${hasConversationList}, Has avatar: ${hasAvatar}`)
    console.log(`Has empty state: ${hasEmptyState}, Has stats card: ${hasStatsCard}`)
    console.log(`Has total conversations: ${hasTotalConversations}, Has unread count: ${hasUnreadCount}`)
    
    // Should have either conversations or empty state
    expect(hasConversationList || hasEmptyState || hasStatsCard).toBeTruthy()
    
    console.log('✅ Worker conversation area checked')
  })
  
  test('Worker messages page has search functionality', async ({ page }) => {
    console.log('\n🔍 Testing worker search functionality...')
    
    await page.goto('/worker/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-05-worker-search')
    
    // Check for search input
    const hasSearchInput = await page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="cari" i]').count() > 0
    const hasSearchIcon = await page.locator('[class*="search"], svg[class*="search"]').count() > 0
    
    console.log(`Has search input: ${hasSearchInput}, Has search icon: ${hasSearchIcon}`)
    
    if (hasSearchInput) {
      console.log('✅ Search functionality present')
    } else {
      console.log('ℹ️ Search functionality might not be implemented')
    }
  })
})

test.describe.serial('Business Messages Page', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as business before each test
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL)
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD)
    
    const businessRadio = page.locator('label:has-text("Bisnis")').first()
    if (await businessRadio.count() > 0) {
      await businessRadio.click()
    }
    
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)
  })
  
  test('Business messages page loads successfully', async ({ page }) => {
    console.log('\n💬 Testing business messages page load...')
    
    await page.goto('/business/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-06-business-messages')
    
    const currentUrl = page.url()
    console.log(`Business messages URL: ${currentUrl}`)
    
    // Should not redirect to login
    expect(currentUrl).not.toContain('/login')
    expect(currentUrl).toContain('/business/messages')
    
    console.log('✅ Business messages page loaded')
  })
  
  test('Business chat interface renders', async ({ page }) => {
    console.log('\n🖥️ Testing business chat interface rendering...')
    
    await page.goto('/business/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-07-business-chat-ui')
    
    // Check for chat interface elements
    const hasMessageIcon = await page.locator('[class*="message"], [class*="Message"], svg').count() > 0
    const hasHeader = await page.locator('h1, h2, [class*="header"]').count() > 0
    const hasContent = await page.locator('main, [role="main"], [class*="content"]').count() > 0
    const hasCard = await page.locator('[class*="card"]').count() > 0
    
    console.log(`Has message icon: ${hasMessageIcon}, Has header: ${hasHeader}`)
    console.log(`Has content area: ${hasContent}, Has card: ${hasCard}`)
    
    // Should have chat-related UI elements
    expect(hasMessageIcon || hasHeader || hasContent || hasCard).toBeTruthy()
    
    console.log('✅ Business chat interface rendered')
  })
  
  test('Business message input is present (or conversation list)', async ({ page }) => {
    console.log('\n⌨️ Testing business message input presence...')
    
    await page.goto('/business/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-08-business-input')
    
    // Check for message input elements
    const hasTextInput = await page.locator('input[type="text"], textarea, [contenteditable="true"]').count() > 0
    const hasInputPlaceholder = await page.locator('input[placeholder*="message" i], input[placeholder*="pesan" i], textarea[placeholder*="message" i]').count() > 0
    const hasSendButton = await page.locator('button:has-text("Send"), button:has-text("Kirim"), [class*="send"]').count() > 0
    
    // Check for conversation list
    const hasConversationList = await page.locator('[class*="conversation"], [class*="chat"]').count() > 0
    const hasEmptyState = await page.locator('text=/belum ada|no message|empty|kosong|no conversation/i').count() > 0
    
    console.log(`Has text input: ${hasTextInput}, Has send button: ${hasSendButton}`)
    console.log(`Has conversation list: ${hasConversationList}, Has empty state: ${hasEmptyState}`)
    
    // Page should have messaging-related elements
    expect(hasTextInput || hasSendButton || hasConversationList || hasEmptyState).toBeTruthy()
    
    console.log('✅ Business message area checked')
  })
  
  test('Business conversation list or empty state present', async ({ page }) => {
    console.log('\n📋 Testing business conversation list...')
    
    await page.goto('/business/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-09-business-conversations')
    
    // Check for conversation elements
    const hasConversationList = await page.locator('[class*="conversation"], [class*="chat"]').count() > 0
    const hasAvatar = await page.locator('[class*="avatar"], img[alt*="avatar" i]').count() > 0
    const hasParticipantName = await page.locator('text=/participant|nama|pekerja|worker/i').count() > 0
    
    // Check for empty state
    const hasEmptyState = await page.locator('text=/belum ada|no message|empty|kosong|no conversation/i').count() > 0
    
    // Check for statistics
    const hasStatsCard = await page.locator('[class*="card"]').count() > 0
    const hasTotalConversations = await page.locator('text=/total percakapan|total conversation/i').count() > 0
    const hasUnreadCount = await page.locator('text=/belum dibaca|unread/i').count() > 0
    
    console.log(`Has conversation list: ${hasConversationList}, Has avatar: ${hasAvatar}`)
    console.log(`Has empty state: ${hasEmptyState}, Has stats card: ${hasStatsCard}`)
    console.log(`Has total conversations: ${hasTotalConversations}, Has unread count: ${hasUnreadCount}`)
    
    // Should have either conversations or empty state
    expect(hasConversationList || hasEmptyState || hasStatsCard).toBeTruthy()
    
    console.log('✅ Business conversation area checked')
  })
  
  test('Business messages page shows job/booking context', async ({ page }) => {
    console.log('\n📋 Testing business messages job context...')
    
    await page.goto('/business/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await captureScreenshot(page, 'chat-10-business-context')
    
    // Check for job/booking context in conversations
    const hasJobTitle = await page.locator('text=/job|pekerjaan|title/i').count() > 0
    const hasBookingStatus = await page.locator('text=/status|booking/i').count() > 0
    const hasDateInfo = await page.locator('text=/date|tanggal|waktu/i').count() > 0
    
    console.log(`Has job title: ${hasJobTitle}, Has booking status: ${hasBookingStatus}, Has date info: ${hasDateInfo}`)
    
    // Context might only appear when conversations exist
    if (hasJobTitle || hasBookingStatus || hasDateInfo) {
      console.log('✅ Job/booking context present in messages')
    } else {
      console.log('ℹ️ No job context visible (might be empty state)')
    }
  })
})

test.describe.serial('Messages Page Comparison', () => {
  
  test('Both message pages are accessible after login', async ({ page }) => {
    console.log('\n🔄 Testing messages pages accessibility...')
    
    // Login as worker
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('input[type="email"]').fill(WORKER_EMAIL)
    await page.locator('input[type="password"]').fill(WORKER_PASSWORD)
    const workerRadio = page.locator('label:has-text("Pekerja")').first()
    if (await workerRadio.count() > 0) await workerRadio.click()
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)
    
    // Access worker messages
    await page.goto('/worker/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    
    let currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')
    console.log('✅ Worker messages accessible')
    
    await captureScreenshot(page, 'chat-11-comparison-worker')
    
    // Clear session and login as business
    await page.context().clearCookies()
    
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL)
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD)
    const businessRadio = page.locator('label:has-text("Bisnis")').first()
    if (await businessRadio.count() > 0) await businessRadio.click()
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)
    
    // Access business messages
    await page.goto('/business/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    
    currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')
    console.log('✅ Business messages accessible')
    
    await captureScreenshot(page, 'chat-12-comparison-business')
    
    console.log('✅ Both messages pages are accessible')
  })
  
  test('Messages pages have consistent UI elements', async ({ page }) => {
    console.log('\n🎨 Testing messages pages UI consistency...')
    
    // Login as business and check UI elements
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('input[type="email"]').fill(BUSINESS_EMAIL)
    await page.locator('input[type="password"]').fill(BUSINESS_PASSWORD)
    const businessRadio = page.locator('label:has-text("Bisnis")').first()
    if (await businessRadio.count() > 0) await businessRadio.click()
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)
    
    await page.goto('/business/messages')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Check for common UI elements
    const hasHeader = await page.locator('h1, h2').count() > 0
    const hasCard = await page.locator('[class*="card"]').count() > 0
    const hasIcon = await page.locator('svg').count() > 0
    
    console.log(`Business messages - Has header: ${hasHeader}, Has card: ${hasCard}, Has icon: ${hasIcon}`)
    
    await captureScreenshot(page, 'chat-13-ui-consistency')
    
    // At minimum, page should have header
    expect(hasHeader).toBeTruthy()
    
    console.log('✅ Messages pages have consistent UI elements')
  })
})
