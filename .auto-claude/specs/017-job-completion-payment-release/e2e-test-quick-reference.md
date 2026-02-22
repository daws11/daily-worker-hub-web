# Quick Reference: E2E Test Execution

## Running the E2E Test

### Method 1: Using the Helper Script (Recommended)

```bash
cd /path/to/project
./.auto-claude/specs/017-job-completion-payment-release/run-e2e-test.sh
```

Follow the menu prompts to:
1. Verify database schema (option 1)
2. List test data (option 2)
3. Create test booking (option 3)
4. Update booking to in_progress (option 4)
5. Verify after checkout (option 5)
6. Simulate payment release (option 6)
7. Check wallet state (option 7)
8. Check notifications (option 8)
9. Run full verification (option 9)
10. Cleanup test data (option 10)

### Method 2: Manual Execution via UI

Follow the full test plan in `e2e-test-plan-checkout-payment-flow.md`

### Method 3: Direct SQL Queries

Connect to database and run queries from the test plan document.

## Test Flow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PAYMENT FLOW E2E TEST                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CREATE BOOKING (status: accepted)                               │
│     │                                                               │
│     ▼                                                               │
│  2. BUSINESS STARTS JOB (status: in_progress)                       │
│     │                                                               │
│     ▼                                                               │
│  3. WORKER CHECKS OUT (via /dashboard/worker/jobs)                  │
│     │                                                               │
│     ├─→ Booking: status = 'completed'                              │
│     ├─→ Booking: payment_status = 'pending_review'                 │
│     ├─→ Booking: review_deadline = NOW() + 24h                     │
│     ├─→ Wallet: pending_balance += amount                          │
│     ├─→ Transaction: type='hold', status='pending_review'          │
│     └─→ Notifications sent to worker & business                     │
│     │                                                               │
│     ▼                                                               │
│  4. BUSINESS REVIEWS (via /dashboard/business/jobs)                │
│     │                                                               │
│     ├─→ Can see 24-hour countdown                                   │
│     ├─→ Can dispute during review period                           │
│     └─→ Review deadline displayed                                   │
│     │                                                               │
│     ▼                                                               │
│  5. WAIT 24 HOURS (or simulate via script)                          │
│     │                                                               │
│     ▼                                                               │
│  6. PAYMENT RELEASE (automatic or manual)                           │
│     │                                                               │
│     ├─→ Booking: payment_status = 'available'                      │
│     ├─→ Wallet: pending_balance -= amount                          │
│     ├─→ Wallet: available_balance += amount                        │
│     ├─→ Transaction: status='released'                             │
│     ├─→ New Transaction: type='release', status='released'        │
│     └─→ Notification sent to worker                                │
│     │                                                               │
│     ▼                                                               │
│  7. WORKER VERIFIES (via /dashboard/worker/wallet)                  │
│     │                                                               │
│     ├─→ Available balance increased                                 │
│     └─→ Transaction history shows both transactions                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Database Queries

### Check Booking State
```sql
SELECT id, status, payment_status, checkout_time, review_deadline,
       EXTRACT(EPOCH FROM (review_deadline - NOW())) / 3600 as hours_remaining
FROM bookings WHERE id = '<booking_id>';
```

### Check Wallet Balance
```sql
SELECT user_id, pending_balance, available_balance
FROM wallets WHERE user_id = '<worker_user_id>';
```

### Check Transactions
```sql
SELECT wt.type, wt.status, wt.amount, wt.description, wt.created_at
FROM wallet_transactions wt
JOIN wallets w ON wt.wallet_id = w.id
WHERE w.user_id = '<worker_user_id>' AND wt.booking_id = '<booking_id>'
ORDER BY wt.created_at;
```

### Check Notifications
```sql
SELECT title, body, link, created_at
FROM notifications
WHERE user_id = '<user_id>'
ORDER BY created_at DESC LIMIT 5;
```

## Expected Results at Each Stage

| Stage | Booking Status | Payment Status | Wallet Pending | Wallet Available |
|-------|---------------|----------------|----------------|------------------|
| Initial | accepted | NULL | 0 | 0 |
| Started | in_progress | NULL | 0 | 0 |
| Checked Out | completed | pending_review | +amount | 0 |
| Released | completed | available | 0 | +amount |

## Test Checklist

Use this quick checklist when running tests:

- [ ] Database schema verified
- [ ] Test booking created (status: accepted)
- [ ] Business starts job (status: in_progress)
- [ ] Worker checks out via UI
- [ ] Booking status = 'completed'
- [ ] Payment status = 'pending_review'
- [ ] Review deadline = 24h from checkout
- [ ] Wallet pending balance increased
- [ ] Hold transaction created
- [ ] Worker notification received
- [ ] Business notification received
- [ ] Review period expires/elapsed
- [ ] Payment released
- [ ] Booking payment_status = 'available'
- [ ] Wallet pending decreased, available increased
- [ ] Release transaction created
- [ ] Worker receives payment notification

## Troubleshooting

### Wallet not found
```sql
-- Ensure wallet exists for worker
SELECT * FROM wallets WHERE user_id = '<worker_user_id>';
-- If missing, create:
INSERT INTO wallets (user_id, pending_balance, available_balance)
VALUES ('<worker_user_id>', 0, 0);
```

### No notifications
```sql
-- Check if notifications table exists
SELECT * FROM notifications LIMIT 1;
-- Check for the user
SELECT * FROM notifications WHERE user_id = '<user_id>';
```

### Payment not releasing
```sql
-- Check if review deadline has passed
SELECT id, payment_status, review_deadline, NOW()
FROM bookings WHERE id = '<booking_id>';
-- Manually expire for testing:
UPDATE bookings SET review_deadline = NOW() - INTERVAL '1 hour'
WHERE id = '<booking_id>';
```

## Files Reference

- **Full Test Plan**: `e2e-test-plan-checkout-payment-flow.md`
- **Helper Script**: `run-e2e-test.sh`
- **Quick Reference**: This file
- **Implementation Plan**: `implementation_plan.json`
- **Build Progress**: `build-progress.txt`
