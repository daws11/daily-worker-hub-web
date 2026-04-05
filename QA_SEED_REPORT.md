# QA Seed Report — Daily Worker Hub Staging DB
**QA Engineer:** Riko Tanaka
**Date:** 2026-04-05
**Staging URL:** https://staging.dailyworkerhub.com
**DB:** Supabase (tqnlrqutnhxqbzfcmvpc)

---

## 1. Data Counts vs Expected

| Table | Expected | Actual | Status |
|-------|----------|--------|--------|
| users | 17 | 17 | ✅ PASS |
| businesses | 5 | 5 | ✅ PASS |
| workers | 11 | 11 | ✅ PASS |
| jobs | 19 | 19 | ✅ PASS |
| bookings | 11 | 11 | ✅ PASS |
| reviews | 5 | 5 | ✅ PASS |
| messages | 6 | 6 | ✅ PASS |
| notifications | 7 | 7 | ✅ PASS |
| wallets | - | 6 | ✅ (2 business + 4 worker) |
| skills | - | 17 | ✅ (varied hospitality skills) |
| worker_skills | - | 14 | ✅ (skill assignments) |

**User Role Breakdown:**
- Business users: 6 (business@test.com, business2–5@test.com, **admin@test.com**)
- Worker users: 11 (worker@test.com through worker11@test.com)
- Admin user: admin@test.com exists but has `role=business` instead of `role=admin`

**Job Status Breakdown:**
- open: 7
- completed: 7
- in_progress: 3
- cancelled: 1
- accepted: 1 (f0000001-0001-4000-8000-000000000020 — note: unusual status "accepted" — likely should be "in_progress")

**Booking Status Breakdown:**
- completed: 6
- in_progress: 3
- cancelled: 1
- accepted: 1

**Worker Tier Distribution:**
- elite: 4
- champion: 2
- pro: 2
- classic: 2

---

## 2. Foreign Key Integrity

| Relationship | Result |
|--------------|--------|
| Booking → Job (job_id) | ✅ All 11 bookings reference valid jobs |
| Booking → Worker (worker_id) | ✅ All 11 bookings reference valid workers |
| Booking → Business (business_id) | ✅ All 11 bookings reference valid businesses |
| Workers → Users (user_id) | ✅ All 11 workers have matching user records |
| Worker Skills → Workers | ✅ All 14 worker_skill records reference valid workers |
| Worker Skills → Skills | ✅ All 14 worker_skill records reference valid skills |
| Wallets → Businesses/Workers | ✅ 2 wallets for businesses, 4 for workers — correctly exclusive |
| Reviews → Bookings | ✅ All 5 reviews reference valid completed bookings |

**All FK checks PASSED — no orphaned references found.**

---

## 3. Orphaned Data Check

| Check | Result |
|-------|--------|
| Workers without user records | ✅ None — all 11 workers link to users |
| Jobs without businesses | ✅ None — all 19 jobs link to businesses |
| Bookings without jobs | ✅ None — all 11 bookings link to jobs |
| Messages with invalid sender/receiver | ✅ All sender/receiver IDs are valid user IDs |

---

## 4. Issues Found

### 🔴 Issue 1: admin@test.com has wrong role
- **Severity:** Medium
- **Description:** admin@test.com (id: c0000001-0001-4000-8000-000000000021) has `role=business` instead of `role=admin`
- **Impact:** Incorrect role-based access control — admin may not have proper permissions
- **Fix:** Update to `role=admin`

### 🟡 Issue 2: worker_skills table missing `id` column
- **Severity:** Low (schema inconsistency)
- **Description:** The worker_skills join table has no `id` primary key — only composite key (worker_id, skill_id) + created_at
- **Impact:** API queries using `select=*` may behave unexpectedly; RLS policies referencing `id` may fail
- **Note:** Not a data integrity issue, but may cause app bugs

### 🟡 Issue 3: notifications table missing `type` column
- **Severity:** Low (schema inconsistency)
- **Description:** Query with `type` column failed — notifications table schema doesn't include `type`
- **Impact:** App code expecting `notifications.type` will fail
- **Current notification columns:** id, user_id, title, body, link, is_read, created_at

### 🟡 Issue 4: Job status "accepted" is non-standard
- **Severity:** Low
- **Description:** Job f0000001-0001-4000-8000-000000000020 has `status=accepted` — not in the expected set (open, in_progress, completed, cancelled)
- **Impact:** Frontend may not handle this status gracefully
- **Recommendation:** Standardize statuses or update frontend to handle "accepted"

### 🟡 Issue 5: Only 6 wallets exist for 17 users
- **Severity:** Medium
- **Description:** Wallets exist only for 2 businesses and 4 workers — missing wallets for 3 businesses and 7 workers
- **Impact:** Users without wallets may not be able to receive payments or make bookings
- **Recommendation:** Seed wallets for all users

---

## 5. Recommendations

1. **Fix admin role** — Update admin@test.com role from `business` to `admin`
2. **Add missing wallets** — Create wallets for all remaining business and worker users
3. **Review job status enum** — Decide if "accepted" is valid or should be mapped to "in_progress"
4. **Align schema** — Add `id` to worker_skills if app code expects it; add `type` to notifications
5. **Add RLS policies** — Verify Row Level Security is properly configured on all tables
6. **Test the test accounts** — Log in as business@test.com and worker@test.com to verify auth works

---

## 6. Summary

**Overall: ⚠️ PASS with issues**

The seed data is largely correct — all table counts match, relationships are intact, and no orphaned records exist. However, 5 issues require attention before this data is production-ready, with the missing wallets and wrong admin role being the most critical.

---
*Report generated by Riko Tanaka, QA Engineer — Daily Worker Hub*
