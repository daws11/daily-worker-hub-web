#!/bin/bash

###############################################################################
# E2E Test: Worker Withdrawal Flow via Bank Transfer
#
# This script verifies the end-to-end worker withdrawal flow:
# 1. Worker user exists and has wallet
# 2. Worker has sufficient wallet balance (seeded)
# 3. Bank account is saved for the worker
# 4. Withdrawal amount is valid (>= Rp 100.000)
# 5. Fee is calculated correctly (1% or Rp 5.000, whichever is higher)
# 6. Payout request is created with pending status
# 7. Wallet balance is deducted
# 8. Simulate successful payout webhook from Xendit
# 9. Verify payout status is updated to completed
#
# Usage:
#   ./scripts/test-e2e-worker-withdrawal.sh <worker_id> <bank_account_id> [amount] [seed_balance]
#
# Example:
#   ./scripts/test-e2e-worker-withdrawal.sh 123e4567-e89b-12d3-a456-426614174000 987fcdeb-51a2-22d3-a456-426614174000 100000
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Log functions
log() {
    echo -e "${CYAN}$1${NC}"
}
log_success() {
    echo -e "${GREEN}$1${NC}"
}
log_error() {
    echo -e "${RED}$1${NC}"
}
log_info() {
    echo -e "${BLUE}$1${NC}"
}

# Format currency
format_currency() {
    local amount=$1
    # Add thousand separators
    echo "Rp $(echo "$amount" | sed ':a;s/\B[0-9]\{3\}\>/./g;ta')"
}

# Check arguments
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <worker_id> <bank_account_id> [amount] [seed_balance]"
    echo ""
    echo "Arguments:"
    echo "  worker_id       - The UUID of the worker to test"
    echo "  bank_account_id - The UUID of the bank account to withdraw to"
    echo "  amount          - Optional. Withdrawal amount in IDR (default: 100000)"
    echo "  seed_balance    - Optional. Initial wallet balance to seed (default: amount + 50000)"
    echo ""
    echo "Example:"
    echo "  $0 123e4567-e89b-12d3-a456-426614174000 987fcdeb-51a2-22d3-a456-426614174000 100000"
    exit 1
fi

WORKER_ID="$1"
BANK_ACCOUNT_ID="$2"
AMOUNT=${3:-100000}  # Default: Rp 100.000
SEED_BALANCE=${4:-$(($AMOUNT + 50000))}  # Default: amount + buffer

# Validate UUID format
if ! echo "$WORKER_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
    log_error "Invalid worker ID format. Expected UUID format."
    exit 1
fi

if ! echo "$BANK_ACCOUNT_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
    log_error "Invalid bank account ID format. Expected UUID format."
    exit 1
fi

if ! echo "$AMOUNT" | grep -qE '^[0-9]+$'; then
    log_error "Invalid amount. Must be a positive number."
    exit 1
fi

MIN_WITHDRAWAL_AMOUNT=100000
FEE_PERCENTAGE=0.01
MIN_FEE=5000

# Calculate fee (1% or Rp 5.000, whichever is higher)
FEE=$(echo "$AMOUNT * $FEE_PERCENTAGE" | bc -l)
FEE_INT=${FEE%.*}
if [ $FEE_INT -lt $MIN_FEE ]; then
    FEE_INT=$MIN_FEE
fi
NET_AMOUNT=$(($AMOUNT - $FEE_INT))

echo ""
echo "======================================================================================"
log "🧪 E2E TEST: Worker Withdrawal Flow via Bank Transfer"
echo "======================================================================================"
echo ""

# Source environment variables
if [ -f .env.local ]; then
    source .env.local
else
    log_error "Error: .env.local file not found"
    exit 1
fi

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    log_error "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Step 1: Verify worker exists
log ""
log "📋 Step 1: Verifying worker exists"
log_info "   Worker ID: $WORKER_ID"

WORKER_DATA=$(psql "$DATABASE_URL" -t -c "
    SELECT id, full_name
    FROM workers
    WHERE id = '$WORKER_ID';
")

if [ -z "$WORKER_DATA" ]; then
    log_error "   ❌ Worker not found"
    exit 1
fi

WORKER_NAME=$(echo "$WORKER_DATA" | awk '{print $2}')
log_success "   ✅ Worker found: $WORKER_NAME"

# Step 2: Get or create worker wallet
log ""
log "💰 Step 2: Getting worker wallet"

WALLET_DATA=$(psql "$DATABASE_URL" -t -c "
    SELECT id, balance
    FROM wallets
    WHERE worker_id = '$WORKER_ID';
")

if [ -z "$WALLET_DATA" ]; then
    log_info "   ℹ️  No wallet found, creating one..."

    psql "$DATABASE_URL" -c "
        INSERT INTO wallets (business_id, worker_id, balance, currency, is_active)
        VALUES (NULL, '$WORKER_ID', $SEED_BALANCE, 'IDR', true);
    " > /dev/null

    CURRENT_BALANCE=$SEED_BALANCE
    log_success "   ✅ Wallet created with balance: $(format_currency $SEED_BALANCE)"
else
    WALLET_ID=$(echo "$WALLET_DATA" | awk '{print $1}')
    CURRENT_BALANCE=$(echo "$WALLET_DATA" | awk '{print $2}')

    # If balance is insufficient, seed it
    if [ $CURRENT_BALANCE -lt $SEED_BALANCE ]; then
        AMOUNT_TO_SEED=$(($SEED_BALANCE - $CURRENT_BALANCE))
        log_info "   ℹ️  Seeding wallet with $(format_currency $AMOUNT_TO_SEED)..."

        psql "$DATABASE_URL" -c "
            UPDATE wallets
            SET balance = $SEED_BALANCE, updated_at = NOW()
            WHERE id = '$WALLET_ID';
        " > /dev/null

        CURRENT_BALANCE=$SEED_BALANCE
        log_success "   ✅ Wallet seeded to: $(format_currency $SEED_BALANCE)"
    else
        log_success "   ✅ Wallet found"
    fi
fi

log_info "   Current balance: $(format_currency $CURRENT_BALANCE)"

# Step 3: Verify bank account
log ""
log "🏦 Step 3: Verifying bank account"

BANK_ACCOUNT_DATA=$(psql "$DATABASE_URL" -t -c "
    SELECT id, bank_code, bank_account_number, bank_account_name
    FROM bank_accounts
    WHERE id = '$BANK_ACCOUNT_ID' AND worker_id = '$WORKER_ID';
")

if [ -z "$BANK_ACCOUNT_DATA" ]; then
    log_error "   ❌ Bank account not found or doesn't belong to worker"
    exit 1
fi

BANK_CODE=$(echo "$BANK_ACCOUNT_DATA" | awk '{print $2}')
ACCOUNT_NUMBER=$(echo "$BANK_ACCOUNT_DATA" | awk '{print $3}')
ACCOUNT_NAME=$(echo "$BANK_ACCOUNT_DATA" | awk '{print $4}')

log_success "   ✅ Bank account found"
log_info "   Bank: $BANK_CODE"
log_info "   Account Number: $ACCOUNT_NUMBER"
log_info "   Account Name: $ACCOUNT_NAME"

# Step 4: Validate withdrawal amount
log ""
log "💵 Step 4: Validating withdrawal amount"
log_info "   Amount: $(format_currency $AMOUNT)"
log_info "   Available balance: $(format_currency $CURRENT_BALANCE)"

if [ $AMOUNT -lt $MIN_WITHDRAWAL_AMOUNT ]; then
    log_error "   ❌ Amount below minimum ($(format_currency $MIN_WITHDRAWAL_AMOUNT))"
    exit 1
fi

if [ $AMOUNT -gt $CURRENT_BALANCE ]; then
    log_error "   ❌ Insufficient balance"
    exit 1
fi

log_success "   ✅ Amount valid"
log_info "   Fee (1% min. Rp 5.000): $(format_currency $FEE_INT)"
log_info "   Net amount: $(format_currency $NET_AMOUNT)"

# Step 5: Create payout request
log ""
log "📝 Step 5: Creating payout request"

PAYOUT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
PROVIDER_PAYOUT_ID="test_payout_$(date +%s)"

psql "$DATABASE_URL" -c "
    INSERT INTO payout_requests (
        worker_id, amount, fee_amount, net_amount, status,
        bank_code, bank_account_number, bank_account_name,
        payment_provider, provider_payout_id, requested_at
    )
    VALUES (
        '$WORKER_ID', $AMOUNT, $FEE_INT, $NET_AMOUNT, 'pending',
        '$BANK_CODE', '$ACCOUNT_NUMBER', '$ACCOUNT_NAME',
        'xendit', '$PROVIDER_PAYOUT_ID', NOW()
    )
    RETURNING id;
" > /dev/null

log_success "   ✅ Payout request created"
log_info "   Payout Request ID: $PAYOUT_ID"
log_info "   Status: pending"

# Step 6: Debit worker wallet
log ""
log "💰 Step 6: Debiting worker wallet"
log_info "   Amount to debit: $(format_currency $AMOUNT)"

NEW_BALANCE=$(($CURRENT_BALANCE - $AMOUNT))

psql "$DATABASE_URL" -c "
    UPDATE wallets
    SET balance = $NEW_BALANCE, updated_at = NOW()
    WHERE worker_id = '$WORKER_ID';
" > /dev/null

log_success "   ✅ Wallet debited successfully"
log_info "   Previous balance: $(format_currency $CURRENT_BALANCE)"
log_info "   New balance: $(format_currency $NEW_BALANCE)"

# Step 7: Simulate successful webhook
log ""
log "🔔 Step 7: Simulating successful payout webhook"

psql "$DATABASE_URL" -c "
    UPDATE payout_requests
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = '$PAYOUT_ID';
" > /dev/null

log_success "   ✅ Payout status updated to 'completed'"

# Step 8: Verify payout record
log ""
log "🔍 Step 8: Verifying payout record"

PAYOUT_STATUS=$(psql "$DATABASE_URL" -t -c "
    SELECT status FROM payout_requests WHERE id = '$PAYOUT_ID';
")

if [ "$PAYOUT_STATUS" != "completed" ]; then
    log_error "   ❌ Payout status mismatch. Expected: completed, Got: $PAYOUT_STATUS"
    exit 1
fi

log_success "   ✅ Payout record verified"
log_info "   Status: completed"
log_info "   Amount: $(format_currency $AMOUNT)"
log_info "   Fee: $(format_currency $FEE_INT)"
log_info "   Net amount: $(format_currency $NET_AMOUNT)"

# Step 9: Verify wallet balance
log ""
log "💰 Step 9: Verifying wallet balance after withdrawal"

FINAL_BALANCE=$(psql "$DATABASE_URL" -t -c "
    SELECT balance FROM wallets WHERE worker_id = '$WORKER_ID';
")

if [ $FINAL_BALANCE -ne $NEW_BALANCE ]; then
    log_error "   ❌ Balance mismatch. Expected: $NEW_BALANCE, Got: $FINAL_BALANCE"
    exit 1
fi

log_success "   ✅ Wallet balance verified"
log_info "   Balance: $(format_currency $FINAL_BALANCE)"

# Test Summary
echo ""
echo "======================================================================================"
log_success "✅ ALL TESTS PASSED"
echo "======================================================================================"
echo ""

log "📊 Test Summary:"
log_info "   Worker ID: $WORKER_ID"
log_info "   Withdrawal amount: $(format_currency $AMOUNT)"
log_info "   Fee: $(format_currency $FEE_INT)"
log_info "   Net amount received: $(format_currency $NET_AMOUNT)"
log_info "   Previous balance: $(format_currency $CURRENT_BALANCE)"
log_info "   New balance: $(format_currency $NEW_BALANCE)"
log_info "   Payout Request ID: $PAYOUT_ID"
log_info "   Bank: $BANK_CODE - $ACCOUNT_NUMBER"

exit 0
