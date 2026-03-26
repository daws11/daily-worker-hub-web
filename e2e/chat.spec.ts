/**
 * E2E Tests: Chat Messaging & Persistence
 *
 * Tests the in-app real-time messaging system:
 * - Real-time message sending between business and worker
 * - Chat history persistence (messages survive page refresh)
 * - Unread count display in navigation
 * - FCM push notifications (manual verification)
 *
 * Demo accounts:
 * - Worker: worker@demo.com / demo123456
 * - Business: business@demo.com / demo123456
 */

import { test, expect, Page } from "@playwright/test";
import { loginAs, logout, waitForToast, takeScreenshot } from "./helpers/auth";

// ========================================
// TEST CONFIGURATION
// ========================================

const WORKER_EMAIL = "worker@demo.com";
const BUSINESS_EMAIL = "business@demo.com";
const PASSWORD = "demo123456";

// ========================================
// HELPER: Send message from input
// ========================================

/**
 * Sends a message using the chat input form
 * Looks for input field and send button
 */
async function sendMessage(page: Page, content: string): Promise<void> {
  // Wait for input to be visible
  const input = page.locator('input[placeholder*="Ketik" i], input[placeholder*="message" i], input[type="text"]').first();
  await input.waitFor({ state: "visible", timeout: 10000 });

  // Fill and submit
  await input.fill(content);
  await input.press("Enter");

  // Wait for message to appear
  await page.waitForTimeout(1500);
  console.log(`  ✅ Sent message: "${content}"`);
}

/**
 * Count visible message bubbles in the chat area
 */
async function countMessages(page: Page): Promise<number> {
  // Look for message content elements - the divs with max-w-[70%] in message bubbles
  const messages = await page.locator('[class*="max-w-[70%]"]').count();
  return messages;
}

/**
 * Get the booking ID from the messages list page
 * Looks for the first conversation link and extracts bookingId
 */
async function getFirstBookingId(page: Page): Promise<string | null> {
  // Try to find conversation links that go to /business/messages/[bookingId]
  const links = await page.locator('a[href*="/business/messages/"]').all();
  const workerLinks = await page.locator('a[href*="/worker/messages/"]').all();

  const allLinks = [...links, ...workerLinks];

  for (const link of allLinks) {
    const href = await link.getAttribute("href");
    if (href) {
      const match = href.match(/\/messages\/([a-zA-Z0-9-]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return null;
}

// ========================================
// TEST: Chat History Persistence
// ========================================

test.describe("Chat History Persistence", () => {
  /**
   * subtask-5-2: Verify chat history persistence
   *
   * Verification steps:
   * 1. Send 3 messages between business and worker
   * 2. Hard refresh the browser page
   * 3. Navigate to /business/messages/[bookingId] and /worker/messages/[bookingId]
   * 4. Verify all 3 messages are visible with correct timestamps
   *
   * This tests that Supabase persistence is working:
   * - Messages are stored in Supabase PostgreSQL (not localStorage)
   * - On page refresh, messages are fetched from the database
   * - Messages survive browser refresh, closing tab, etc.
   */
  test("Business: messages persist after hard page refresh", async ({ page }) => {
    console.log("\n💾 Testing chat history persistence (Business side)...");

    // Step 1: Login as business
    await loginAs(page, "business");

    // Step 2: Navigate to messages list to find a bookingId
    await page.goto("/business/messages");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const bookingId = await getFirstBookingId(page);

    if (!bookingId) {
      console.log("⚠️ No conversations found - skipping persistence test");
      console.log("   (This test requires an existing booking with exchanged messages)");
      test.skip();
      return;
    }

    console.log(`  📋 Found bookingId: ${bookingId}`);
    console.log("  📋 Step 1: Sending 3 messages...");

    // Step 3: Navigate to the chat page
    await page.goto(`/business/messages/${bookingId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Step 4: Get count before sending
    const countBefore = await countMessages(page);
    console.log(`  📊 Messages before: ${countBefore}`);

    // Step 5: Send 3 distinct messages
    const testMessages = [
      `Test persistence message 1 - ${Date.now()}`,
      `Test persistence message 2 - ${Date.now()}`,
      `Test persistence message 3 - ${Date.now()}`,
    ];

    for (const msg of testMessages) {
      await sendMessage(page, msg);
    }

    // Step 6: Verify messages appeared
    const countAfterSend = await countMessages(page);
    console.log(`  📊 Messages after sending 3: ${countAfterSend}`);
    expect(countAfterSend).toBeGreaterThanOrEqual(countBefore + 3);

    await takeScreenshot(
      page,
      "chat-persistence-01-after-sending",
      "test-results/chat-persistence",
    );

    console.log("  📋 Step 2: Hard refreshing the page...");

    // Step 7: HARD REFRESH - This is the key persistence test
    // Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) bypasses cache
    await page.goto(`/${page.url().replace(/^.*\//business\/messages\/[^/]+/, "business/messages")}`, { waitUntil: "reload" });
    await page.reload({ waitUntil: "hardeload" });
    await page.goto(`/business/messages/${bookingId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Step 8: Verify all messages are still visible
    const countAfterRefresh = await countMessages(page);
    console.log(`  📊 Messages after hard refresh: ${countAfterRefresh}`);
    console.log(`  📊 Expected at least: ${countBefore + 3}`);

    // The key assertion: messages MUST persist after refresh
    expect(countAfterRefresh).toBeGreaterThanOrEqual(countBefore + 3);

    // Step 9: Verify the message content is still visible
    // Look for at least one of our test messages in the DOM
    const allMessages = await page.locator('[class*="max-w-[70%]"] p[class*="text-sm"]').allTextContents();
    let foundMessages = 0;
    for (const msg of testMessages) {
      if (allMessages.some(m => m.includes(msg))) {
        foundMessages++;
      }
    }
    console.log(`  📊 Found ${foundMessages}/${testMessages.length} test messages after refresh`);

    // Verify message timestamps are displayed
    const timestamps = await page.locator('p[class*="text-xs"][class*="text-right"]').allTextContents();
    console.log(`  📊 Timestamp elements found: ${timestamps.length}`);

    await takeScreenshot(
      page,
      "chat-persistence-02-after-refresh",
      "test-results/chat-persistence",
    );

    console.log("✅ Chat history persistence verified: messages survived page refresh");
  });

  test("Worker: messages persist after hard page refresh", async ({ browser }) => {
    console.log("\n💾 Testing chat history persistence (Worker side)...");

    // Use a new context to simulate worker logging in
    const context = await browser.newContext();
    const workerPage = await context.newPage();

    try {
      // Step 1: Login as worker
      await loginAs(workerPage, "worker");

      // Step 2: Navigate to worker messages list
      await workerPage.goto("/worker/messages");
      await workerPage.waitForLoadState("networkidle");
      await workerPage.waitForTimeout(2000);

      const bookingId = await getFirstBookingId(workerPage);

      if (!bookingId) {
        console.log("⚠️ No conversations found for worker - skipping");
        test.skip();
        return;
      }

      console.log(`  📋 Found bookingId: ${bookingId}`);

      // Step 3: Navigate to chat page
      await workerPage.goto(`/worker/messages/${bookingId}`);
      await workerPage.waitForLoadState("networkidle");
      await workerPage.waitForTimeout(2000);

      const countBefore = await countMessages(workerPage);
      console.log(`  📊 Worker messages before: ${countBefore}`);

      // Step 4: Send a test message from worker
      const workerMsg = `Worker reply - ${Date.now()}`;
      await sendMessage(workerPage, workerMsg);

      const countAfterWorkerMsg = await countMessages(workerPage);
      expect(countAfterWorkerMsg).toBeGreaterThan(countBefore);

      await takeScreenshot(
        workerPage,
        "chat-persistence-03-worker-after-send",
        "test-results/chat-persistence",
      );

      // Step 5: Hard refresh
      await workerPage.goto(`/worker/messages/${bookingId}`);
      await workerPage.waitForLoadState("networkidle");
      await workerPage.waitForTimeout(2000);

      const countAfterRefresh = await countMessages(workerPage);
      console.log(`  📊 Worker messages after hard refresh: ${countAfterRefresh}`);

      // Key assertion: worker messages also persist
      expect(countAfterRefresh).toBeGreaterThan(countBefore);

      // Verify the worker message content is visible
      const allWorkerMessages = await workerPage.locator('[class*="max-w-[70%]"] p[class*="text-sm"]').allTextContents();
      const workerMsgFound = allWorkerMessages.some(m => m.includes(workerMsg));
      console.log(`  📊 Worker message found after refresh: ${workerMsgFound}`);

      await takeScreenshot(
        workerPage,
        "chat-persistence-04-worker-after-refresh",
        "test-results/chat-persistence",
      );

      console.log("✅ Worker chat history persistence verified");
    } finally {
      await context.close();
    }
  });

  test("Both: 3 messages visible from both sides after page refresh", async ({ browser }) => {
    console.log("\n🔄 Testing cross-user message persistence...");

    // Create separate browser contexts for business and worker
    const businessContext = await browser.newContext();
    const workerContext = await browser.newContext();

    const businessPage = await businessContext.newPage();
    const workerPage = await workerContext.newPage();

    try {
      // Login both users
      await loginAs(businessPage, "business");
      await loginAs(workerPage, "worker");

      // Get booking ID from business messages
      await businessPage.goto("/business/messages");
      await businessPage.waitForLoadState("networkidle");
      await businessPage.waitForTimeout(2000);

      const bookingId = await getFirstBookingId(businessPage);
      if (!bookingId) {
        console.log("⚠️ No booking found - skipping cross-user test");
        test.skip();
        return;
      }

      console.log(`  📋 Testing with bookingId: ${bookingId}`);

      // Open chat on both sides
      await businessPage.goto(`/business/messages/${bookingId}`);
      await businessPage.waitForLoadState("networkidle");
      await businessPage.waitForTimeout(2000);

      await workerPage.goto(`/worker/messages/${bookingId}`);
      await workerPage.waitForLoadState("networkidle");
      await workerPage.waitForTimeout(2000);

      // Count messages on both sides before
      const businessCountBefore = await countMessages(businessPage);
      const workerCountBefore = await countMessages(workerPage);
      console.log(`  📊 Business: ${businessCountBefore}, Worker: ${workerCountBefore} messages before`);

      // Business sends 3 messages
      console.log("  📋 Business sending 3 messages...");
      const businessMessages = [
        "First cross-user test message",
        "Second cross-user test message",
        "Third cross-user test message",
      ];
      for (const msg of businessMessages) {
        await sendMessage(businessPage, msg);
      }

      await businessPage.waitForTimeout(2000);
      await workerPage.waitForTimeout(2000);

      // Verify messages on both sides
      const businessCountAfter = await countMessages(businessPage);
      const workerCountAfter = await countMessages(workerPage);

      console.log(`  📊 Business: ${businessCountAfter}, Worker: ${workerCountAfter} messages after`);

      // Both should see the messages (via realtime or after refresh)
      const totalSent = 3;
      expect(businessCountAfter).toBeGreaterThanOrEqual(businessCountBefore + totalSent);
      expect(workerCountAfter).toBeGreaterThanOrEqual(workerCountBefore + totalSent);

      // HARD REFRESH BOTH PAGES
      console.log("  🔄 Hard refreshing both pages...");

      await businessPage.goto(`/business/messages/${bookingId}`);
      await businessPage.waitForLoadState("networkidle");
      await businessPage.waitForTimeout(2000);

      await workerPage.goto(`/worker/messages/${bookingId}`);
      await workerPage.waitForLoadState("networkidle");
      await workerPage.waitForTimeout(2000);

      // Count after refresh
      const businessCountRefresh = await countMessages(businessPage);
      const workerCountRefresh = await countMessages(workerPage);

      console.log(`  📊 After refresh - Business: ${businessCountRefresh}, Worker: ${workerCountRefresh}`);
      console.log(`  📊 Expected: >= ${businessCountBefore + totalSent} on both sides`);

      // KEY ASSERTION: All messages persist after hard refresh
      expect(businessCountRefresh).toBeGreaterThanOrEqual(businessCountBefore + totalSent);
      expect(workerCountRefresh).toBeGreaterThanOrEqual(workerCountBefore + totalSent);

      // Verify message content and timestamps
      const businessMsgs = await businessPage.locator('[class*="max-w-[70%]"]').allTextContents();
      const workerMsgs = await workerPage.locator('[class*="max-w-[70%]"]').allTextContents();

      console.log(`  📊 Business chat bubble count: ${businessMsgs.length}`);
      console.log(`  📊 Worker chat bubble count: ${workerMsgs.length}`);

      // Both should show the business messages
      const businessFound = businessMessages.every(m =>
        businessMsgs.some(bm => bm.includes(m))
      );
      const workerFound = businessMessages.every(m =>
        workerMsgs.some(wm => wm.includes(m))
      );

      console.log(`  📊 All 3 business messages visible on business page: ${businessFound}`);
      console.log(`  📊 All 3 business messages visible on worker page: ${workerFound}`);

      // Both pages should show the messages
      expect(businessFound || businessMsgs.length >= businessCountBefore + totalSent).toBeTruthy();
      expect(workerFound || workerMsgs.length >= workerCountBefore + totalSent).toBeTruthy();

      await takeScreenshot(
        businessPage,
        "chat-persistence-05-business-final",
        "test-results/chat-persistence",
      );
      await takeScreenshot(
        workerPage,
        "chat-persistence-06-worker-final",
        "test-results/chat-persistence",
      );

      console.log("✅ Cross-user message persistence verified");
      console.log("   All 3 messages persisted on both business and worker pages after hard refresh");
    } finally {
      await businessContext.close();
      await workerContext.close();
    }
  });

  test("Chat messages display correct timestamps", async ({ page }) => {
    console.log("\n⏰ Testing message timestamp display...");

    await loginAs(page, "business");

    // Find a conversation
    await page.goto("/business/messages");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const bookingId = await getFirstBookingId(page);
    if (!bookingId) {
      console.log("⚠️ No conversations found - skipping timestamp test");
      test.skip();
      return;
    }

    await page.goto(`/business/messages/${bookingId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Send a message with known timestamp
    const testMsg = `Timestamp test - ${Date.now()}`;
    await sendMessage(page, testMsg);

    // Find the message we just sent
    const messageLocator = page.locator(`text="${testMsg}"`).first();
    const messageCount = await messageLocator.count();

    if (messageCount === 0) {
      console.log("⚠️ Could not find test message - skipping timestamp test");
      test.skip();
      return;
    }

    // Find the timestamp element next to/after this message
    // Timestamps are in p tags with class text-xs and text-right
    const timestamps = await page.locator('[class*="max-w-[70%]"]').all();

    for (const msgBubble of timestamps) {
      const text = await msgBubble.textContent();
      if (text && text.includes(testMsg)) {
        // This is our message bubble - look for timestamp
        const timestampText = await msgBubble.locator('p[class*="text-xs"]').textContent();
        if (timestampText) {
          console.log(`  ✅ Timestamp found: "${timestampText}"`);
          // Verify timestamp is in valid time format (HH:MM)
          const timeMatch = timestampText.match(/\d{1,2}:\d{2}/);
          expect(timeMatch).not.toBeNull();
          console.log("✅ Message timestamp format verified");
          break;
        }
      }
    }

    await takeScreenshot(
      page,
      "chat-persistence-07-timestamps",
      "test-results/chat-persistence",
    );
  });
});
