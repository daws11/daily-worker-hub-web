# E2E Dispatch System Tests

Test suite untuk verifikasi dispatch system — auto-assign, manual pick, worker online/offline, matching score, dan high-demand notification.

## Prerequisites

1. Supabase project running (staging)
2. Environment variables configured in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Migration `001_dispatch_system.sql` sudah di-apply
4. Install dependencies: `npm install`

## Test Files

| File | Description |
|------|-------------|
| `test-e2e-worker-toggle.ts` | Worker toggle online/offline, update location, heartbeat, auto-offline |
| `test-e2e-dispatch-flow.ts` | Auto-assign, accept/reject, timeout, exhausted, race condition, PP 35/2021 compliance |
| `test-e2e-manual-pick.ts` | Business manual pick worker, reject → pick another |
| `test-e2e-matching-score.ts` | Budget match scoring, category match scoring, total score calculation |
| `test-e2e-high-demand.ts` | High demand detection (4+ exhausted), no false positive (2 exhausted) |

## Running Tests

### Individual tests

```bash
# Worker toggle online/offline
npx tsx scripts/test-e2e-worker-toggle.ts

# Dispatch flow (full lifecycle)
npx tsx scripts/test-e2e-dispatch-flow.ts

# Manual pick flow
npx tsx scripts/test-e2e-manual-pick.ts

# Matching score calculation
npx tsx scripts/test-e2e-matching-score.ts

# High demand notification
npx tsx scripts/test-e2e-high-demand.ts
```

### All dispatch tests

```bash
for test in scripts/test-e2e-worker-toggle.ts scripts/test-e2e-dispatch-flow.ts scripts/test-e2e-manual-pick.ts scripts/test-e2e-matching-score.ts scripts/test-e2e-high-demand.ts; do
  echo "=== Running $test ==="
  npx tsx "$test"
  echo ""
done
```

### Using npm scripts (add to package.json)

```json
{
  "scripts": {
    "test:e2e:worker-toggle": "npx tsx scripts/test-e2e-worker-toggle.ts",
    "test:e2e:dispatch-flow": "npx tsx scripts/test-e2e-dispatch-flow.ts",
    "test:e2e:manual-pick": "npx tsx scripts/test-e2e-manual-pick.ts",
    "test:e2e:matching-score": "npx tsx scripts/test-e2e-matching-score.ts",
    "test:e2e:high-demand": "npx tsx scripts/test-e2e-high-demand.ts",
    "test:e2e:dispatch-all": "npm run test:e2e:worker-toggle && npm run test:e2e:dispatch-flow && npm run test:e2e:manual-pick && npm run test:e2e:matching-score && npm run test:e2e:high-demand"
  }
}
```

## Test Helpers

Shared helper functions are in `lib/test-helpers/dispatch-test-helpers.ts`:

| Function | Description |
|----------|-------------|
| `createTestWorker(supabase, overrides)` | Create test worker with auth user |
| `createTestBusiness(supabase, overrides)` | Create test business with auth user |
| `createTestJob(supabase, businessId, overrides)` | Create test job with dispatch fields |
| `setWorkerOnline(supabase, workerId, lat, lng)` | Set worker online with location |
| `setWorkerOffline(supabase, workerId)` | Set worker offline |
| `createTestDispatch(supabase, jobId, workerId, businessId, overrides)` | Create dispatch_queue entry |
| `createTestDispatchHistory(...)` | Create worker_dispatch_history entry |
| `createComplianceTracking(...)` | Create PP 35/2021 compliance record |
| `createComplianceWarning(...)` | Create compliance warning (for blocking) |
| `cleanupTestData(supabase, opts)` | Cleanup test data by IDs |
| `createTestSupabaseClient()` | Create Supabase client with service role |

## Expected Output

Each test outputs colored results:

```
============================================================
🧪 E2E TEST: Dispatch Flow
============================================================

📋 Test 1: Auto-assign dispatch
   ✅ Auto-assign dispatch verified
   Dispatch ID: abc-123
   Status: pending
   Worker: def-456

...

============================================================
📊 Test Results Summary
============================================================
   ✅ Test 1: Auto-assign dispatch: PASS
   ✅ Test 2: Worker accept dispatch: PASS
   ✅ Test 3: Worker reject dispatch: PASS
   ✅ Test 4: Dispatch timeout: PASS
   ✅ Test 5: All reject → exhausted: PASS
   ✅ Test 6: Race condition: PASS
   ✅ Test 7: PP 35/2021 compliance: PASS

   Total: 7 | Passed: 7 | Failed: 0
============================================================
```

## Exit Codes

- `0` — All tests passed
- `1` — One or more tests failed

## Test Data Cleanup

All tests are **self-contained** — they create their own test data and clean up after themselves (including deleting auth users). No manual cleanup needed.

## Notes

- Tests use Supabase service role key (bypasses RLS)
- Tests create real auth users — they are deleted during cleanup
- Matching score tests are pure logic tests (no DB interaction needed)
- Dispatch tables (`dispatch_queue`, `worker_dispatch_history`) use `any` cast since generated types haven't been updated yet
- Run against staging only — never against production
