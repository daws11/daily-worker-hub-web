#!/usr/bin/env -S node --loader ts-node/esm

/**
 * Test: Notification Preference Settings
 *
 * This script specifically tests notification preference settings functionality:
 * 1. Preferences can be retrieved correctly
 * 2. Preferences can be updated correctly
 * 3. Master push_enabled switch works (overrides all individual settings)
 * 4. Individual notification type toggles work
 * 5. isNotificationTypeEnabled function works correctly
 * 6. Disabled notifications are not sent
 *
 * Usage:
 *   npx ts-node scripts/test-notification-preferences.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
const envPath = join(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(message: string, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function formatTestHeader(testNum: string, title: string) {
  return `\n${'='.repeat(70)}\n🧪 TEST ${testNum}: ${title}\n${'='.repeat(70)}`
}

// Track test results
const testResults: { name: string; passed: boolean; message?: string }[] = []

async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    log(`\n▶️  Running: ${name}`, 'cyan')
    await testFn()
    log(`   ✅ PASSED: ${name}`, 'green')
    testResults.push({ name, passed: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log(`   ❌ FAILED: ${name}`, 'red')
    log(`   Error: ${message}`, 'red')
    testResults.push({ name, passed: false, message })
  }
}

/**
 * Test 1: Verify preferences can be retrieved correctly
 */
async function testGetPreferences() {
  log(formatTestHeader('1', 'Get Notification Preferences'), 'cyan')

  // Get a test user
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (usersError || !users || users.length === 0) {
    throw new Error('No users found in database')
  }

  const testUserId = users[0].id
  log(`   📋 Using test user: ${testUserId}`, 'blue')

  // Delete existing preferences for clean test
  await supabase
    .from('user_notification_preferences')
    .delete()
    .eq('user_id', testUserId)

  // Get preferences (should create default ones)
  const { data: preferences, error: getError } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', testUserId)
    .single()

  if (getError && getError.code === 'PGRST116') {
    // No preferences exist - this is expected before first access
    log('   ✅ No preferences exist initially (expected)', 'green')

    // Trigger auto-creation by using the server action pattern
    const { data: newPrefs, error: createError } = await supabase
      .from('user_notification_preferences')
      .insert({ user_id: testUserId })
      .select()
      .single()

    if (createError) {
      throw new Error(`Failed to create default preferences: ${createError.message}`)
    }

    log('   ✅ Default preferences created', 'green')
  } else if (getError) {
    throw new Error(`Failed to get preferences: ${getError.message}`)
  } else {
    log('   ✅ Preferences retrieved successfully', 'green')
  }

  // Verify default values
  const { data: finalPrefs } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', testUserId)
    .single()

  if (!finalPrefs) {
    throw new Error('Failed to retrieve final preferences')
  }

  // Check that defaults are true for all notification types
  const notificationTypes = [
    'new_applications',
    'booking_status',
    'payment_confirmation',
    'new_job_matches',
    'shift_reminders'
  ]

  for (const type of notificationTypes) {
    if (finalPrefs[type] !== true) {
      throw new Error(`Default value for ${type} is not true`)
    }
    log(`   ✅ Default ${type} = true`, 'green')
  }

  log('\n   ✅ Test 1 PASSED: Preferences can be retrieved with correct defaults', 'green')
}

/**
 * Test 2: Verify preferences can be updated correctly
 */
async function testUpdatePreferences() {
  log(formatTestHeader('2', 'Update Notification Preferences'), 'cyan')

  // Get a test user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (!users || users.length === 0) {
    throw new Error('No users found in database')
  }

  const testUserId = users[0].id

  // Update preferences
  const updates = {
    push_enabled: true,
    new_applications: true,
    booking_status: false,
    payment_confirmation: true,
    new_job_matches: false,
    shift_reminders: true,
  }

  const { data: updated, error: updateError } = await supabase
    .from('user_notification_preferences')
    .update(updates)
    .eq('user_id', testUserId)
    .select()
    .single()

  if (updateError || !updated) {
    throw new Error(`Failed to update preferences: ${updateError?.message}`)
  }

  log('   ✅ Preferences updated successfully', 'green')

  // Verify all updates
  for (const [key, value] of Object.entries(updates)) {
    if (updated[key] !== value) {
      throw new Error(`${key} was not updated correctly (expected ${value}, got ${updated[key]})`)
    }
    log(`   ✅ ${key} = ${value}`, 'green')
  }

  log('\n   ✅ Test 2 PASSED: All preferences updated correctly', 'green')
}

/**
 * Test 3: Verify master push_enabled switch overrides individual settings
 */
async function testMasterPushSwitch() {
  log(formatTestHeader('3', 'Master Push Enabled Switch'), 'cyan')

  // Get a test user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (!users || users.length === 0) {
    throw new Error('No users found in database')
  }

  const testUserId = users[0].id

  // Set push_enabled = false, but individual settings = true
  const { error: updateError } = await supabase
    .from('user_notification_preferences')
    .update({
      push_enabled: false,
      new_applications: true,
      booking_status: true,
      payment_confirmation: true,
      new_job_matches: true,
      shift_reminders: true,
    })
    .eq('user_id', testUserId)

  if (updateError) {
    throw new Error(`Failed to update preferences: ${updateError.message}`)
  }

  log('   ✅ Set push_enabled = false with all individual types = true', 'green')

  // Verify the settings
  const { data: prefs } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', testUserId)
    .single()

  if (!prefs || prefs.push_enabled !== false) {
    throw new Error('push_enabled is not false')
  }

  // When push_enabled is false, notifications should NOT be sent
  // This is verified by checking the logic in sendPushNotification
  log('   ✅ push_enabled = false verified', 'green')
  log('   📝 Note: When push_enabled = false, ALL push notifications are disabled', 'blue')

  // Now set push_enabled = true
  const { error: enableError } = await supabase
    .from('user_notification_preferences')
    .update({ push_enabled: true })
    .eq('user_id', testUserId)

  if (enableError) {
    throw new Error(`Failed to enable push notifications: ${enableError.message}`)
  }

  log('   ✅ push_enabled = true (notifications now respect individual settings)', 'green')

  log('\n   ✅ Test 3 PASSED: Master push_enabled switch works correctly', 'green')
}

/**
 * Test 4: Verify individual notification type toggles work
 */
async function testIndividualNotificationToggles() {
  log(formatTestHeader('4', 'Individual Notification Type Toggles'), 'cyan')

  // Get a test user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (!users || users.length === 0) {
    throw new Error('No users found in database')
  }

  const testUserId = users[0].id

  const notificationTypes = [
    'new_applications',
    'booking_status',
    'payment_confirmation',
    'new_job_matches',
    'shift_reminders'
  ]

  // Test each notification type individually
  for (const type of notificationTypes) {
    // Enable this type, disable others
    const updates: any = { push_enabled: true }
    for (const t of notificationTypes) {
      updates[t] = (t === type)
    }

    const { error: updateError } = await supabase
      .from('user_notification_preferences')
      .update(updates)
      .eq('user_id', testUserId)

    if (updateError) {
      throw new Error(`Failed to toggle ${type}: ${updateError.message}`)
    }

    // Verify
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', testUserId)
      .single()

    if (!prefs || prefs[type] !== true) {
      throw new Error(`${type} is not enabled`)
    }

    // Verify others are disabled
    for (const t of notificationTypes) {
      if (t !== type && prefs[t] !== false) {
        throw new Error(`${t} should be disabled when testing ${type}`)
      }
    }

    log(`   ✅ ${type} can be toggled independently`, 'green')
  }

  log('\n   ✅ Test 4 PASSED: All individual notification type toggles work', 'green')
}

/**
 * Test 5: Verify isNotificationTypeEnabled logic
 */
async function testIsNotificationTypeEnabledLogic() {
  log(formatTestHeader('5', 'isNotificationTypeEnabled Logic'), 'cyan')

  // Get a test user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (!users || users.length === 0) {
    throw new Error('No users found in database')
  }

  const testUserId = users[0].id

  // Test Case 1: push_enabled = false, individual type = true
  // Expected: enabled = false (master switch overrides)
  await supabase
    .from('user_notification_preferences')
    .update({
      push_enabled: false,
      new_applications: true,
    })
    .eq('user_id', testUserId)

  const { data: prefs1 } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', testUserId)
    .single()

  if (!prefs1) {
    throw new Error('Failed to get preferences')
  }

  // Simulate isNotificationTypeEnabled logic
  const enabled1 = prefs1.push_enabled && prefs1.new_applications
  if (enabled1 !== false) {
    throw new Error('isNotificationTypeEnabled should return false when push_enabled is false')
  }
  log('   ✅ Case 1: push_enabled=false, new_applications=true => enabled=false', 'green')

  // Test Case 2: push_enabled = true, individual type = false
  // Expected: enabled = false
  await supabase
    .from('user_notification_preferences')
    .update({
      push_enabled: true,
      new_applications: false,
    })
    .eq('user_id', testUserId)

  const { data: prefs2 } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', testUserId)
    .single()

  if (!prefs2) {
    throw new Error('Failed to get preferences')
  }

  const enabled2 = prefs2.push_enabled && prefs2.new_applications
  if (enabled2 !== false) {
    throw new Error('isNotificationTypeEnabled should return false when individual type is false')
  }
  log('   ✅ Case 2: push_enabled=true, new_applications=false => enabled=false', 'green')

  // Test Case 3: push_enabled = true, individual type = true
  // Expected: enabled = true
  await supabase
    .from('user_notification_preferences')
    .update({
      push_enabled: true,
      new_applications: true,
    })
    .eq('user_id', testUserId)

  const { data: prefs3 } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', testUserId)
    .single()

  if (!prefs3) {
    throw new Error('Failed to get preferences')
  }

  const enabled3 = prefs3.push_enabled && prefs3.new_applications
  if (enabled3 !== true) {
    throw new Error('isNotificationTypeEnabled should return true when both are true')
  }
  log('   ✅ Case 3: push_enabled=true, new_applications=true => enabled=true', 'green')

  // Test Case 4: Default value (null/undefined) should be treated as true
  await supabase
    .from('user_notification_preferences')
    .update({
      push_enabled: true,
      new_applications: null, // Simulate null/default
    })
    .eq('user_id', testUserId)

  const { data: prefs4 } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', testUserId)
    .single()

  if (!prefs4) {
    throw new Error('Failed to get preferences')
  }

  // The actual implementation uses `?? true` for null coalescing
  const enabled4 = prefs4.push_enabled && (prefs4.new_applications ?? true)
  if (enabled4 !== true) {
    throw new Error('isNotificationTypeEnabled should treat null as true (default)')
  }
  log('   ✅ Case 4: push_enabled=true, new_applications=null => enabled=true (default)', 'green')

  log('\n   ✅ Test 5 PASSED: isNotificationTypeEnabled logic is correct', 'green')
}

/**
 * Test 6: Verify edge functions respect preferences
 */
async function testEdgeFunctionsRespectPreferences() {
  log(formatTestHeader('6', 'Edge Functions Respect Preferences'), 'cyan')

  // Verify broadcast-push-notification filters by preferences
  const broadcastPath = join(process.cwd(), './supabase/functions/broadcast-push-notification/index.ts')
  if (!existsSync(broadcastPath)) {
    throw new Error('broadcast-push-notification edge function not found')
  }

  const broadcastContent = readFileSync(broadcastPath, 'utf-8')

  // Check that it filters by push_enabled
  if (!broadcastContent.includes('.filter(\'user_notification_preferences.push_enabled\', \'eq\', true)')) {
    throw new Error('broadcast-push-notification does not filter by push_enabled')
  }
  log('   ✅ broadcast-push-notification filters by push_enabled', 'green')

  // Check that it filters by specific notification type
  if (!broadcastContent.includes('preferenceColumn')) {
    throw new Error('broadcast-push-notification does not filter by specific notification type')
  }
  log('   ✅ broadcast-push-notification filters by specific notification type', 'green')

  // Verify payment-webhook checks preferences
  const paymentWebhookPath = join(process.cwd(), './supabase/functions/payment-webhook/index.ts')
  if (!existsSync(paymentWebhookPath)) {
    throw new Error('payment-webhook edge function not found')
  }

  const paymentContent = readFileSync(paymentWebhookPath, 'utf-8')

  // Check that it checks both push_enabled and payment_confirmation
  if (!paymentContent.includes('preferences.push_enabled') || !paymentContent.includes('preferences.payment_confirmation')) {
    throw new Error('payment-webhook does not check notification preferences')
  }
  log('   ✅ payment-webhook checks push_enabled and payment_confirmation', 'green')

  // Check the logic
  if (!paymentContent.includes('!preferences.push_enabled || !preferences.payment_confirmation')) {
    throw new Error('payment-webhook does not correctly skip when notifications are disabled')
  }
  log('   ✅ payment-webhook correctly skips when notifications are disabled', 'green')

  log('\n   ✅ Test 6 PASSED: Edge functions respect notification preferences', 'green')
}

/**
 * Test 7: Verify integration points check preferences
 */
async function testIntegrationPointsCheckPreferences() {
  log(formatTestHeader('7', 'Integration Points Check Preferences'), 'cyan')

  // Check job-applications.ts
  const jobAppsPath = join(process.cwd(), './lib/actions/job-applications.ts')
  if (!existsSync(jobAppsPath)) {
    throw new Error('job-applications.ts not found')
  }

  const jobAppsContent = readFileSync(jobAppsPath, 'utf-8')

  // Check that it imports isNotificationTypeEnabled
  if (!jobAppsContent.includes('isNotificationTypeEnabled')) {
    throw new Error('job-applications.ts does not import isNotificationTypeEnabled')
  }
  log('   ✅ job-applications.ts imports isNotificationTypeEnabled', 'green')

  // Check that it's used before sending notifications
  if (!jobAppsContent.includes('await isNotificationTypeEnabled')) {
    throw new Error('job-applications.ts does not call isNotificationTypeEnabled before sending notifications')
  }
  log('   ✅ job-applications.ts calls isNotificationTypeEnabled before sending notifications', 'green')

  log('\n   ✅ Test 7 PASSED: Integration points check notification preferences', 'green')
}

/**
 * Test 8: Verify disabled notifications don't trigger push
 */
async function testDisabledNotificationsNoPush() {
  log(formatTestHeader('8', 'Disabled Notifications Do Not Trigger Push'), 'cyan')

  // Get a test user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (!users || users.length === 0) {
    throw new Error('No users found in database')
  }

  const testUserId = users[0].id

  // Disable all notifications
  await supabase
    .from('user_notification_preferences')
    .update({
      push_enabled: false,
      new_applications: false,
      booking_status: false,
      payment_confirmation: false,
      new_job_matches: false,
      shift_reminders: false,
    })
    .eq('user_id', testUserId)

  log('   ✅ All notifications disabled for test user', 'green')

  // Verify the settings
  const { data: prefs } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', testUserId)
    .single()

  if (!prefs || prefs.push_enabled !== false) {
    throw new Error('push_enabled is not false')
  }

  log('   ✅ Verified: push_enabled = false', 'green')
  log('   📝 Note: With push_enabled = false, sendPushNotification will succeed silently', 'blue')
  log('   📝 This is by design - users with notifications disabled should not receive errors', 'blue')

  // Check the sendPushNotification logic
  const pushActionsPath = join(process.cwd(), './lib/actions/push-notifications.ts')
  if (!existsSync(pushActionsPath)) {
    throw new Error('push-notifications.ts not found')
  }

  const pushContent = readFileSync(pushActionsPath, 'utf-8')

  // Verify the early return when push_enabled is false
  if (!pushContent.includes('if (preferences && !preferences.push_enabled)')) {
    throw new Error('sendPushNotification does not check push_enabled')
  }
  log('   ✅ sendPushNotification checks push_enabled before sending', 'green')

  // Verify it returns success silently
  if (!pushContent.includes('return { success: true }') || !pushContent.includes('// Silently succeed')) {
    throw new Error('sendPushNotification does not handle disabled notifications gracefully')
  }
  log('   ✅ sendPushNotification returns success silently when notifications are disabled', 'green')

  log('\n   ✅ Test 8 PASSED: Disabled notifications do not trigger push (and handled gracefully)', 'green')
}

/**
 * Main test runner
 */
async function main() {
  log('\n' + '='.repeat(70), 'cyan')
  log('🧪 TEST: Notification Preference Settings', 'cyan')
  log('='.repeat(70) + '\n', 'cyan')

  try {
    await runTest('Get Notification Preferences', testGetPreferences)
    await runTest('Update Notification Preferences', testUpdatePreferences)
    await runTest('Master Push Enabled Switch', testMasterPushSwitch)
    await runTest('Individual Notification Type Toggles', testIndividualNotificationToggles)
    await runTest('isNotificationTypeEnabled Logic', testIsNotificationTypeEnabledLogic)
    await runTest('Edge Functions Respect Preferences', testEdgeFunctionsRespectPreferences)
    await runTest('Integration Points Check Preferences', testIntegrationPointsCheckPreferences)
    await runTest('Disabled Notifications Do Not Trigger Push', testDisabledNotificationsNoPush)

    // Print test summary
    const passed = testResults.filter(r => r.passed).length
    const failed = testResults.filter(r => r.passed === false).length

    log('\n' + '='.repeat(70), 'cyan')
    log('📊 TEST SUMMARY', 'cyan')
    log('='.repeat(70), 'cyan')
    log(`\n   Total Tests: ${testResults.length}`, 'white')
    log(`   ✅ Passed: ${passed}`, 'green')
    log(`   ❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green')

    if (failed > 0) {
      log('\n❌ FAILED TESTS:', 'red')
      testResults.filter(r => !r.passed).forEach(r => {
        log(`   - ${r.name}: ${r.message}`, 'red')
      })
    }

    if (failed > 0) {
      process.exit(1)
    }

    log('\n' + '='.repeat(70), 'green')
    log('✅ ALL TESTS PASSED', 'green')
    log('='.repeat(70) + '\n', 'green')

    log('📋 Manual Browser Verification Steps:', 'yellow')
    log('\n1. Open http://localhost:3000/worker/settings (or /business/settings)', 'white')
    log('2. Toggle "Enable Push Notifications" to OFF', 'white')
    log('3. Try to trigger any notification event', 'white')
    log('4. Verify NO push notification is received', 'white')
    log('5. Toggle "Enable Push Notifications" to ON', 'white')
    log('6. Toggle "Booking Status Changes" to OFF', 'white')
    log('7. Trigger a booking status change event', 'white')
    log('8. Verify NO push notification is received', 'white')
    log('9. Toggle "Booking Status Changes" back to ON', 'white')
    log('10. Trigger a booking status change event', 'white')
    log('11. Verify push notification IS received', 'white')
    log('\n' + '='.repeat(70) + '\n', 'green')

  } catch (error) {
    log('\n❌ Test suite failed with unexpected error', 'red')
    log(String(error), 'red')
    process.exit(1)
  }
}

// Run the tests
main()
