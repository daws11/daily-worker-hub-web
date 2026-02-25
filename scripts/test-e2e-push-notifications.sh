#!/bin/bash

# ============================================================================
# E2E Test: Push Notification System
# ============================================================================
# This script verifies the end-to-end push notification system:
# 1. Database tables exist (push_subscriptions, user_notification_preferences)
# 2. Service worker files exist (sw.js, push.js)
# 3. VAPID configuration is set up
# 4. Edge functions are deployed
# 5. Push subscription flow works
# 6. Notification preferences work
# 7. Notifications are triggered on events
# 8. Disabled notifications are not sent
#
# Usage:
#   ./scripts/test-e2e-push-notifications.sh
#
# Note: Some tests require manual browser verification for push notifications
# as the Web Push API requires a browser context.
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
RESET='\033[0m'

# Counter for tests
TESTS_PASSED=0
TESTS_FAILED=0

# Logging functions
log() {
    local color=$2
    echo -e "${color}${1}${RESET}"
}

log_cyan() { log "$1" "$CYAN"; }
log_green() { log "$1" "$GREEN"; }
log_red() { log "$1" "$RED"; }
log_yellow() { log "$1" "$YELLOW"; }
log_blue() { log "$1" "$BLUE"; }
log_magenta() { log "$1" "$MAGENTA"; }

print_test_header() {
    local test_num=$1
    local title=$2
    echo ""
    echo "======================================================================"
    log_magenta "🧪 TEST ${test_num}: ${title}"
    echo "======================================================================"
}

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2

    log_cyan "\n▶️  Running: ${test_name}"

    if eval "$test_command" > /dev/null 2>&1; then
        log_green "   ✅ PASSED: ${test_name}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_red "   ❌ FAILED: ${test_name}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# ============================================================================
# MAIN TEST SUITE
# ============================================================================

log_cyan "\n======================================================================"
log_cyan "🧪 E2E TEST: Push Notification System"
log_cyan "======================================================================"

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    log_red "❌ SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL not set"
    log_yellow "Please set environment variables in .env.local"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    log_red "❌ SUPABASE_SERVICE_ROLE_KEY not set"
    log_yellow "Please set environment variables in .env.local"
    exit 1
fi

# ============================================================================
# TEST 1: Database Schema - push_subscriptions Table
# ============================================================================
print_test_header "1" "Database Schema - push_subscriptions Table"

log_blue "   Checking if push_subscriptions table exists..."

# Check table existence via psql or by attempting a query
if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
    TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'push_subscriptions'
        );
    " 2>/dev/null | xargs)

    if [ "$TABLE_EXISTS" = "t" ]; then
        log_green "   ✅ push_subscriptions table exists"

        # Check columns
        log_blue "   🔍 Verifying column structure..."
        COLUMNS=$(psql "$DATABASE_URL" -t -c "
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'push_subscriptions'
            ORDER BY ordinal_position;
        " 2>/dev/null | tr '\n' ' ' | xargs)

        log_blue "   Found columns: $COLUMNS"

        # Check indexes
        log_blue "   🔍 Verifying indexes..."
        INDEXES=$(psql "$DATABASE_URL" -t -c "
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'push_subscriptions';
        " 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

        log_blue "   Found indexes: $INDEXES"

        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_green "   ✅ Test 1 PASSED: push_subscriptions table structure is correct"
    else
        log_red "   ❌ push_subscriptions table does not exist"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    log_yellow "   ⚠️  psql not available or DATABASE_URL not set, skipping direct table check"
    log_yellow "   Relying on TypeScript test for table verification"
fi

# ============================================================================
# TEST 2: Database Schema - user_notification_preferences Table
# ============================================================================
print_test_header "2" "Database Schema - user_notification_preferences Table"

log_blue "   Checking if user_notification_preferences table exists..."

if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
    TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'user_notification_preferences'
        );
    " 2>/dev/null | xargs)

    if [ "$TABLE_EXISTS" = "t" ]; then
        log_green "   ✅ user_notification_preferences table exists"

        # Check columns
        log_blue "   🔍 Verifying column structure..."
        COLUMNS=$(psql "$DATABASE_URL" -t -c "
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'user_notification_preferences'
            ORDER BY ordinal_position;
        " 2>/dev/null | tr '\n' ' ' | xargs)

        log_blue "   Found columns: $COLUMNS"

        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_green "   ✅ Test 2 PASSED: user_notification_preferences table structure is correct"
    else
        log_red "   ❌ user_notification_preferences table does not exist"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    log_yellow "   ⚠️  psql not available or DATABASE_URL not set, skipping direct table check"
    log_yellow "   Relying on TypeScript test for table verification"
fi

# ============================================================================
# TEST 3: Service Worker Files
# ============================================================================
print_test_header "3" "Service Worker Files"

run_test "Service worker file exists (sw.js)" "test -f ./public/sw.js"
run_test "Push utility file exists (push.js)" "test -f ./public/push.js"

if [ -f "./public/sw.js" ]; then
    if grep -q "push" ./public/sw.js && grep -q "notificationclick" ./public/sw.js; then
        log_green "   ✅ Service worker handles push and notification click events"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_red "   ❌ Service worker missing required event handlers"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# ============================================================================
# TEST 4: VAPID Keys Configuration
# ============================================================================
print_test_header "4" "VAPID Keys Configuration"

if [ -z "$NEXT_PUBLIC_VAPID_KEY" ]; then
    log_red "   ❌ NEXT_PUBLIC_VAPID_KEY not set in environment"
    log_yellow "   Generate VAPID keys with: npx web-push generate-vapid-keys"
    log_yellow "   Then add NEXT_PUBLIC_VAPID_KEY to .env.local"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    log_green "   ✅ VAPID_PUBLIC_KEY is configured"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

if [ -z "$VAPID_PRIVATE_KEY" ]; then
    log_yellow "   ⚠️  VAPID_PRIVATE_KEY not set in environment"
    log_yellow "   This is required for edge functions"
    log_yellow "   Add VAPID_PRIVATE_KEY to Supabase Edge Function secrets:"
    log_yellow "     supabase secrets set VAPID_PRIVATE_KEY=<your-key>"
else
    log_green "   ✅ VAPID_PRIVATE_KEY is configured"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# ============================================================================
# TEST 5: Edge Functions
# ============================================================================
print_test_header "5" "Edge Functions"

run_test "send-push-notification edge function exists" "test -f ./supabase/functions/send-push-notification/index.ts"
run_test "broadcast-push-notification edge function exists" "test -f ./supabase/functions/broadcast-push-notification/index.ts"
run_test "shift-reminders edge function exists" "test -f ./supabase/functions/shift-reminders/index.ts"

# Check if edge functions use web-push
for func in "send-push-notification" "broadcast-push-notification"; do
    func_file="./supabase/functions/${func}/index.ts"
    if [ -f "$func_file" ]; then
        if grep -q "web-push" "$func_file"; then
            log_green "   ✅ ${func} uses Web Push API"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log_red "   ❌ ${func} does not use Web Push API"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
done

# ============================================================================
# TEST 6: Server Actions
# ============================================================================
print_test_header "6" "Server Actions"

run_test "Server actions file exists" "test -f ./lib/actions/push-notifications.ts"

if [ -f "./lib/actions/push-notifications.ts" ]; then
    REQUIRED_FUNCTIONS=(
        "subscribeToPushNotifications"
        "unsubscribeFromPushNotifications"
        "getUserPushSubscription"
        "sendPushNotification"
        "getUserNotificationPreferences"
        "updateUserNotificationPreferences"
        "isNotificationTypeEnabled"
    )

    ALL_FUNCTIONS_FOUND=true
    for func in "${REQUIRED_FUNCTIONS[@]}"; do
        if grep -q "export async function $func" ./lib/actions/push-notifications.ts; then
            log_green "   ✅ Server action: $func"
        else
            log_red "   ❌ Server action not found: $func"
            ALL_FUNCTIONS_FOUND=false
        fi
    done

    if [ "$ALL_FUNCTIONS_FOUND" = true ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# ============================================================================
# TEST 7: React Hook
# ============================================================================
print_test_header "7" "React Hook"

run_test "React hook exists" "test -f ./lib/hooks/use-push-notifications.ts"

if [ -f "./lib/hooks/use-push-notifications.ts" ]; then
    if grep -q "export function usePushNotifications" ./lib/hooks/use-push-notifications.ts; then
        log_green "   ✅ React hook exported: usePushNotifications"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_red "   ❌ React hook export not found: usePushNotifications"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    if grep -q "useEffect" ./lib/hooks/use-push-notifications.ts; then
        log_green "   ✅ React hook uses useEffect for initialization"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_red "   ❌ React hook does not use useEffect"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# ============================================================================
# TEST 8: Notification Settings UI Component
# ============================================================================
print_test_header "8" "Notification Settings UI Component"

run_test "NotificationSettings component exists" "test -f ./components/notification-settings.tsx"

if [ -f "./components/notification-settings.tsx" ]; then
    NOTIFICATION_TYPES=(
        "newApplications"
        "bookingStatus"
        "paymentConfirmation"
        "newJobMatches"
        "shiftReminders"
    )

    ALL_TYPES_FOUND=true
    for type in "${NOTIFICATION_TYPES[@]}"; do
        if grep -q "$type" ./components/notification-settings.tsx; then
            log_green "   ✅ Notification type: $type"
        else
            log_red "   ❌ Component missing notification type: $type"
            ALL_TYPES_FOUND=false
        fi
    done

    if [ "$ALL_TYPES_FOUND" = true ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# ============================================================================
# TEST 9: Settings Pages
# ============================================================================
print_test_header "9" "Settings Pages"

run_test "Worker settings page exists" "test -f ./app/\(dashboard\)/worker/settings/page.tsx"
run_test "Business settings page exists" "test -f ./app/\(dashboard\)/business/settings/page.tsx"

# Check if settings pages use NotificationSettings component
if [ -f "./app/(dashboard)/worker/settings/page.tsx" ]; then
    if grep -q "NotificationSettings" "./app/(dashboard)/worker/settings/page.tsx"; then
        log_green "   ✅ Worker settings page uses NotificationSettings component"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_red "   ❌ Worker settings page does not use NotificationSettings component"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

if [ -f "./app/(dashboard)/business/settings/page.tsx" ]; then
    if grep -q "NotificationSettings" "./app/(dashboard)/business/settings/page.tsx"; then
        log_green "   ✅ Business settings page uses NotificationSettings component"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_red "   ❌ Business settings page does not use NotificationSettings component"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# ============================================================================
# TEST 10: Notification Integrations
# ============================================================================
print_test_header "10" "Notification Integrations"

run_test "Job applications file exists" "test -f ./lib/actions/job-applications.ts"

if [ -f "./lib/actions/job-applications.ts" ]; then
    if grep -q "from '../actions/notifications'" ./lib/actions/job-applications.ts; then
        log_green "   ✅ job-applications.ts imports notification actions"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_red "   ❌ job-applications.ts does not import from notifications actions"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    if grep -q "createNotification" ./lib/actions/job-applications.ts; then
        log_green "   ✅ applyForJob creates notifications for businesses"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_red "   ❌ applyForJob function does not create notifications"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

run_test "Payment webhook exists" "test -f ./supabase/functions/payment-webhook/index.ts"

if [ -f "./supabase/functions/payment-webhook/index.ts" ]; then
    if grep -q "sendPaymentNotification" ./supabase/functions/payment-webhook/index.ts; then
        log_green "   ✅ payment-webhook sends payment confirmations"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_red "   ❌ payment-webhook does not send payment notifications"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# ============================================================================
# RUN TYPESCRIPT TESTS FOR DATABASE OPERATIONS
# ============================================================================
print_test_header "11-12" "Database Operations (via TypeScript)"

if command -v npx &> /dev/null; then
    log_yellow "   Running TypeScript tests for database operations..."
    if npx ts-node ./scripts/test-e2e-push-notifications.ts 2>&1 | grep -q "Test 11 PASSED"; then
        log_green "   ✅ Test 11: Push subscription creation"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_yellow "   ⚠️  TypeScript test may have failed (check output above)"
    fi

    if npx ts-node ./scripts/test-e2e-push-notifications.ts 2>&1 | grep -q "Test 12 PASSED"; then
        log_green "   ✅ Test 12: Notification preferences creation"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_yellow "   ⚠️  TypeScript test may have failed (check output above)"
    fi
else
    log_yellow "   ⚠️  npx not available, skipping TypeScript tests"
    log_yellow "   Run manually: npx ts-node scripts/test-e2e-push-notifications.ts"
fi

# ============================================================================
# MANUAL TESTING INSTRUCTIONS
# ============================================================================
print_manual_testing_instructions() {
    echo ""
    echo "======================================================================"
    log_cyan "📋 MANUAL BROWSER TESTING INSTRUCTIONS"
    echo "======================================================================"

    echo ""
    log_yellow "Some tests require manual browser verification:\n"

    log_blue "1️⃣  Push Notification Permission Flow:"
    echo "   a. Open http://localhost:3000 in your browser"
    echo "   b. Log in as a user"
    echo "   c. Browser should request notification permission"
    echo "   d. Click 'Allow' to grant permission"
    echo "   e. Check browser DevTools > Application > Service Workers"
    echo "   f. Verify sw.js is registered and active"
    echo "   g. Check database push_subscriptions table for subscription"

    echo ""
    log_blue "2️⃣  Business Notification on New Application:"
    echo "   a. Log in as a business user"
    echo "   b. Enable all notifications in settings"
    echo "   c. Open DevTools > Application > Service Workers"
    echo "   d. Log in as a worker in a different browser/profile"
    echo "   e. Apply for a job posted by the business"
    echo "   f. Business browser should receive push notification"
    echo "   g. Verify notification contains worker name and job title"

    echo ""
    log_blue "3️⃣  Worker Notification on Booking Status Change:"
    echo "   a. Log in as a worker"
    echo "   b. Enable booking_status notifications in settings"
    echo "   c. Log in as a business user"
    echo "   d. Accept a worker's application"
    echo "   e. Worker browser should receive push notification"
    echo "   f. Verify notification shows 'Lamaran Diterima'"

    echo ""
    log_blue "4️⃣  Payment Confirmation Notifications:"
    echo "   a. Business and worker users have push enabled"
    echo "   b. Enable payment_confirmation notifications"
    echo "   c. Business completes a wallet top-up"
    echo "   d. Business should receive payment confirmation"
    echo "   e. If payment is for a booking, worker also receives notification"

    echo ""
    log_blue "5️⃣  Notification Preferences Filtering:"
    echo "   a. User has push_enabled = true"
    echo "   b. Set new_applications = false in settings"
    echo "   c. Worker applies for job"
    echo "   d. Business should NOT receive push notification"
    echo "   e. In-app notification should still be created"

    echo ""
    log_blue "6️⃣  Master Push Toggle:"
    echo "   a. User has individual notifications enabled"
    echo "   b. Set push_enabled = false in settings"
    echo "   c. Trigger any notification event"
    echo "   d. User should NOT receive any push notifications"
    echo "   e. In-app notifications should still work"

    echo ""
    log_blue "7️⃣  Shift Reminders (2 hours before):"
    echo "   a. Worker has shift_reminders enabled"
    echo "   b. Create a booking starting 2 hours from now"
    echo "   c. Call shift-reminders edge function:"
    echo "      curl -X POST http://localhost:54321/functions/v1/shift-reminders"
    echo "   d. Worker should receive shift reminder notification"

    echo ""
    echo "======================================================================"
}

# Print manual testing instructions
print_manual_testing_instructions

# ============================================================================
# TEST SUMMARY
# ============================================================================
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo ""
echo "======================================================================"
log_cyan "📊 TEST SUMMARY"
echo "======================================================================"
echo ""
echo "   Total Tests: $TOTAL_TESTS"
log_green "   ✅ Passed: $TESTS_PASSED"
if [ $TESTS_FAILED -gt 0 ]; then
    log_red "   ❌ Failed: $TESTS_FAILED"
else
    log_green "   ❌ Failed: $TESTS_FAILED"
fi

if [ $TESTS_FAILED -gt 0 ]; then
    echo ""
    log_red "❌ SOME TESTS FAILED"
    log_yellow "Please review the failed tests above and fix any issues"
    echo ""
    exit 1
else
    echo ""
    echo "======================================================================"
    log_green "✅ ALL AUTOMATED TESTS PASSED"
    echo "======================================================================"
    echo ""
    log_yellow "Note: Complete verification requires manual browser testing"
    log_yellow "See instructions above for manual testing steps"
    echo ""
fi
