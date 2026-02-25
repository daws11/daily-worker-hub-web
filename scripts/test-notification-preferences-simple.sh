#!/bin/bash

# Simple verification script for notification preferences
# Tests database and file structure without requiring TypeScript compilation

echo "======================================================================"
echo "🧪 NOTIFICATION PREFERENCES VERIFICATION"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

passed=0
failed=0

# Helper function to log messages
log_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    passed=$((passed + 1))
}

log_fail() {
    echo -e "${RED}❌ $1${NC}"
    failed=$((failed + 1))
}

log_info() {
    echo -e "${CYAN}▶️  $1${NC}"
}

# Test 1: Check NotificationSettings component exists
log_info "TEST 1: Verify NotificationSettings component exists"
if [ -f "./components/notification-settings.tsx" ]; then
    log_pass "NotificationSettings component found"

    # Check for all notification types
    if grep -q "newApplications" ./components/notification-settings.tsx && \
       grep -q "bookingStatus" ./components/notification-settings.tsx && \
       grep -q "paymentConfirmation" ./components/notification-settings.tsx && \
       grep -q "newJobMatches" ./components/notification-settings.tsx && \
       grep -q "shiftReminders" ./components/notification-settings.tsx; then
        log_pass "All notification types present in component"
    else
        log_fail "Missing notification types in component"
    fi

    # Check for proper disable logic
    if grep -q "disabled={isLoading || !preferences.pushEnabled}" ./components/notification-settings.tsx; then
        log_pass "Individual toggles properly disabled when push is off"
    else
        log_fail "Individual toggles not properly disabled"
    fi
else
    log_fail "NotificationSettings component not found"
fi

echo ""

# Test 2: Check settings pages exist
log_info "TEST 2: Verify settings pages exist"
WORKER_SETTINGS="./app/(dashboard)/worker/settings/page.tsx"
BUSINESS_SETTINGS="./app/(dashboard)/business/settings/page.tsx"

if [ -f "$WORKER_SETTINGS" ]; then
    log_pass "Worker settings page found"

    if grep -q "NotificationSettings" "$WORKER_SETTINGS"; then
        log_pass "Worker settings page uses NotificationSettings"
    else
        log_fail "Worker settings page doesn't use NotificationSettings"
    fi
else
    log_fail "Worker settings page not found"
fi

if [ -f "$BUSINESS_SETTINGS" ]; then
    log_pass "Business settings page found"

    if grep -q "NotificationSettings" "$BUSINESS_SETTINGS"; then
        log_pass "Business settings page uses NotificationSettings"
    else
        log_fail "Business settings page doesn't use NotificationSettings"
    fi
else
    log_fail "Business settings page not found"
fi

echo ""

# Test 3: Check isNotificationTypeEnabled function
log_info "TEST 3: Verify isNotificationTypeEnabled function"
if [ -f "./lib/actions/push-notifications.ts" ]; then
    log_pass "push-notifications.ts exists"

    if grep -q "export async function isNotificationTypeEnabled" ./lib/actions/push-notifications.ts; then
        log_pass "isNotificationTypeEnabled function defined"

        # Check it checks push_enabled
        if grep -q "if (!data.push_enabled)" ./lib/actions/push-notifications.ts; then
            log_pass "Function checks push_enabled master switch"
        else
            log_fail "Function doesn't check push_enabled"
        fi

        # Check it returns correct structure
        if grep -q "return { success: true, enabled" ./lib/actions/push-notifications.ts; then
            log_pass "Function returns correct structure"
        else
            log_fail "Function doesn't return expected structure"
        fi
    else
        log_fail "isNotificationTypeEnabled function not found"
    fi
else
    log_fail "push-notifications.ts not found"
fi

echo ""

# Test 4: Check job-applications.ts uses preferences
log_info "TEST 4: Verify job-applications.ts checks preferences"
if [ -f "./lib/actions/job-applications.ts" ]; then
    log_pass "job-applications.ts exists"

    if grep -q "isNotificationTypeEnabled" ./lib/actions/job-applications.ts; then
        log_pass "job-applications.ts imports isNotificationTypeEnabled"

        # Check it's used for booking_status
        if grep -q "await isNotificationTypeEnabled.*booking_status" ./lib/actions/job-applications.ts; then
            log_pass "booking_status notifications check preferences"
        else
            log_fail "booking_status notifications don't check preferences"
        fi
    else
        log_fail "job-applications.ts doesn't check notification preferences"
    fi
else
    log_fail "job-applications.ts not found"
fi

echo ""

# Test 5: Check sendPushNotification respects preferences
log_info "TEST 5: Verify sendPushNotification respects preferences"
if [ -f "./lib/actions/push-notifications.ts" ]; then
    # Check it checks push_enabled before sending
    if grep -q "if (preferences && !preferences.push_enabled)" ./lib/actions/push-notifications.ts; then
        log_pass "sendPushNotification checks push_enabled"

        # Check it returns success silently (doesn't error)
        if grep -q "return { success: true }.*// Silently succeed" ./lib/actions/push-notifications.ts; then
            log_pass "Returns success silently when disabled"
        else
            log_fail "Doesn't handle disabled notifications gracefully"
        fi
    else
        log_fail "sendPushNotification doesn't check preferences"
    fi
fi

echo ""

# Test 6: Check edge functions respect preferences
log_info "TEST 6: Verify edge functions respect preferences"
if [ -f "./supabase/functions/payment-webhook/index.ts" ]; then
    log_pass "payment-webhook exists"

    if grep -q "preferences.push_enabled" ./supabase/functions/payment-webhook/index.ts && \
       grep -q "preferences.payment_confirmation" ./supabase/functions/payment-webhook/index.ts; then
        log_pass "payment-webhook checks push_enabled and payment_confirmation"
    else
        log_fail "payment-webhook doesn't check preferences"
    fi
fi

if [ -f "./supabase/functions/broadcast-push-notification/index.ts" ]; then
    log_pass "broadcast-push-notification exists"

    if grep -q "user_notification_preferences.push_enabled" ./supabase/functions/broadcast-push-notification/index.ts; then
        log_pass "broadcast-push-notification filters by push_enabled"
    else
        log_fail "broadcast-push-notification doesn't filter by preferences"
    fi
fi

echo ""

# Test 7: Check server actions exist
log_info "TEST 7: Verify preference management server actions"
if [ -f "./lib/actions/push-notifications.ts" ]; then
    if grep -q "export async function getUserNotificationPreferences" ./lib/actions/push-notifications.ts; then
        log_pass "getUserNotificationPreferences function exists"
    else
        log_fail "getUserNotificationPreferences function not found"
    fi

    if grep -q "export async function updateUserNotificationPreferences" ./lib/actions/push-notifications.ts; then
        log_pass "updateUserNotificationPreferences function exists"
    else
        log_fail "updateUserNotificationPreferences function not found"
    fi
fi

echo ""

# Test 8: Check database schema
log_info "TEST 8: Verify database migration file exists"
if [ -f "./migrations/20260223_add_notification_preferences.sql" ]; then
    log_pass "Notification preferences migration file exists"

    # Check for all required columns
    if grep -q "push_enabled" ./migrations/20260223_add_notification_preferences.sql && \
       grep -q "new_applications" ./migrations/20260223_add_notification_preferences.sql && \
       grep -q "booking_status" ./migrations/20260223_add_notification_preferences.sql && \
       grep -q "payment_confirmation" ./migrations/20260223_add_notification_preferences.sql && \
       grep -q "new_job_matches" ./migrations/20260223_add_notification_preferences.sql && \
       grep -q "shift_reminders" ./migrations/20260223_add_notification_preferences.sql; then
        log_pass "All required columns defined in migration"
    else
        log_fail "Missing columns in migration"
    fi
else
    log_fail "Notification preferences migration not found"
fi

echo ""

# Summary
echo "======================================================================"
echo "📊 TEST SUMMARY"
echo "======================================================================"
echo ""
echo "   Total Tests: $((passed + failed))"
echo -e "${GREEN}   ✅ Passed: $passed${NC}"

if [ $failed -gt 0 ]; then
    echo -e "${RED}   ❌ Failed: $failed${NC}"
    echo ""
    exit 1
else
    echo -e "${RED}   ❌ Failed: $failed${NC}"
    echo ""
    echo "======================================================================"
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo "======================================================================"
    echo ""
    echo -e "${YELLOW}📋 MANUAL BROWSER TESTING:${NC}"
    echo ""
    echo "1. Open http://localhost:3000/worker/settings"
    echo "2. Toggle 'Enable Push Notifications' OFF"
    echo "3. Verify individual toggles become disabled"
    echo "4. Toggle 'Enable Push Notifications' ON"
    echo "5. Toggle 'Booking Status Changes' OFF"
    echo "6. As business, accept worker application"
    echo "7. Verify worker does NOT receive push notification"
    echo "8. Toggle 'Booking Status Changes' ON"
    echo "9. Accept another application"
    echo "10. Verify worker DOES receive push notification"
    echo ""
    echo "======================================================================"
    echo ""
fi
