# End-to-End Test Plan: Worker Checkout → Business Review → Payment Release

## Test Overview

**Test ID:** subtask-6-2
**Test Type:** Manual End-to-End Testing
**Priority:** High
**Dependencies:**
- Database migrations completed
- Wallet system implemented
- Checkout flow implemented
- Payment release system implemented

## Pre-Test Setup

### 1. Database Preparation

Before starting the test, ensure the following database state:

```sql
-- 1. Verify wallet tables exist
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('wallets', 'wallet_transactions', 'disputes');

-- 2. Verify booking completion fields exist
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'bookings'
  AND column_name IN ('checkout_time', 'payment_status', 'review_deadline');

-- 3. Check existing test data
SELECT id, title FROM jobs LIMIT 5;
SELECT id, full_name FROM workers LIMIT 5;
SELECT id, name FROM businesses LIMIT 5;
```

### 2. Test Account Requirements

You will need:
- 1 Worker account with associated user_id
- 1 Business account with associated user_id
- 1 Job posting created by the business

### 3. Environment Variables

Ensure the following are set:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

## Test Scenarios

### Scenario 1: Full Payment Flow (Happy Path)

**Objective:** Verify complete payment flow from worker checkout to auto-release

#### Step 1: Create Test Booking (Database Setup)

```sql
-- Get IDs for test accounts (replace with actual IDs)
-- Set these variables for your test:
-- :worker_id, :business_id, :job_id

-- Create a booking with 'accepted' status
INSERT INTO bookings (
  worker_id,
  business_id,
  job_id,
  status,
  start_date,
  end_date,
  final_price,
  created_at
) VALUES (
  '<worker_id>',
  '<business_id>',
  '<job_id>',
  'accepted',
  NOW(),
  NOW() + INTERVAL '1 day',
  500000,
  NOW()
) RETURNING id;
```

**Verification:**
- [ ] Booking created with status 'accepted'
- [ ] Booking has valid worker_id, business_id, and job_id

#### Step 2: Business Starts Job

Via database or business UI (when available):

```sql
-- Update booking to in_progress
UPDATE bookings
SET status = 'in_progress',
    updated_at = NOW()
WHERE id = '<booking_id>'
RETURNING id, status;
```

**Verification:**
- [ ] Booking status changes to 'in_progress'
- [ ] Worker can see the booking in their dashboard

#### Step 3: Worker Checks Out

Via Worker UI:
1. Navigate to `/dashboard/worker/jobs`
2. Find the booking with status "Sedang Berjalan"
3. Click the "Checkout" button
4. Verify the checkout dialog appears with:
   - Job title and description
   - Payment amount (e.g., Rp 500.000)
   - Work period dates
   - 24-hour review period notice
5. Click "Checkout Sekarang"

**Database Verification after Checkout:**

```sql
-- Verify booking status
SELECT
  id,
  status,
  checkout_time,
  payment_status,
  review_deadline,
  EXTRACT(EPOCH FROM (review_deadline - NOW())) / 3600 as hours_until_deadline
FROM bookings
WHERE id = '<booking_id>';

-- Expected results:
-- status = 'completed'
-- checkout_time = <timestamp within last few minutes>
-- payment_status = 'pending_review'
-- review_deadline = ~24 hours from checkout_time
-- hours_until_deadline ≈ 24
```

**Verification:**
- [ ] Booking status becomes 'completed'
- [ ] checkout_time is set to current timestamp
- [ ] payment_status is 'pending_review'
- [ ] review_deadline is 24 hours from now
- [ ] Toast notification appears: "Pekerjaan berhasil selesai!"

#### Step 4: Verify Wallet Transaction Created

```sql
-- Verify wallet transaction
SELECT
  wt.id,
  wt.amount,
  wt.type,
  wt.status,
  wt.description,
  w.pending_balance,
  w.available_balance
FROM wallet_transactions wt
JOIN wallets w ON wt.wallet_id = w.id
WHERE wt.booking_id = '<booking_id>'
  AND w.user_id = '<worker_user_id>'
ORDER BY wt.created_at DESC
LIMIT 1;

-- Expected results:
-- amount = 500000 (or the final_price)
-- type = 'hold'
-- status = 'pending_review'
-- pending_balance increased by payment amount
-- available_balance unchanged
```

**Verification:**
- [ ] Wallet transaction created with type 'hold'
- [ ] Transaction status is 'pending_review'
- [ ] Worker's pending_balance increased by payment amount
- [ ] Worker's available_balance unchanged

#### Step 5: Verify Notifications Sent

```sql
-- Check worker notification
SELECT id, title, body, link, created_at
FROM notifications
WHERE user_id = '<worker_user_id>'
  AND title = 'Checkout Berhasil'
ORDER BY created_at DESC
LIMIT 1;

-- Check business notification
SELECT id, title, body, link, created_at
FROM notifications
WHERE user_id = '<business_user_id>'
  AND title = 'Pekerjaan Selesai'
ORDER BY created_at DESC
LIMIT 1;
```

**Verification:**
- [ ] Worker receives "Checkout Berhasil" notification
- [ ] Notification body mentions job title and 24-hour review period
- [ ] Notification link points to `/dashboard/worker/jobs`
- [ ] Business receives "Pekerjaan Selesai" notification
- [ ] Business notification mentions review deadline
- [ ] Business notification link points to `/dashboard/business/jobs`

#### Step 6: Business Views Review Period

Via Business UI (when implemented) or via database:

```sql
-- View completed bookings with review countdown
SELECT
  b.id,
  j.title,
  b.status,
  b.payment_status,
  b.checkout_time,
  b.review_deadline,
  EXTRACT(EPOCH FROM (b.review_deadline - NOW())) / 3600 as hours_remaining,
  CASE
    WHEN NOW() < b.review_deadline THEN 'In Review Period'
    ELSE 'Review Period Expired'
  END as review_status
FROM bookings b
JOIN jobs j ON b.job_id = j.id
WHERE b.business_id = '<business_id>'
  AND b.status = 'completed'
  AND b.payment_status = 'pending_review'
ORDER BY b.checkout_time DESC;
```

**Verification:**
- [ ] Business can see completed booking
- [ ] Payment status shows as "pending_review"
- [ ] Review countdown shows remaining time (≈24 hours initially)
- [ ] Dispute button is available (when UI is implemented)

#### Step 7: Wait for Review Period or Simulate Expiry

**Option A: Wait 24 hours** (not recommended for testing)

**Option B: Simulate expiry by updating deadline:**

```sql
-- Set review_deadline to past for testing
UPDATE bookings
SET review_deadline = NOW() - INTERVAL '1 hour'
WHERE id = '<booking_id>'
RETURNING id, review_deadline;
```

**Verification:**
- [ ] review_deadline is now in the past

#### Step 8: Trigger Payment Release

Via API endpoint (when cron job is implemented) or manually:

```sql
-- This simulates what the releaseDuePaymentsAction does
-- First, verify the booking is ready for release
SELECT
  id,
  payment_status,
  review_deadline,
  NOW() as current_time,
  CASE
    WHEN review_deadline < NOW() THEN 'Ready for release'
    ELSE 'Not ready'
  END as release_status
FROM bookings
WHERE id = '<booking_id>';
```

**Verification:**
- [ ] Query shows "Ready for release"

#### Step 9: Run Payment Release

Via database or call the `releaseDuePaymentsAction`:

```sql
-- Manual release (for testing)
-- Step 1: Update booking payment status
UPDATE bookings
SET payment_status = 'available',
    updated_at = NOW()
WHERE id = '<booking_id>'
AND payment_status = 'pending_review'
AND review_deadline < NOW();

-- Step 2: Update wallet balances
UPDATE wallets
SET
  pending_balance = pending_balance - 500000,
  available_balance = available_balance + 500000,
  updated_at = NOW()
WHERE user_id = '<worker_user_id>';

-- Step 3: Update transaction status
UPDATE wallet_transactions
SET status = 'released'
WHERE booking_id = '<booking_id>'
  AND type = 'hold'
  AND status = 'pending_review';

-- Step 4: Create release transaction
INSERT INTO wallet_transactions (
  wallet_id,
  booking_id,
  amount,
  type,
  status,
  description,
  metadata,
  created_at
)
SELECT
  w.id,
  '<booking_id>',
  500000,
  'release',
  'released',
  'Pembayaran tersedia untuk penarikan',
  '{}',
  NOW()
FROM wallets w
WHERE w.user_id = '<worker_user_id>';
```

**Verification:**
- [ ] Booking payment_status becomes 'available'
- [ ] Worker pending_balance decreased by payment amount
- [ ] Worker available_balance increased by payment amount
- [ ] Original 'hold' transaction status is 'released'
- [ ] New 'release' transaction created

#### Step 10: Verify Payment Release Notification

```sql
-- Check worker notification
SELECT id, title, body, link, created_at
FROM notifications
WHERE user_id = '<worker_user_id>'
  AND title = 'Pembayaran Tersedia'
ORDER BY created_at DESC
LIMIT 1;
```

**Verification:**
- [ ] Worker receives "Pembayaran Tersedia" notification
- [ ] Notification body mentions the payment amount (e.g., "Rp 500.000")
- [ ] Notification link points to `/dashboard/worker/wallet`

#### Step 11: Verify Worker Wallet UI

Navigate to `/dashboard/worker/wallet`:

**Verification:**
- [ ] Wallet balance card shows:
  - "Dalam Proses" (pending) amount
  - "Tersedia" (available) amount increased
- [ ] Transaction history shows:
  - Original 'hold' transaction with 'pending_review' → 'released' status
  - New 'release' transaction with 'released' status
  - Both transactions reference the same booking

### Scenario 2: Payment Release Before Review Period (Negative Test)

**Objective:** Verify payment cannot be released before review deadline

#### Steps:

1. Create a booking and check out (as in Scenario 1, Steps 1-3)
2. Try to release payment immediately (before review_deadline)

```sql
-- Attempt to release payment before deadline
-- This should fail
SELECT
  id,
  payment_status,
  review_deadline,
  NOW() as current_time,
  review_deadline > NOW() as should_fail
FROM bookings
WHERE id = '<booking_id>';
```

**Verification:**
- [ ] Payment release is blocked when review_deadline > NOW()
- [ ] Error message: "Batas waktu review belum tercapai"

### Scenario 3: Multiple Workers Batch Release

**Objective:** Verify batch payment release works correctly

#### Steps:

1. Create 3 bookings with different workers
2. Check out all bookings
3. Set all review_deadline to past
4. Run batch release

```sql
-- Check all pending payments
SELECT
  b.id,
  w.user_id as worker_id,
  j.title,
  b.review_deadline,
  CASE
    WHEN b.review_deadline < NOW() THEN 'Ready'
    ELSE 'Waiting'
  END as status
FROM bookings b
JOIN jobs j ON b.job_id = j.id
JOIN workers w ON b.worker_id = w.id
WHERE b.payment_status = 'pending_review'
ORDER BY b.review_deadline;
```

**Verification:**
- [ ] All eligible payments are released
- [ ] Each worker's wallet is updated correctly
- [ ] Each worker receives notification
- [ ] Failed payments (if any) are logged

## Test Results Summary

### Test Case Checklist

| Test Case | Status | Notes |
|-----------|--------|-------|
| Scenario 1: Full Payment Flow | [ ] | |
| Scenario 2: Early Release Prevention | [ ] | |
| Scenario 3: Batch Release | [ ] | |

### Database State Verification

After all tests, verify final state:

```sql
-- Summary of all wallet transactions
SELECT
  wt.type,
  wt.status,
  COUNT(*) as count,
  SUM(wt.amount) as total_amount
FROM wallet_transactions wt
JOIN wallets w ON wt.wallet_id = w.id
WHERE w.user_id IN ('<worker_user_id>', '<worker_user_id_2>', '<worker_user_id_3>')
GROUP BY wt.type, wt.status
ORDER BY wt.type, wt.status;

-- Final wallet balances
SELECT
  w.user_id,
  w.pending_balance,
  w.available_balance,
  (w.pending_balance + w.available_balance) as total_balance
FROM wallets w
WHERE w.user_id IN ('<worker_user_id>', '<worker_user_id_2>', '<worker_user_id_3>');

-- Booking statuses
SELECT
  status,
  payment_status,
  COUNT(*) as count
FROM bookings
WHERE id IN ('<booking_id_1>', '<booking_id_2>', '<booking_id_3>')
GROUP BY status, payment_status;
```

## Cleanup Test Data

After testing completes:

```sql
-- Clean up test transactions (optional, for re-testing)
DELETE FROM wallet_transactions WHERE booking_id IN ('<booking_id_1>', '<booking_id_2>');

-- Reset wallet balances (optional)
UPDATE wallets
SET
  pending_balance = 0,
  available_balance = 0
WHERE user_id IN ('<worker_user_id>');

-- Clean up test bookings
DELETE FROM bookings WHERE id IN ('<booking_id_1>', '<booking_id_2>');

-- Clean up test notifications
DELETE FROM notifications
WHERE user_id IN ('<worker_user_id>', '<business_user_id>')
  AND created_at > NOW() - INTERVAL '1 day';
```

## Known Limitations

1. **Business Jobs UI**: The business jobs page (`/dashboard/business/jobs`) is currently a placeholder. Testing of the business view of completed bookings requires direct database queries.

2. **Cron Job**: The automatic payment release cron job is not yet implemented. Manual triggering via `releaseDuePaymentsAction` or database updates is required.

3. **Dispute Flow**: Subtask 6-3 covers dispute testing separately.

## Test Execution Log

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________

| Step | Status | Issues Found | Resolution |
|------|--------|--------------|------------|
| 1. Database Setup | [ ] Pass / [ ] Fail | | |
| 2. Business Starts Job | [ ] Pass / [ ] Fail | | |
| 3. Worker Checkout | [ ] Pass / [ ] Fail | | |
| 4. Wallet Transaction | [ ] Pass / [ ] Fail | | |
| 5. Notifications | [ ] Pass / [ ] Fail | | |
| 6. Review Period Display | [ ] Pass / [ ] Fail | | |
| 7. Payment Release | [ ] Pass / [ ] Fail | | |
| 8. Post-Release State | [ ] Pass / [ ] Fail | | |

**Overall Result:** [ ] PASS / [ ] FAIL

**Notes:**

___________________________________________________________________________

___________________________________________________________________________

___________________________________________________________________________
