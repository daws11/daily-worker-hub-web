# E2E Performance Tests - Dispatch System

Dokumentasi untuk menjalankan dan troubleshooting performance tests pada sistem dispatch.

## 📋 Prerequisites

1. **Environment Variables** - Pastikan `.env.local` memiliki:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Database Tables** - Pastikan tabel berikut sudah ada:
   - `dispatch_queue`
   - `worker_dispatch_history`
   - `workers` (dengan kolom dispatch: `is_online`, `current_lat`, dll)
   - `jobs` (dengan kolom dispatch: `dispatch_mode`, `dispatch_status`, dll)
   - `businesses`
   - `bookings`

## 🚀 Running the Tests

### Run All Performance Tests
```bash
cd /home/deploy/.openclaw/workspace/daily-worker-hub-web
npx tsx scripts/test-e2e-performance-dispatch.ts
```

### Run Individual Tests

Test 1: Concurrent Dispatch Creation
```bash
npx tsx scripts/test-e2e-performance-dispatch.ts --test=concurrent-dispatch
```

Test 2: Concurrent Accept (Race Condition)
```bash
npx tsx scripts/test-e2e-performance-dispatch.ts --test=concurrent-accept
```

Test 3: Timeout Cascade
```bash
npx tsx scripts/test-e2e-performance-dispatch.ts --test=timeout-cascade
```

## 📊 Test Cases

### Test 1: Concurrent Dispatch Creation
**Objective:** Verify system handles concurrent dispatch creation without duplicates.

**Steps:**
1. Create 10 test workers
2. Create 10 test jobs
3. Create dispatch records for all worker-job combinations (100 dispatches)
4. Verify no duplicate records

**Expected Result:**
- All 100 dispatch records created successfully
- No duplicate `id` values
- Database records match created records

### Test 2: Concurrent Accept (Race Condition)
**Objective:** Verify race condition handling when 2 workers accept same dispatch.

**Steps:**
1. Create 2 workers and 1 job
2. Create 2 dispatch records for same job
3. Simulate concurrent accept by both workers
4. Verify only 1 dispatch is accepted, other is cancelled

**Expected Result:**
- Only 1 dispatch marked as `accepted`
- Other dispatch marked as `cancelled`
- Only 1 booking created
- Job status updated to `in_progress`

### Test 3: Timeout Cascade
**Objective:** Verify all timeouts are processed correctly and job marked as exhausted.

**Steps:**
1. Create 5 workers
2. Create 1 job with short timeout (1 second)
3. Create 5 dispatch records with already-expired timestamps
4. Process timeouts
5. Verify all dispatches marked as `timed_out`
6. Verify job `dispatch_status` changed to `exhausted`

**Expected Result:**
- All 5 dispatches status = `timed_out`
- Job `dispatch_status` = `exhausted`
- No pending dispatches remain

## 📁 Related Files

| File | Description |
|------|-------------|
| `scripts/test-e2e-performance-dispatch.ts` | Main test runner |
| `lib/test-helpers/dispatch-test-helpers.ts` | Helper functions for creating test data |
| `app/api/analytics/dispatch/route.ts` | Dispatch analytics API |
| `components/business/dispatch-analytics.tsx` | Analytics dashboard component |
| `app/(dashboard)/business/dispatch-analytics/page.tsx` | Analytics page |

## 🔧 Troubleshooting

### Common Issues

#### 1. "Missing Supabase configuration"
```bash
Error: Missing Supabase configuration. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

**Solution:**
- Check `.env.local` exists in project root
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (not just anon key)
- Restart the test script

#### 2. "Failed to create test user"
```bash
Error: Failed to create test user: Email address already registered
```

**Solution:**
- Wait a few seconds before re-running (email uniqueness)
- Or cleanup test users in Supabase dashboard

#### 3. "dispatch_queue not found"
```bash
Error: Failed to create test dispatch: relation "dispatch_queue" does not exist
```

**Solution:**
- Run the dispatch system migration:
  ```bash
  psql $DATABASE_URL -f supabase/migrations/001_dispatch_system.sql
  ```
- Or create tables manually via Supabase dashboard

#### 4. Test timeout / hanging
```bash
Test timeout after 30 seconds
```

**Solution:**
- Check network connectivity to Supabase
- Verify Supabase project is not paused
- Increase timeout in test script if needed

#### 5. "Failed to set worker online"
```bash
Error: Failed to set worker online: column "is_online" does not exist
```

**Solution:**
- Verify the dispatch migration was applied
- Check `workers` table has required columns:
  - `is_online`
  - `current_lat`
  - `current_lng`
  - `online_since`
  - `auto_offline_at`

## 📈 Running Analytics API

### Manual API Test

```bash
# Get business ID first
BUSINESS_ID="your-business-id"

# Call analytics API
curl -X GET "http://localhost:3000/api/analytics/dispatch?businessId=${BUSINESS_ID}&period=7d" \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>"
```

### Expected Response
```json
{
  "totalDispatches": 150,
  "totalAccepted": 120,
  "totalRejected": 20,
  "totalTimedOut": 10,
  "acceptanceRate": 80.0,
  "avgResponseTimeSeconds": 45,
  "avgDispatchesPerJob": 3.0,
  "jobsFulfilled": 45,
  "jobsExhausted": 5,
  "onlineWorkerCount": 25,
  "topWorkers": [
    {
      "workerId": "uuid-1",
      "name": "Worker Name",
      "acceptanceRate": 95.0,
      "avgResponseTime": 30,
      "totalDispatches": 50
    }
  ]
}
```

## 🎯 Performance Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Acceptance Rate | > 70% | < 50% |
| Avg Response Time | < 60s | > 120s |
| Timeout Rate | < 15% | > 25% |
| Jobs Exhausted | < 10% | > 20% |
| Concurrent Dispatch Creation | < 500ms | > 2000ms |

## 🔗 Additional Resources

- [Dispatch System Architecture](./docs/dispatch-architecture.md)
- [Worker Matching Algorithm](./docs/matching-algorithm.md)
- [PP 35/2021 Compliance](./docs/compliance.md)