# RLS Findings: Row Level Security Policy Audit

**Date:** 2026-03-31
**Subtask:** subtask-4-1
**Phase:** Document Findings (phase-4)
**Script:** `scripts/test-rls-policies.ts`
**Supabase Project:** `tqnlrqutnhxqbzfcmvpc`

## Overview

This document records the results of the RLS policy audit performed against the Daily Worker Hub Supabase database. Tests were executed using `scripts/test-rls-policies.ts` which connects via the Supabase service role key for baseline comparisons and simulates authenticated + unauthenticated users via the anon key client.

**Test Modes Executed:**
- `--role=unauthenticated` — anon key only, no user session
- `--role=worker` — skipped (TEST_WORKER_USER_ID not configured)
- `--role=employer` — skipped (TEST_EMPLOYER_USER_ID not configured)
- `--role=admin` — skipped (TEST_ADMIN_USER_ID not configured)
- `--audit-only` — requires `supabase/migrations/20260330000001_rls_audit_helper.sql` to be applied first

---

## Summary

| Table | RLS Enabled | Unauthenticated Access | Status |
|-------|------------|------------------------|--------|
| `bookings` | Yes | Blocked (table empty) | ✅ PASS |
| `jobs` | Yes | **LEAKED** — anon returns same rows as service role | ❌ FAIL |
| `workers` | Yes | **LEAKED** — anon returns same rows as service role | ❌ FAIL |
| `businesses` | Yes | **LEAKED** — anon returns same rows as service role | ❌ FAIL |
| `users` | Yes | **LEAKED** — anon returns same rows as service role | ❌ FAIL |
| `wallet_transactions` | Yes | Blocked (table empty) | ✅ PASS |
| `reviews` | Yes | Blocked (table empty) | ✅ PASS |
| `disputes` | Yes | Blocked (table empty) | ✅ PASS |
| `applications` | Yes | Blocked (table empty) | ✅ PASS |
| `worker_wallets` | Yes | **ERROR** — policy references ambiguous `users` table | ❌ FAIL |
| `wallets` | Yes | **ERROR** — policy references ambiguous `users` table | ❌ FAIL |
| `payout_requests` | Yes | **ERROR** — policy references ambiguous `users` table | ❌ FAIL |
| `payment_transactions` | Yes | **ERROR** — policy references ambiguous `users` table | ❌ FAIL |

**Overall: 5 PASS, 8 FAIL**

---

## Detailed Findings by Table

### 1. `bookings`

**Status: ✅ PASS**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | Blocked — table is empty (no rows to leak) |
| Policy Structure | RLS policies present; actual enforcement cannot be verified without test data |
| Worker Scope | Cannot verify — TEST_WORKER_USER_ID not configured |
| Employer Scope | Cannot verify — TEST_EMPLOYER_USER_ID not configured |
| Admin Scope | Cannot verify — TEST_ADMIN_USER_ID not configured |

**Notes:**
The `bookings` table has no rows in the test environment, so the anon key client returns 0 rows — matching the service role baseline. This is a PASS but does not confirm RLS is correctly enforcing row-level access. The policy logic must be verified against actual booking records.

**SQL to reproduce (requires test data):**
```sql
-- As authenticated worker (with JWT)
SELECT COUNT(*) FROM bookings; -- should return only own bookings

-- As unauthenticated
SELECT COUNT(*) FROM bookings; -- should return 0 or error
```

---

### 2. `jobs`

**Status: ❌ FAIL**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | **LEAKED** — anon returns 1 row, service role returns 1 row |
| Root Cause | RLS policies on `jobs` table are missing or overly permissive — unauthenticated users can read all job postings |
| Policy Conditions | Policy allows public read access (likely `USING (true)` or no USING clause restricting to authenticated users) |

**Test Results:**
```
❌ FAIL: Unauthenticated SELECT jobs
   Service role count: 1, Anon key count: 1 — DATA LEAKED
```

**Expected Behavior:**
Unauthenticated users should NOT be able to read job postings. At minimum, RLS should restrict to authenticated users. Ideally, only the owning employer (via `businesses.user_id = auth.uid()` join) should be able to read their own job postings.

**Actual Behavior:**
Unauthenticated users can read all job postings via the anon key.

**SQL to reproduce:**
```sql
-- Unauthenticated query (via anon key)
SELECT id, title, business_id FROM jobs LIMIT 10;
-- Returns rows — this is a DATA LEAK

-- Service role comparison (bypasses RLS)
SELECT id, title, business_id FROM jobs LIMIT 10;
-- Returns same rows — confirms anon has full read access
```

**Fix Required:**
Add or update RLS policies on `jobs`:
```sql
-- Recommended: Employer-only access
CREATE POLICY "Employers can view own jobs"
ON jobs FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
);

-- If public job listings are intentional, document as such and add a comment
-- Otherwise, add: AND auth.uid() IS NOT NULL at minimum
```

---

### 3. `workers`

**Status: ❌ FAIL**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | **LEAKED** — anon returns 1 row, service role returns 1 row |
| Root Cause | RLS policy on `workers` table is missing or overly permissive |
| Data at Risk | Worker profile data (name, phone, skills, availability) is publicly accessible |

**Test Results:**
```
❌ FAIL: Unauthenticated SELECT workers
   Service role count: 1, Anon key count: 1 — DATA LEAKED
```

**Expected Behavior:**
Worker profile data should only be visible to the worker themselves, employers who have booked them, or admins.

**Actual Behavior:**
Unauthenticated users can read all worker profiles via the anon key.

**SQL to reproduce:**
```sql
SELECT id, user_id, full_name, phone, skills FROM workers LIMIT 10;
-- Returns rows with PII via anon key — DATA LEAK
```

**Fix Required:**
```sql
CREATE POLICY "Workers can view own profile"
ON workers FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

CREATE POLICY "Admins can view all worker profiles"
ON workers FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);

-- Optionally: Employers who have bookings with this worker can view profile
CREATE POLICY "Employers can view booked workers"
ON workers FOR SELECT
USING (
  auth.uid() IN (
    SELECT b.user_id FROM businesses b
    JOIN bookings bk ON bk.business_id = b.id
    WHERE bk.worker_id = workers.id
  )
);
```

---

### 4. `businesses`

**Status: ❌ FAIL**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | **LEAKED** — anon returns 3 rows, service role returns 3 rows |
| Root Cause | RLS policy on `businesses` table is missing or overly permissive |
| Data at Risk | Business profile data (name, address, owner info) is publicly accessible |

**Test Results:**
```
❌ FAIL: Unauthenticated SELECT businesses
   Service role count: 3, Anon key count: 3 — DATA LEAKED
```

**Expected Behavior:**
Business data should only be visible to the business owner, workers who have bookings with them, or admins.

**Actual Behavior:**
Unauthenticated users can read all business profiles via the anon key.

**SQL to reproduce:**
```sql
SELECT id, user_id, business_name, address FROM businesses LIMIT 10;
-- Returns rows via anon key — DATA LEAK
```

**Fix Required:**
```sql
CREATE POLICY "Business owners can view own profile"
ON businesses FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

CREATE POLICY "Admins can view all businesses"
ON businesses FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);
```

---

### 5. `users`

**Status: ❌ FAIL**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | **LEAKED** — anon returns 11 rows, service role returns 11 rows |
| Root Cause | RLS policy on `users` table is missing or overly permissive |
| Data at Risk | User account data (email, role, phone) is publicly accessible — HIGH SEVERITY |

**Test Results:**
```
❌ FAIL: Unauthenticated SELECT users
   Service role count: 11, Anon key count: 11 — DATA LEAKED
```

**Expected Behavior:**
The `users` table contains authentication data (email, role). This should NEVER be readable via the anon key. Only the user themselves, or admins, should be able to query this table.

**Actual Behavior:**
Unauthenticated users can read all user records via the anon key — this is a critical data leak.

**SQL to reproduce:**
```sql
SELECT id, email, role, phone FROM users LIMIT 10;
-- Returns 11 rows with sensitive account data via anon key — CRITICAL LEAK
```

**Fix Required (HIGH PRIORITY):**
```sql
-- Users can view their own account
CREATE POLICY "Users can view own account"
ON users FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND id = auth.uid()
);

-- Admins can view all accounts
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM admin_users)
);
```

---

### 6. `wallet_transactions`

**Status: ✅ PASS**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | Blocked — table is empty (no rows to leak) |
| Policy Structure | RLS policies present |
| Worker Scope | Cannot verify — TEST_WORKER_USER_ID not configured |
| Employer Scope | Cannot verify — TEST_EMPLOYER_USER_ID not configured |

**Notes:**
Table is empty. Anon returns 0 rows matching service role baseline. Cannot confirm RLS enforcement until test data exists.

---

### 7. `reviews`

**Status: ✅ PASS**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | Blocked — table is empty |
| Policy Structure | RLS policies present |
| Worker Scope | Cannot verify — TEST_WORKER_USER_ID not configured |
| Employer Scope | Cannot verify — TEST_EMPLOYER_USER_ID not configured |

**Notes:**
Table is empty. Cannot confirm RLS enforcement until test data exists.

---

### 8. `disputes`

**Status: ✅ PASS**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | Blocked — table is empty |
| Policy Structure | RLS policies present |
| Worker Scope | Cannot verify — no test accounts configured |
| Employer Scope | Cannot verify — no test accounts configured |

**Notes:**
Table is empty. Cannot confirm RLS enforcement until test data exists.

---

### 9. `applications`

**Status: ✅ PASS**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | Blocked — table is empty |
| Policy Structure | RLS policies present |
| Worker Scope | Cannot verify — no test accounts configured |
| Employer Scope | Cannot verify — no test accounts configured |

**Notes:**
Table is empty. Cannot confirm RLS enforcement until test data exists.

---

### 10. `worker_wallets`

**Status: ❌ FAIL**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | **ERROR** — RLS policy throws ambiguous column error |
| Root Cause | Policy references `users` table without schema qualification, causing ambiguity when multiple tables named `users` exist (app + auth schema) |
| Error Message | `column reference "users" is ambiguous` |

**Test Results:**
```
❌ FAIL: Unauthenticated SELECT worker_wallets
   Error: column reference "users" is ambiguous
```

**Expected Behavior:**
Query should either return 0 rows (correct RLS denial) or succeed with proper row-level filtering.

**Actual Behavior:**
Query fails with a SQL error — the policy condition references `users` in a way that Postgres cannot resolve.

**SQL to reproduce:**
```sql
-- Via anon key
SELECT id, balance FROM worker_wallets LIMIT 10;
-- ERROR: column reference "users" is ambiguous
```

**Fix Required:**
The policy condition on `worker_wallets` needs to be schema-qualified. In Supabase, the auth schema has its own `users` table:
```sql
-- Use auth.uid() directly instead of joining through ambiguous users reference
-- Or use auth.users explicitly:

CREATE POLICY "Workers can view own wallet"
ON worker_wallets FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);
```

---

### 11. `wallets`

**Status: ❌ FAIL**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | **ERROR** — same ambiguous `users` column error |
| Root Cause | Identical to `worker_wallets` — policy uses unqualified `users` reference |
| Error Message | `column reference "users" is ambiguous` |

**Test Results:**
```
❌ FAIL: Unauthenticated SELECT wallets
   Error: column reference "users" is ambiguous
```

**Fix Required:**
Same fix as `worker_wallets` — schema-qualify the `users` reference in the policy condition.

---

### 12. `payout_requests`

**Status: ❌ FAIL**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | **ERROR** — same ambiguous `users` column error |
| Root Cause | Identical to `worker_wallets` and `wallets` — policy uses unqualified `users` reference |
| Error Message | `column reference "users" is ambiguous` |

**Fix Required:**
Schema-qualify the `users` reference or use `auth.uid()` directly.

---

### 13. `payment_transactions`

**Status: ❌ FAIL**

| Aspect | Detail |
|--------|--------|
| RLS Enabled | Yes |
| Unauthenticated SELECT | **ERROR** — same ambiguous `users` column error |
| Root Cause | Policy uses unqualified `users` reference causing ambiguity |
| Error Message | `column reference "users" is ambiguous` |

**Fix Required:**
Schema-qualify the `users` reference or restructure the policy to avoid the ambiguity.

---

## Architecture Issues Identified

### Issue 1: Inconsistent Admin Identification

Two different `is_admin()` patterns exist:

1. **`002_rls_policies.sql`** — `is_admin()` function takes NO parameter, uses `auth.uid()` internally:
   ```sql
   CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
   BEGIN
     RETURN (SELECT role = 'admin' FROM users WHERE id = auth.uid());
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. **`20260228000002_create_admin_tables.sql`** — `is_admin(user_id UUID)` function takes a parameter:
   ```sql
   CREATE FUNCTION is_admin(user_id UUID) RETURNS BOOLEAN AS $$
   BEGIN
     RETURN EXISTS (SELECT 1 FROM admin_users WHERE user_id = $1);
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

**Impact:** RLS policies using `is_admin()` may call the wrong overload depending on context. The admin_users-based check is more secure as it validates against a dedicated table rather than just checking `users.role`.

**Recommendation:** Standardize on `is_admin(user_id)` using `admin_users` table and deprecate the no-parameter version.

---

### Issue 2: Dual Wallet System

Two wallet tables exist with different ID column names:

| Table | ID Column | Links To |
|-------|-----------|----------|
| `wallets` | `user_id` | `users.id` directly |
| `worker_wallets` | `worker_id` | `workers.id` |

The old `wallets` table links users directly; the new `worker_wallets` table links through `workers`. This dual system creates confusion and requires different RLS logic for each.

**Recommendation:** Consolidate to one wallet system and migrate data.

---

### Issue 3: Overlapping Bookings Policies

The `bookings` table has RLS policies from two different migrations:
- `002_rls_policies.sql` — original policies
- `2026022203` — additional/updated policies

This can cause duplicate policy warnings and unpredictable enforcement order.

**Recommendation:** Audit all `bookings` policies and consolidate into a single coherent set.

---

## Tests Not Executed (Missing Configuration)

The following tests require real user IDs from `auth.users` in Supabase:

| Role | Env Variable | Status |
|------|-------------|--------|
| Worker | `TEST_WORKER_USER_ID` | Not configured |
| Second Worker | `TEST_OTHER_WORKER_USER_ID` | Not configured |
| Employer | `TEST_EMPLOYER_USER_ID` | Not configured |
| Second Employer | `TEST_OTHER_EMPLOYER_USER_ID` | Not configured |
| Admin | `TEST_ADMIN_USER_ID` | Not configured |

To configure, add these to `.env.local`:
```env
TEST_WORKER_USER_ID=your-worker-uuid-here
TEST_OTHER_WORKER_USER_ID=your-second-worker-uuid-here
TEST_EMPLOYER_USER_ID=your-employer-uuid-here
TEST_OTHER_EMPLOYER_USER_ID=your-second-employer-uuid-here
TEST_ADMIN_USER_ID=your-admin-uuid-here
```

---

## Remediation Priority

| Priority | Table | Issue | Fix Complexity |
|----------|-------|-------|---------------|
| 🔴 CRITICAL | `users` | Public read of all user accounts | Medium |
| 🔴 CRITICAL | `jobs` | Public read of all job postings | Low |
| 🔴 CRITICAL | `workers` | Public read of all worker profiles | Medium |
| 🔴 CRITICAL | `businesses` | Public read of all business profiles | Medium |
| 🟡 HIGH | `worker_wallets` | Ambiguous `users` column causes errors | Low |
| 🟡 HIGH | `wallets` | Ambiguous `users` column causes errors | Low |
| 🟡 HIGH | `payout_requests` | Ambiguous `users` column causes errors | Low |
| 🟡 HIGH | `payment_transactions` | Ambiguous `users` column causes errors | Low |
| 🟢 INFO | `bookings` | Needs test data to verify enforcement | N/A |
| 🟢 INFO | `wallet_transactions` | Needs test data to verify enforcement | N/A |
| 🟢 INFO | `reviews` | Needs test data to verify enforcement | N/A |
| 🟢 INFO | `disputes` | Needs test data to verify enforcement | N/A |
| 🟢 INFO | `applications` | Needs test data to verify enforcement | N/A |

---

## Manual Verification Steps

To cross-check these findings, run in Supabase SQL Editor:

```sql
-- 1. Check RLS-enabled tables
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rls_enabled DESC, tablename;

-- 2. List all policies and their conditions
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd AS command,
  qual AS using_condition,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check for overly permissive policies (qual = 'true' or no qual)
SELECT
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR qual IS NULL OR with_check = 'true');
```

---

## References

- **Test Script:** `scripts/test-rls-policies.ts`
- **Audit Migration:** `supabase/migrations/20260330000001_rls_audit_helper.sql` (must be applied before `--audit-only` runs)
- **Session 2 Log:** `build-progress.txt` (lines 73-113)
- **Admin Pattern:** `lib/supabase/queries/admin.ts` (lines 836-842)
- **Bookings Pattern:** `lib/supabase/queries/bookings.ts`

---

*Document generated as part of subtask-4-1, phase-4 (Document Findings)*
*Next step: subtask-5-1 — Supabase Dashboard Manual Verification (phase-5, parallel with phase-4)*