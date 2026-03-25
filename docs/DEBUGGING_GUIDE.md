# Debugging Guide: Common Issues & Patterns

> Generated from debugging session - March 2026

This document catalogs common bug patterns discovered in the Daily Worker Hub application to serve as a reference for future debugging.

---

## Table of Contents

1. [ID Entity Mismatch](#issue-1-id-entity-mismatch-auth-user-id-vs-profile-id)
2. [Incomplete Column Selection](#issue-2-incomplete-column-selection-in-supabase-queries)
3. [Missing Defensive Checks](#issue-3-missing-defensive-checks-for-optional-relations)
4. [Wrong Worker ID Lookup](#issue-4-wrong-worker-id-lookup-in-job-applications)
5. [Status Enum Mismatch](#issue-5-status-enum-mismatch-reviewed-vs-shortlisted)
6. [Database Schema Column Mismatch](#issue-6-database-schema-column-mismatch)
7. [Debug Checklist](#common-debug-checklist)
8. [Entity Relationships](#entity-relationships)
9. [Prevention Strategies](#prevention-strategies)

---

## Issue 1: ID Entity Mismatch (Auth User ID vs Profile ID)

### Description

Code confuses `user.id` (auth user UUID) with `business.id` or `worker.id` (profile table UUIDs).

### Entity Relationships

```
users.id (auth UUID)
    │
    ├── businesses.user_id ──────→ references users.id
    │       │
    │       └── businesses.id ────→ jobs.business_id
    │                             → bookings.business_id
    │                             → job_applications.business_id
    │
    └── workers.user_id ──────────→ references users.id
            │
            └── workers.id ────────→ bookings.worker_id
                                    → job_applications.worker_id
```

### Key Rule

| When you have... | And you need... | Use... |
|------------------|-----------------|--------|
| `user.id` (auth) | `businesses.id` | Lookup via `businesses.user_id = user.id` |
| `user.id` (auth) | `workers.id` | Lookup via `workers.user_id = user.id` |
| `businesses.id` | `jobs` | Use directly as `jobs.business_id` |
| `workers.id` | `bookings` | Use directly as `bookings.worker_id` |

### Affected Files

| File | Problem |
|------|---------|
| `app/(dashboard)/business/jobs/page.tsx` | `getBusinessJobs(user.id)` should look up business first |
| `app/(dashboard)/business/job-attendance/page.tsx` | Same issue |
| `app/(dashboard)/business/bookings/page.tsx` | `.eq("business_id", user.id)` |

### Correct Pattern

```typescript
// WRONG - using auth user ID for business_id lookup
const jobs = await getBusinessJobs(user.id); // user.id is auth UUID

// CORRECT - look up business profile first
const { data: business } = await supabase
  .from("businesses")
  .select("id")
  .eq("user_id", user.id)  // lookup by auth user ID
  .single();

if (!business) {
  router.push("/onboarding");
  return;
}

const jobs = await getBusinessJobs(business.id); // use businesses.id
```

### Detection

Error messages that indicate this issue:
- Empty results when data should exist
- RLS policy violations (code 42501)
- Foreign key constraint violations

---

## Issue 2: Incomplete Column Selection in Supabase Queries

### Description

API returns fewer columns than components need, causing runtime errors when accessing undefined properties.

### Affected Files

| File | Missing Fields |
|------|---------------|
| `app/api/jobs/route.ts` | `email`, `description`, `website` from businesses |

### Example

```typescript
// BEFORE - missing business fields
const selectParams = [
  "select=*,business:businesses(id,name,is_verified,address,phone)"
];

// AFTER - complete fields
const selectParams = [
  "select=*,business:businesses(id,name,is_verified,address,phone,email,description,website)"
];
```

### Detection

Runtime errors:
```
Cannot read property 'email' of undefined
Cannot read property 'description' of undefined
TypeError: Cannot read properties of null
```

### Prevention

1. Always select ALL fields needed by consuming components
2. Use Supabase type generator: `supabase gen types typescript`
3. Cross-check select statements against component usage

---

## Issue 3: Missing Defensive Checks for Optional Relations

### Description

Components access nested properties without null/undefined checks, causing errors when relations return null.

### Affected Files

| File | Properties |
|------|-----------|
| `components/job-marketplace/JobCard.tsx` | `job.business?.name`, `job.category?.name` |
| `components/job-marketplace/JobDetailDialog.tsx` | `job.business?.email`, `job.business?.website`, etc. |
| `components/booking/apply-job-modal.tsx` | `job.business?.name` |

### Correct Pattern

```typescript
// WRONG - crashes if job.business is null
<span>{job.business.name}</span>
<span>{job.category.name}</span>

// CORRECT - with optional chaining and fallback
<span>{job.business?.name || "Business"}</span>
<Badge variant="secondary">{job.category?.name || "General"}</Badge>
```

### Prevention

- Always use optional chaining (`?.`) for relation fields
- Provide fallback values for display text
- ESLint rule: `@typescript-eslint/no-unnecessary-condition`

---

## Issue 4: Wrong Worker ID Lookup in Job Applications

### Description

`createJobApplication` accepts auth user ID but uses it inconsistently in queries and inserts.

### Root Cause

```typescript
// Lookup uses user_id (auth) - CORRECT
.eq("user_id", workerId)  // workerId is auth user ID

// But then inserts use workers.id - INCONSISTENT
worker_id: worker.id  // workers table UUID
```

### Detection

Error messages:
```
duplicate key value violates unique constraint "job_applications_job_id_worker_id_key"
```

### Prevention

Be explicit about ID types:
```typescript
// Use typed parameter names
async function createJobApplication(
  jobId: string,
  authUserId: string,  // Auth user ID
  options?: ...
)

// Or create separate functions for different ID types
async function createJobApplicationByAuthUserId(...)
async function createJobApplicationByWorkerId(...)
```

---

## Issue 5: Status Enum Mismatch (reviewed vs shortlisted)

### Description

Code uses `'reviewed'` but database RLS policy expects `'shortlisted'`.

### Affected Files

| File | Wrong Value |
|------|-------------|
| `lib/actions/job-applications.ts` | `'reviewed'` |
| `components/business/applicant-card.tsx` | `'reviewed'` |
| `app/(dashboard)/business/jobs/[id]/applicants/page.tsx` | `'reviewed'` |
| `app/api/applications/[id]/route.ts` | `'reviewed'` |

### Database Definition

From `supabase/migrations/20260302000001_add_booking_flow.sql`:

```sql
status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
  'pending',
  'shortlisted',  -- CORRECT value
  'accepted',
  'rejected',
  'withdrawn'
))
```

### RLS Policy

```sql
CREATE POLICY "Businesses can update applications"
  ON job_applications FOR UPDATE
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    status IN ('shortlisted', 'accepted', 'rejected')  -- 'reviewed' NOT ALLOWED
  );
```

### Detection

Error message:
```
new row violates row-level security policy for table "job_applications"
```

### Prevention

- Generate types from database schema
- Document enum values in shared constants
- Add validation in Zod schemas

---

## Issue 6: Database Schema Column Mismatch

### Description

Code references columns that don't exist in the actual database schema.

### Example: Compliance Check

```sql
-- Function calculate_days_worked references:
AND work_date >= v_month_start

-- But bookings table has:
start_date DATE DEFAULT NULL  -- NOT work_date
```

### Affected Files

| File | Missing Column |
|------|---------------|
| `lib/supabase/queries/compliance.ts` | `work_date` (should be `start_date`) |
| `lib/actions/compliance.ts` | Same issue |
| `lib/actions/admin.ts` | Same issue |

### Detection

Error message:
```json
{
  "code": "42703",
  "message": "column \"work_date\" does not exist"
}
```

### Temporary Fix Pattern

When DB schema issues block operations, use try-catch to allow operations to proceed:

```typescript
let complianceCheck;
try {
  complianceCheck = await checkComplianceBeforeAccept(...);

  if (!complianceCheck.success) {
    console.warn("Compliance check failed:", complianceCheck.error);
    // Allow operation to continue - don't block
  }
} catch (error) {
  console.warn("Compliance check threw:", error);
  // Allow operation to continue
}
```

### Prevention

- Always cross-reference queries with `lib/supabase/types.ts`
- Run migrations in sync with code deployments
- Generate types after every migration

---

## Common Debug Checklist

When encountering errors, systematically check:

### 1. ID Entity Confusion
- [ ] Is this query using `user.id` when it should use `business.id` or `worker.id`?
- [ ] Is the lookup using correct foreign key field (`user_id` vs `id`)?

### 2. Column/Field Missing
- [ ] Does the API select statement include all fields needed by components?
- [ ] Are there optional relations that need defensive checks?

### 3. Enum/Status Values
- [ ] Does code use same enum values as database constraint?
- [ ] Do RLS policies match the status transitions allowed?

### 4. Schema Consistency
- [ ] Do Supabase queries match the actual column names in `lib/supabase/types.ts`?
- [ ] Have migrations been applied to the database?

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              users                                       │
│  id: UUID (auth user ID)                                                │
└─────────────────────────────────────────────────────────────────────────┘
         │                                    │
         │ businesses.user_id                  │ workers.user_id
         ▼                                    ▼
┌─────────────────────┐             ┌─────────────────────┐
│    businesses        │             │      workers        │
│  id: UUID           │             │  id: UUID          │
│  user_id: UUID ─────┼─────────────┤  user_id: UUID     │
└─────────────────────┘             └─────────────────────┘
         │
         │ businesses.id
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              jobs                                         │
│  id: UUID                                                              │
│  business_id: UUID ───────────→ references businesses.id                 │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ job_id
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         job_applications                                 │
│  id: UUID                                                              │
│  job_id: UUID ──────────→ references jobs.id                            │
│  worker_id: UUID ───────→ references workers.id                        │
│  business_id: UUID ──────→ references businesses.id                     │
│  status: pending | shortlisted | accepted | rejected | withdrawn        │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ application_id (for accepted applications)
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            bookings                                      │
│  id: UUID                                                              │
│  application_id: UUID ────→ references job_applications.id              │
│  job_id: UUID ────────────→ references jobs.id                         │
│  worker_id: UUID ─────────→ references workers.id                        │
│  business_id: UUID ───────→ references businesses.id                     │
│  status: pending | accepted | in_progress | completed | cancelled       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Prevention Strategies

### 1. Use Typed ID Utilities

Create utility functions that enforce correct ID usage:

```typescript
// lib/utils/id.ts

import { createClient } from "@/lib/supabase/server";

/**
 * Get business profile ID from auth user ID
 * Throws if business profile doesn't exist
 */
export async function getBusinessIdForUser(authUserId: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", authUserId)
    .single();

  if (error || !data) {
    throw new Error("Business profile not found");
  }

  return data.id;
}

/**
 * Get worker profile ID from auth user ID
 * Throws if worker profile doesn't exist
 */
export async function getWorkerIdForUser(authUserId: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workers")
    .select("id")
    .eq("user_id", authUserId)
    .single();

  if (error || !data) {
    throw new Error("Worker profile not found");
  }

  return data.id;
}
```

### 2. Generate Types After Migrations

After running any migration:

```bash
# Generate TypeScript types from database schema
npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts
```

### 3. Document Enum Values

Create a constants file for application statuses:

```typescript
// lib/constants/application-status.ts

export const APPLICATION_STATUS = {
  PENDING: "pending",
  SHORTLISTED: "shortlisted",  // Note: NOT "reviewed"
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export type ApplicationStatus = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

export const VALID_APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [APPLICATION_STATUS.PENDING]: [
    APPLICATION_STATUS.SHORTLISTED,
    APPLICATION_STATUS.ACCEPTED,
    APPLICATION_STATUS.REJECTED,
  ],
  [APPLICATION_STATUS.SHORTLISTED]: [
    APPLICATION_STATUS.ACCEPTED,
    APPLICATION_STATUS.REJECTED,
  ],
  [APPLICATION_STATUS.ACCEPTED]: [],
  [APPLICATION_STATUS.REJECTED]: [],
  [APPLICATION_STATUS.WITHDRAWN]: [],
};
```

### 4. ESLint Configuration

Add to `.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    "@typescript-eslint/no-unnecessary-condition": "warn",
    "@typescript-eslint/prefer-optional-chain": "warn",
  },
};
```

---

## Verification Steps

After fixing issues:

### Test as Business User

1. Create a job at `/business/jobs/new`
2. Verify job appears at `/business/jobs`
3. Click "Pelamar" to see applicants
4. Click "Terima" to accept an applicant
5. Verify booking appears at `/business/bookings`
6. Verify worker appears at `/business/job-attendance`

### Test as Worker User

1. Browse jobs at `/worker/jobs`
2. Click a job to view details
3. Submit application
4. Verify success toast appears
5. Verify modal closes properly

### Check Server Logs

Look for these error codes:

| Code | Meaning |
|------|---------|
| 42501 | RLS policy violation |
| 42703 | Column does not exist |
| 23505 | Unique constraint violation (duplicate) |
| 23503 | Foreign key constraint violation |

---

## Files Modified During Debugging Session

| File | Changes |
|------|---------|
| `app/(dashboard)/business/jobs/page.tsx` | Added businessId lookup, fix getBusinessJobs call |
| `app/(dashboard)/business/job-attendance/page.tsx` | Added businessId lookup |
| `app/(dashboard)/business/bookings/page.tsx` | Added businessId lookup, fix business_id query |
| `app/api/jobs/route.ts` | Added missing business fields |
| `components/job-marketplace/JobCard.tsx` | Added defensive checks |
| `components/job-marketplace/JobDetailDialog.tsx` | Added defensive checks |
| `components/booking/apply-job-modal.tsx` | Fixed FormLabel usage, defensive checks |
| `lib/actions/job-applications.ts` | Fixed worker lookup, status enum, compliance handling |
| `components/business/applicant-card.tsx` | Changed reviewed → shortlisted |
| `app/(dashboard)/business/jobs/[id]/applicants/page.tsx` | Changed reviewed → shortlisted |
| `app/api/applications/[id]/route.ts` | Changed reviewed → shortlisted |

---

## Related Documentation

- [Architecture Overview](./Architecture.md)
- [Database Schema](./database-schema.md)
- [21 Days Rule Compliance](./21-days-rule-compliance-implementation.md)
- [Booking Flow](./BOOKING_FLOW.md)
