#!/bin/bash

##############################################################################
# E2E Test: Error Handling Verification for Failed Payments and Payouts
#
# This script verifies error handling for various failure scenarios:
# 1. QRIS payment with amount below minimum (Rp 500.000) - validation error
# 2. Withdrawal with amount below minimum (Rp 100.000) - validation error
# 3. Withdrawal with insufficient wallet balance - error message
# 4. Failed payment webhook from Xendit - transaction status updated to failed
# 5. Failed payout webhook from Xendit - payout status updated to failed, wallet refunded
#
# Usage:
#   ./scripts/test-e2e-error-handling.sh <business_id> <worker_id> <bank_account_id>
#
# Example:
#   ./scripts/test-e2e-error-handling.sh <business_id> <worker_id> <bank_account_id>
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${2:-}${1}${NC}"
}

log_header() {
    log "\n${1}" "${MAGENTA}"
    log "$(printf '=%.0s' {1..70})" "${MAGENTA}"
}

log_section() {
    log "\n$(printf '=%.0s' {1..70})" "${CYAN}"
    log "${1}" "${CYAN}"
    log "$(printf '=%.0s' {1..70})" "${CYAN}"
}

log_step() {
    log "\n${1}" "${CYAN}"
}

log_success() {
    log "   ✅ ${1}" "${GREEN}"
}

log_error() {
    log "   ❌ ${1}" "${RED}"
}

log_info() {
    log "   ℹ️  ${1}" "${YELLOW}"
}

log_blue() {
    log "   ${1}" "${BLUE}"
}

# Validate UUID format
validate_uuid() {
    local uuid=$1
    local name=$2

    if [[ ! $uuid =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
        log_error "Invalid ${name} format. Expected UUID format."
        exit 1
    fi
}

# Check arguments
if [ $# -lt 3 ]; then
    log "Usage: $0 <business_id> <worker_id> <bank_account_id>" "${YELLOW}"
    log "\nArguments:" "${YELLOW}"
    log "  business_id      - The UUID of the business to test" "${YELLOW}"
    log "  worker_id        - The UUID of the worker to test" "${YELLOW}"
    log "  bank_account_id  - The UUID of the bank account to test" "${YELLOW}"
    log "\nExample:" "${YELLOW}"
    log "  $0 123e4567-e89b-12d3-a456-426614174000 987fcdeb-51a2-22d3-a456-426614174111 abcdef12-3456-7890-abcd-ef1234567890" "${YELLOW}"
    exit 1
fi

BUSINESS_ID=$1
WORKER_ID=$2
BANK_ACCOUNT_ID=$3

# Validate UUIDs
validate_uuid "$BUSINESS_ID" "business_id"
validate_uuid "$WORKER_ID" "worker_id"
validate_uuid "$BANK_ACCOUNT_ID" "bank_account_id"

# Main header
log_header "🧪 E2E TEST: Error Handling Verification"
log "   Failed Payments and Payouts" "${MAGENTA}"

# Source environment variables
if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
fi

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    log_error "Missing Supabase configuration"
    log_error "Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Run the TypeScript test
log_section "Running Error Handling Tests..."
log_blue "Business ID: $BUSINESS_ID"
log_blue "Worker ID: $WORKER_ID"
log_blue "Bank Account ID: $BANK_ACCOUNT_ID"

# Use npx ts-node to run the test
npx ts-node scripts/test-e2e-error-handling.ts "$BUSINESS_ID" "$WORKER_ID" "$BANK_ACCOUNT_ID"
exit_code=$?

if [ $exit_code -eq 0 ]; then
    log_section "Summary"
    log_success "All error handling tests passed!"
    log "\nTests Verified:" "${CYAN}"
    log "   1. Payment below minimum (Rp 500.000) - validation error ✅" "${GREEN}"
    log "   2. Withdrawal below minimum (Rp 100.000) - validation error ✅" "${GREEN}"
    log "   3. Withdrawal with insufficient balance - error message ✅" "${GREEN}"
    log "   4. Failed payment webhook - status updated, balance unchanged ✅" "${GREEN}"
    log "   5. Failed payout webhook - status updated, balance refunded ✅" "${GREEN}"
else
    log_section "Summary"
    log_error "Error handling tests failed!"
    exit 1
fi

exit $exit_code
