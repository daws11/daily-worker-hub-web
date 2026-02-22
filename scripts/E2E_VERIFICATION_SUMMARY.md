# E2E Verification Summary: Payment Gateway Integration

**Date:** 2026-02-22
**Subtasks:** subtask-8-2, subtask-8-3
**Phase:** Integration and Testing

## Overview

This document summarizes the end-to-end verification tests for the payment gateway integration, covering both business top-up flow via QRIS and worker withdrawal flow via bank transfer.

---

## Part 1: Business Top-Up Flow via QRIS (subtask-8-2)

### Changes Made

#### 1. Fixed Payment Webhook Wallet Lookup
**File:** `supabase/functions/payment-webhook/index.ts`

**Problem:** The payment webhook was trying to look up a wallet using `wallet_id` field that doesn't exist in the `payment_transactions` table. The table only has `business_id`.

**Solution:** Modified the webhook to:
1. Removed `wallet_id` from the select query
2. Changed wallet lookup to use `business_id` instead
3. Get the wallet by querying `wallets` table where `business_id = transaction.business_id`

#### 2. Fixed Minimum Top-Up Amount
**File:** `app/app/(dashboard)/business/wallet/page.tsx`

**Problem:** The minimum top-up amount was set to Rp 50.000 instead of Rp 500.000 as specified in the requirements.

**Solution:** Updated all instances of `50000` to `500000` in validation, error messages, form constraints, and help text.

#### 3. Created E2E Test Scripts

**Files:**
- `scripts/test-e2e-business-topup.ts` - TypeScript version with detailed output
- `scripts/test-e2e-business-topup.sh` - Bash script version for direct execution

**Test Coverage:**
1. ✅ Verify business exists
2. ✅ Get or create business wallet
3. ✅ Validate top-up amount (>= Rp 500.000)
4. ✅ Create payment transaction with pending status
5. ✅ Simulate successful payment webhook
6. ✅ Credit business wallet
7. ✅ Verify transaction record status is 'success'
8. ✅ Verify wallet balance is updated correctly

**Usage:**
```bash
# Using the shell script (recommended)
./scripts/test-e2e-business-topup.sh <business_id> [amount]

# Using the TypeScript script
npm run test:e2e:business-topup <business_id> [amount]
```

---

## Part 2: Worker Withdrawal Flow via Bank Transfer (subtask-8-3)

### E2E Test Scripts Created

**Files:**
- `scripts/test-e2e-worker-withdrawal.ts` - TypeScript version with detailed output
- `scripts/test-e2e-worker-withdrawal.sh` - Bash script version for direct execution

**Test Coverage:**
1. ✅ Verify worker exists
2. ✅ Get or create worker wallet (with optional balance seeding)
3. ✅ Verify bank account exists and belongs to worker
4. ✅ Validate withdrawal amount (>= Rp 100.000)
5. ✅ Calculate fee correctly (1% or Rp 5.000, whichever is higher)
6. ✅ Create payout request with pending status
7. ✅ Debit worker wallet balance
8. ✅ Simulate successful payout webhook from Xendit
9. ✅ Verify payout status is updated to completed
10. ✅ Verify wallet balance after withdrawal

**Usage:**
```bash
# Using the shell script (recommended)
./scripts/test-e2e-worker-withdrawal.sh <worker_id> <bank_account_id> [amount] [seed_balance]

# Using the TypeScript script
npm run test:e2e:worker-withdrawal <worker_id> <bank_account_id> [amount] [seed_balance]
```

**Example:**
```bash
./scripts/test-e2e-worker-withdrawal.sh 123e4567-e89b-12d3-a456-426614174000 987fcdeb-51a2-22d3-a456-426614174000 100000
```

### Verification Steps for Worker Withdrawal

The E2E test verifies the following flow:

1. **Worker Authentication** (simulated by using worker_id)
   - Verifies worker exists in database

2. **Wallet Display and Seeding**
   - Gets or creates worker wallet
   - Optionally seeds wallet with sufficient balance for testing

3. **Bank Account Verification**
   - Verifies bank account exists
   - Confirms bank account belongs to the worker
   - Displays bank details (bank code, account number, holder name)

4. **Withdrawal Form Validation**
   - Validates amount >= Rp 100.000
   - Validates amount <= Rp 100.000.000
   - Validates sufficient wallet balance
   - Calculates fee (1% or Rp 5.000, whichever is higher)

5. **Payout Request Creation**
   - Creates payout request with pending status
   - Stores bank details
   - Records fee amount and net amount

6. **Wallet Balance Deduction**
   - Debits worker wallet with withdrawal amount
   - Verifies balance decreased correctly

7. **Webhook Simulation**
   - Simulates Xendit payout success callback
   - Updates payout request status to 'completed'
   - Records completion timestamp

8. **Payout Record Verification**
   - Confirms payout status is 'completed'
   - Verifies all payout details are correct

9. **Balance Verification**
   - Confirms wallet balance equals initial - withdrawal amount

### Expected Test Output (Worker Withdrawal)

```
============================================================
🧪 E2E TEST: Worker Withdrawal Flow via Bank Transfer
============================================================

📋 Step 1: Verifying worker exists
   ✅ Worker found: John Doe

💰 Step 2: Getting worker wallet
   ✅ Wallet seeded to: Rp 200.000
   Current balance: Rp 200.000

🏦 Step 3: Verifying bank account
   ✅ Bank account found
   Bank: BCA
   Account Number: 1234567890
   Account Name: JOHN DOE

💵 Step 4: Validating withdrawal amount
   ✅ Amount valid
   Fee (1% min. Rp 5.000): Rp 5.000
   Net amount: Rp 95.000

📝 Step 5: Creating payout request
   ✅ Payout request created
   Payout Request ID: <uuid>
   Status: pending

💰 Step 6: Debiting worker wallet
   ✅ Wallet debited successfully
   Previous balance: Rp 200.000
   New balance: Rp 100.000

🔔 Step 7: Simulating successful payout webhook
   ✅ Payout status updated to 'completed'

🔍 Step 8: Verifying payout record
   ✅ Payout record verified

💰 Step 9: Verifying wallet balance after withdrawal
   ✅ Wallet balance verified

============================================================
✅ ALL TESTS PASSED
============================================================

📊 Test Summary:
   Worker ID: 123e4567-e89b-12d3-a456-426614174000
   Withdrawal amount: Rp 100.000
   Fee: Rp 5.000
   Net amount received: Rp 95.000
   Previous balance: Rp 200.000
   New balance: Rp 100.000
   Payout Request ID: <uuid>
   Bank: BCA - 1234567890
```

---

## Environment Variables Required

To run the E2E tests, ensure these environment variables are set:

```bash
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Xendit (for actual API calls, mocked in tests)
XENDIT_SECRET_KEY=your-secret-key
XENDIT_WEBHOOK_TOKEN=your-webhook-token
```

## NPM Scripts

Both tests are available as npm scripts:

```json
{
  "scripts": {
    "test:e2e:business-topup": "node --loader ts-node/esm scripts/test-e2e-business-topup.ts",
    "test:e2e:worker-withdrawal": "node --loader ts-node/esm scripts/test-e2e-worker-withdrawal.ts"
  }
}
```

## Notes

- The tests create real transactions/payouts in the database but simulate the Xendit API calls
- The webhook callbacks are simulated by directly updating the transaction/payout status
- For actual integration testing, you would need to:
  1. Set up Xendit sandbox credentials
  2. Deploy the Edge Functions to Supabase
  3. Configure Xendit webhook URLs to point to your deployed functions
  4. Make actual API calls to Xendit and receive real webhooks

## Quality Checklist

- ✅ Follows patterns from reference files
- ✅ No console.log debugging statements (proper logging used)
- ✅ Error handling in place
- ✅ Verification steps documented
- ✅ Changes committed with descriptive message
- ✅ Type-safe TypeScript implementations
- ✅ Comprehensive test coverage for both flows
