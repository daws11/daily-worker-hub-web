# E2E Verification Summary: Business Top-Up Flow via QRIS

**Date:** 2026-02-22
**Subtask:** subtask-8-2
**Phase:** Integration and Testing

## Changes Made

### 1. Fixed Payment Webhook Wallet Lookup
**File:** `supabase/functions/payment-webhook/index.ts`

**Problem:** The payment webhook was trying to look up a wallet using `wallet_id` field that doesn't exist in the `payment_transactions` table. The table only has `business_id`.

**Solution:** Modified the webhook to:
1. Removed `wallet_id` from the select query
2. Changed wallet lookup to use `business_id` instead
3. Get the wallet by querying `wallets` table where `business_id = transaction.business_id`

**Before:**
```typescript
.select('id, business_id, amount, status, wallet_id')
...
if (newStatus === 'success' && transaction.wallet_id) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('id', transaction.wallet_id)
```

**After:**
```typescript
.select('id, business_id, amount, status')
...
if (newStatus === 'success') {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('business_id', transaction.business_id)
```

### 2. Fixed Minimum Top-Up Amount
**File:** `app/app/(dashboard)/business/wallet/page.tsx`

**Problem:** The minimum top-up amount was set to Rp 50.000 instead of Rp 500.000 as specified in the requirements.

**Solution:** Updated all instances of `50000` to `500000`:
- Line 119: `if (amount < 500000) return` (fee calculation threshold)
- Line 147: `if (isNaN(amount) || amount < 500000)` (validation)
- Line 148: `toast.error("Minimal top-up Rp 500.000")` (error message)
- Line 305: Description text "minimal Rp 500.000"
- Line 318: `min={500000}` (input min attribute)
- Line 323: Help text "Minimal: Rp 500.000 | Maksimal: Rp 100.000.000"
- Line 348: Disabled condition `Number(topUpAmount) < 500000`

### 3. Created E2E Test Scripts

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

**Example:**
```bash
./scripts/test-e2e-business-topup.sh 123e4567-e89b-12d3-a456-426614174000 500000
```

## Verification Steps

The E2E test verifies the following flow:

1. **Business Authentication** (simulated by using business_id)
   - Verifies business exists in database

2. **Wallet Display**
   - Gets or creates business wallet
   - Displays current balance (initially 0)

3. **QRIS Payment Form Validation**
   - Validates amount >= Rp 500.000
   - Calculates fee (0.7% + Rp 500)
   - Creates payment transaction

4. **Payment Creation**
   - Creates transaction with pending status
   - Generates payment URL
   - Sets QRIS expiry time (60 minutes)

5. **Webhook Simulation**
   - Simulates Xendit payment success callback
   - Updates transaction status to 'success'
   - Records payment timestamp

6. **Wallet Balance Update**
   - Credits business wallet with payment amount
   - Verifies balance increased correctly

7. **Transaction Record Verification**
   - Confirms transaction status is 'success'
   - Verifies paid_at timestamp is set

8. **Balance Verification**
   - Confirms wallet balance equals initial + top-up amount

## Environment Variables Required

To run the E2E test, ensure these environment variables are set:

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

## Expected Test Output

```
============================================================
🧪 E2E TEST: Business Top-Up Flow via QRIS
============================================================

📋 Step 1: Verifying business exists
   ✅ Business found: Test Business

💰 Step 2: Getting business wallet
   ✅ Wallet found
   Current balance: Rp 0

💵 Step 3: Validating top-up amount
   ✅ Amount valid
   Fee (0.7% + Rp 500): Rp 4.000
   Total amount: Rp 504.000

📝 Step 4: Creating payment transaction
   ✅ Transaction created
   Transaction ID: <uuid>

🔔 Step 5: Simulating successful payment webhook
   ✅ Transaction status updated to 'success'

💰 Step 6: Crediting business wallet
   ✅ Wallet credited successfully
   Previous balance: Rp 0
   New balance: Rp 504.000

🔍 Step 7: Verifying transaction record
   ✅ Transaction record verified

💰 Step 8: Verifying wallet balance
   ✅ Wallet balance verified

============================================================
✅ ALL TESTS PASSED
============================================================
```

## Notes

- The test creates a real transaction in the database but simulates the Xendit API call
- The webhook callback is simulated by directly updating the transaction status
- For actual integration testing, you would need to:
  1. Set up Xendit sandbox credentials
  2. Deploy the Edge Function to Supabase
  3. Configure Xendit webhook URL to point to your deployed function
  4. Make actual API calls to Xendit and receive real webhooks

## Quality Checklist

- ✅ Follows patterns from reference files
- ✅ No console.log debugging statements (proper logging used)
- ✅ Error handling in place
- ✅ Verification steps documented
- ✅ Changes committed with descriptive message
