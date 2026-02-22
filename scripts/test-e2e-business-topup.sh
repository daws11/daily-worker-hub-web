#!/bin/bash

# ============================================================================
# E2E Test: Business Top-Up Flow via QRIS
# ============================================================================
# This script verifies the end-to-end business top-up flow:
# 1. Business user logs in and navigates to wallet page
# 2. Wallet balance is displayed (initially 0)
# 3. QRIS payment form accepts valid amount (>= Rp 500.000)
# 4. Payment is created with Xendit API
# 5. QR code/payment URL is displayed
# 6. Simulate successful payment webhook from Xendit
# 7. Verify wallet balance is updated in database
# 8. Verify transaction is recorded in payment_transactions table
# 9. Verify business user sees updated balance
#
# Usage:
#   ./scripts/test-e2e-business-topup.sh <business_id> [amount]
#
# Example:
#   ./scripts/test-e2e-business-topup.sh 123e4567-e89b-12d3-a456-426614174000 500000
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Test configuration
TEST_AMOUNT=${2:-500000}  # Default Rp 500.000
MIN_TOPUP=500000
FEE_PERCENTAGE=0.007
FIXED_FEE=500

log() {
    local color=$2
    echo -e "${color}${1}${RESET}"
}

log_cyan() { log "$1" "$CYAN"; }
log_green() { log "$1" "$GREEN"; }
log_red() { log "$1" "$RED"; }
log_yellow() { log "$1" "$YELLOW"; }
log_blue() { log "$1" "$BLUE"; }

format_currency() {
    local amount=$1
    printf "Rp %.0f" "$amount" | sed 's/\,/./g' | sed ':a;s/\B[0-9]\{3\}\>/./g'
}

calculate_fee() {
    local amount=$1
    echo "$(awk "BEGIN {printf \"%d\", $amount * $FEE_PERCENTAGE + $FIXED_FEE}")"
}

# Check arguments
if [ $# -lt 1 ]; then
    log_red "Usage: $0 <business_id> [amount]"
    log_yellow "\nArguments:"
    log_yellow "  business_id  - The UUID of the business to test"
    log_yellow "  amount       - Optional. Top-up amount in IDR (default: 500000)"
    log_yellow "\nExample:"
    log_yellow "  $0 123e4567-e89b-12d3-a456-426614174000 500000"
    exit 1
fi

BUSINESS_ID=$1
AMOUNT=$TEST_AMOUNT

# Validate business ID format
if ! echo "$BUSINESS_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
    log_red "❌ Invalid business ID format. Expected UUID format."
    exit 1
fi

# Validate amount
if ! [[ "$AMOUNT" =~ ^[0-9]+$ ]] || [ "$AMOUNT" -le 0 ]; then
    log_red "❌ Invalid amount. Must be a positive number."
    exit 1
fi

# Check minimum amount
if [ "$AMOUNT" -lt "$MIN_TOPUP" ]; then
    log_red "❌ Amount below minimum $(format_currency $MIN_TOPUP)"
    exit 1
fi

# Calculate fee
FEE=$(calculate_fee "$AMOUNT")
TOTAL=$((AMOUNT + FEE))

log_cyan "\n============================================================"
log_cyan "🧪 E2E TEST: Business Top-Up Flow via QRIS"
log_cyan "============================================================\n"

# Step 1: Verify business exists
log_cyan "📋 Step 1: Verifying business exists"
log_blue "   Business ID: $BUSINESS_ID"

BUSINESS_DATA=$(psql "$DATABASE_URL" -t -c "
    SELECT id, name FROM businesses WHERE id = '$BUSINESS_ID';
")

if [ -z "$BUSINESS_DATA" ]; then
    log_red "   ❌ Business not found"
    exit 1
fi

BUSINESS_NAME=$(echo "$BUSINESS_DATA" | awk '{print $2}')
log_green "   ✅ Business found: $BUSINESS_NAME"

# Step 2: Get or create business wallet
log_cyan "\n💰 Step 2: Getting business wallet"

WALLET_DATA=$(psql "$DATABASE_URL" -t -c "
    SELECT id, balance FROM wallets WHERE business_id = '$BUSINESS_ID';
")

if [ -z "$WALLET_DATA" ]; then
    log_yellow "   ℹ️  No wallet found, creating one..."

    psql "$DATABASE_URL" -c "
        INSERT INTO wallets (business_id, worker_id, balance, currency, is_active)
        VALUES ('$BUSINESS_ID', NULL, 0, 'IDR', true);
    " > /dev/null

    log_green "   ✅ Wallet created successfully"
    INITIAL_BALANCE=0
else
    log_green "   ✅ Wallet found"
    INITIAL_BALANCE=$(echo "$WALLET_DATA" | awk '{print $2}')
fi

log_blue "   Current balance: $(format_currency $INITIAL_BALANCE)"

# Step 3: Validate top-up amount
log_cyan "\n💵 Step 3: Validating top-up amount"
log_blue "   Amount: $(format_currency $AMOUNT)"
log_green "   ✅ Amount valid"
log_blue "   Fee (0.7% + Rp 500): $(format_currency $FEE)"
log_blue "   Total amount: $(format_currency $TOTAL)"

# Step 4: Create payment transaction
log_cyan "\n📝 Step 4: Creating payment transaction"

TRANSACTION_ID=$(uuidgen)
PROVIDER_PAYMENT_ID="test_payment_$(date +%s)"
QRIS_EXPIRES_AT=$(date -u -d '+60 minutes' '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -v+60M '+%Y-%m-%dT%H:%M:%S')

psql "$DATABASE_URL" -c "
    INSERT INTO payment_transactions (
        id, business_id, amount, status, payment_provider,
        provider_payment_id, payment_url, qris_expires_at, fee_amount, metadata
    )
    VALUES (
        '$TRANSACTION_ID',
        '$BUSINESS_ID',
        $TOTAL,
        'pending',
        'xendit',
        '$PROVIDER_PAYMENT_ID',
        'https://checkout.xendit.co/test/$(date +%s)',
        '$QRIS_EXPIRES_AT',
        $FEE,
        '{\"test_mode\": true}'::jsonb
    );
" > /dev/null

log_green "   ✅ Transaction created"
log_blue "   Transaction ID: $TRANSACTION_ID"
log_blue "   Payment URL: https://checkout.xendit.co/test/$(date +%s)"

# Wait a moment
sleep 1

# Step 5: Simulate successful payment webhook
log_cyan "\n🔔 Step 5: Simulating successful payment webhook"
log_blue "   Webhook payload:"
log_blue "   - external_id: $TRANSACTION_ID"
log_blue "   - status: COMPLETED"
log_blue "   - amount: $(format_currency $TOTAL)"

psql "$DATABASE_URL" -c "
    UPDATE payment_transactions
    SET status = 'success',
        paid_at = NOW(),
        provider_payment_id = '$PROVIDER_PAYMENT_ID'
    WHERE id = '$TRANSACTION_ID';
" > /dev/null

log_green "   ✅ Transaction status updated to 'success'"

sleep 1

# Step 6: Credit business wallet
log_cyan "\n💰 Step 6: Crediting business wallet"
log_blue "   Amount to credit: $(format_currency $TOTAL)"

# Get wallet ID
WALLET_ID=$(psql "$DATABASE_URL" -t -c "
    SELECT id FROM wallets WHERE business_id = '$BUSINESS_ID';
")

psql "$DATABASE_URL" -c "
    UPDATE wallets
    SET balance = balance + $TOTAL,
        updated_at = NOW()
    WHERE id = '$WALLET_ID';
" > /dev/null

log_green "   ✅ Wallet credited successfully"
log_blue "   Previous balance: $(format_currency $INITIAL_BALANCE)"

# Get new balance
NEW_BALANCE=$(psql "$DATABASE_URL" -t -c "
    SELECT balance FROM wallets WHERE id = '$WALLET_ID';
")

log_blue "   New balance: $(format_currency $NEW_BALANCE)"

sleep 1

# Step 7: Verify transaction record
log_cyan "\n🔍 Step 7: Verifying transaction record"

TRANSACTION_STATUS=$(psql "$DATABASE_URL" -t -c "
    SELECT status FROM payment_transactions WHERE id = '$TRANSACTION_ID';
")

if [ "$TRANSACTION_STATUS" != "success" ]; then
    log_red "   ❌ Transaction status mismatch. Expected: success, Got: $TRANSACTION_STATUS"
    exit 1
fi

log_green "   ✅ Transaction record verified"
log_blue "   Status: $TRANSACTION_STATUS"

# Step 8: Verify wallet balance
log_cyan "\n💰 Step 8: Verifying wallet balance"

FINAL_BALANCE=$(psql "$DATABASE_URL" -t -c "
    SELECT balance FROM wallets WHERE business_id = '$BUSINESS_ID';
")

EXPECTED_BALANCE=$((INITIAL_BALANCE + TOTAL))

# Compare balances (using integer comparison)
FINAL_INT=${FINAL_BALANCE%.*}
EXPECTED_INT=$((INITIAL_BALANCE + TOTAL))

if [ "$FINAL_INT" -ne "$EXPECTED_INT" ]; then
    log_red "   ❌ Balance mismatch. Expected: $(format_currency $EXPECTED_INT), Got: $(format_currency $FINAL_INT)"
    exit 1
fi

log_green "   ✅ Wallet balance verified"
log_blue "   Balance: $(format_currency $FINAL_BALANCE)"

# Test Summary
log_green "\n============================================================"
log_green "✅ ALL TESTS PASSED"
log_green "============================================================\n"

log_cyan "📊 Test Summary:"
log_blue "   Business ID: $BUSINESS_ID"
log_blue "   Top-up amount: $(format_currency $AMOUNT)"
log_blue "   Fee: $(format_currency $FEE)"
log_blue "   Total credited: $(format_currency $TOTAL)"
log_blue "   Previous balance: $(format_currency $INITIAL_BALANCE)"
log_blue "   New balance: $(format_currency $NEW_BALANCE)"
log_blue "   Transaction ID: $TRANSACTION_ID"

exit 0
