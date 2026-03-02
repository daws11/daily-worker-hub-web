# 21 Days Rule Compliance Implementation

## Overview

Implementation of PP 35/2021 compliance for Daily Worker Hub, which limits daily workers to 21 days per month for the same business.

## What Was Implemented

### 1. Database Schema Updates

**File:** `supabase/migrations/20260227_add_compliance_warnings.sql`

- **Created `compliance_warnings` table** to track 21-day violations per worker-business pair
  - Fields: `worker_id`, `business_id`, `month`, `days_worked`, `warning_level`, `acknowledged`, `created_at`, `updated_at`
  - Warning levels: `none` (0-15 days), `warning` (16-20 days), `blocked` (21+ days)
  - Unique constraint on (business_id, worker_id, month)
  - Row Level Security (RLS) policies for workers, businesses, and admins
  - Triggers to auto-update warnings when booking status changes

**Existing:** `compliance_tracking` table (already exists)
- Tracks days worked per worker-business pair per month
- Updated automatically via database triggers

### 2. Compliance Logic (lib/algorithms)

**File:** `lib/algorithms/compliance-checker.ts`

**Functions:**
- `checkCompliance()` - Check if a worker can be booked based on days worked
- `batchCheckCompliance()` - Check multiple workers at once
- `getCompliantAlternativeWorkers()` - Get alternative workers who haven't reached the limit
- `checkWorkerCanApply()` - Check if a worker can apply for a job

**Warning Levels:**
- 0-15 days: `none` (can book, no banner)
- 16-18 days: `warning` (yellow banner, can still book)
- 19-20 days: `warning` (orange banner, can still book)
- 21+ days: `blocked` (red banner, cannot hire)

**Banner Types:**
- `success` - 0-15 days (compliant)
- `warning-yellow` - 16-18 days (approaching limit)
- `warning-orange` - 19-20 days (strong warning)
- `error` - 21+ days (violation)

### 3. TypeScript Types

**File:** `lib/supabase/types-compliance.ts`

**Types:**
- `ComplianceWarningsRow`, `ComplianceWarningsInsert`, `ComplianceWarningsUpdate`
- `ComplianceTrackingRow`
- `ComplianceStatus`, `WarningLevel`, `BannerType`
- `ComplianceStatusResult`, `ComplianceCheckResult`
- `AlternativeWorker`, `ComplianceCheckActionResult`
- `ComplianceWarningWithWorker`, `ComplianceWarningWithBusiness`, `ComplianceWarningFull`
- `BusinessComplianceSummary`, `WorkerComplianceSummary`

### 4. Compliance Queries

**Updated:** `lib/supabase/queries/compliance.ts`

**Added Functions:**
- `getBusinessComplianceWarnings()` - Get warnings for a business in a month
- `getWorkerComplianceWarnings()` - Get warnings for a worker in a month
- `getBusinessComplianceSummary()` - Get summary with counts
- `acknowledgeComplianceWarning()` - Mark warning as acknowledged
- `getUnacknowledgedWarnings()` - Get unacknowledged warnings for dashboard

**Updated Types:**
- `WarningLevel` changed from `'none' | 'approaching' | 'limit'` to `'none' | 'warning' | 'blocked'`

### 5. Server Actions Integration

**Updated:** `lib/actions/bookings.ts`

**Added Functions:**
- `createBooking()` - Create booking with compliance check
- `acceptBooking()` - Accept booking with compliance check
- `rejectBooking()` - Reject a booking

**Updated:** `lib/actions/job-applications.ts`

**Updated Functions:**
- `applyForJob()` - Worker applies for job with compliance check
  - Checks PP 35/2021 compliance (21-day limit) BEFORE allowing application
  - Blocks workers who have already worked 21+ days for the business this month
- `acceptApplication()` - Business accepts application with compliance check
  - Checks PP 35/2021 compliance (21-day limit) BEFORE accepting
  - Blocks accepting workers who have reached the limit

### 6. UI Components

**Existing Components (No changes needed):**
- `components/booking/compliance-warning-banner.tsx` - Warning banner for businesses
- `components/booking/compliance-status-badge.tsx` - Status indicator badge
- `components/booking/alternative-workers-suggestion.tsx` - Alternative worker suggestions

## Integration Points

### Business Dashboard
- Show compliance warnings for workers approaching or at the limit
- Display `compliance-warning-banner` when showing worker applications
- Show `compliance-status-badge` next to worker cards
- Offer `alternative-workers-suggestion` when workers are blocked

### Worker Dashboard
- Show remaining days with each business
- Display compliance warnings when applying to jobs
- Block application buttons if 21-day limit reached

### Job Application Flow
**File:** `lib/actions/job-applications.ts`
- Worker applies → `applyForJob()` checks compliance
- Business accepts → `acceptApplication()` checks compliance
- Auto-suggest alternative workers when blocked

### Booking Creation Flow
**File:** `lib/actions/bookings.ts`
- Create booking → `createBooking()` checks compliance
- Accept booking → `acceptBooking()` checks compliance
- Show compliance banner when accepting worker

## How It Works

### 1. Compliance Check Flow

```
Worker applies for job
    ↓
applyForJob() called
    ↓
checkComplianceBeforeAccept() checks days worked
    ↓
Query compliance_tracking table
    ↓
Calculate days worked in current month
    ↓
Return compliance status:
  - 0-15 days: OK (can apply)
  - 16-20 days: Warning (can apply, show warning)
  - 21+ days: Blocked (cannot apply)
```

### 2. Automatic Tracking

When a booking status changes to `accepted` or `completed`:
1. Database trigger `on_booking_status_change_for_compliance` fires
2. Updates `compliance_tracking` table with new days_worked count
3. Database trigger `on_booking_status_change_for_warnings` fires
4. Updates `compliance_warnings` table with warning level

### 3. Warning Levels

| Days Worked | Status | Warning Level | Banner Color | Can Book? |
|-------------|--------|---------------|--------------|-----------|
| 0-15 | ok | none | Green/None | ✅ Yes |
| 16-18 | warning | warning | Yellow | ✅ Yes |
| 19-20 | warning | warning | Orange | ✅ Yes |
| 21+ | blocked | blocked | Red | ❌ No |

## Database Triggers

### Existing Triggers (from compliance_tracking migration)
- `on_booking_status_change_for_compliance` - Updates compliance_tracking table

### New Triggers (from compliance_warnings migration)
- `on_booking_status_change_for_warnings` - Updates compliance_warnings table
- `set_compliance_warnings_updated_at` - Updates timestamp on record update

## Security

### RLS Policies

**compliance_warnings table:**
- Workers can view their own warnings
- Businesses can view and acknowledge their warnings
- Admins have full access for auditing

**compliance_tracking table:**
- Workers can view their own tracking records
- Businesses can view their tracking records
- Admins have full access

## Usage Examples

### Check compliance before accepting a worker

```typescript
import { checkComplianceBeforeAccept } from '@/lib/actions/compliance'

const result = await checkComplianceBeforeAccept(workerId, businessId)

if (!result.canAccept) {
  // Show error or alternative workers
  console.error(result.data?.message)
  // Show alternative workers suggestion
}
```

### Get alternative workers

```typescript
import { getCompliantAlternativeWorkers } from '@/lib/algorithms/compliance-checker'

const alternatives = await getCompliantAlternativeWorkers(
  businessId,
  undefined, // current month
  [blockedWorkerId], // exclude blocked worker
  10 // limit to 10 workers
)

// alternatives is sorted by days worked (fewest first)
```

### Get compliance warnings for dashboard

```typescript
import { getUnacknowledgedWarnings } from '@/lib/supabase/queries/compliance'

const { data: warnings } = await getUnacknowledgedWarnings(businessId)

// Display warnings on business dashboard
```

## Files Created/Modified

### Created:
- `supabase/migrations/20260227_add_compliance_warnings.sql`
- `lib/algorithms/compliance-checker.ts`
- `lib/supabase/types-compliance.ts`
- `docs/21-days-rule-compliance-implementation.md` (this file)

### Modified:
- `lib/supabase/queries/compliance.ts` - Added warning queries
- `lib/actions/bookings.ts` - Added compliance checks
- `lib/actions/job-applications.ts` - Added compliance checks to apply/accept functions

### No Changes Needed (Already Implemented):
- `components/booking/compliance-warning-banner.tsx`
- `components/booking/compliance-status-badge.tsx`
- `components/booking/alternative-workers-suggestion.tsx`

## Testing Checklist

- [ ] Run migration: `20260227_add_compliance_warnings.sql`
- [ ] Test worker application with 15 days worked (should allow)
- [ ] Test worker application with 16 days worked (should allow with warning)
- [ ] Test worker application with 19 days worked (should allow with strong warning)
- [ ] Test worker application with 21 days worked (should block)
- [ ] Test business acceptance with compliance check
- [ ] Verify compliance_warnings table is updated automatically
- [ ] Test alternative workers suggestion
- [ ] Test warning acknowledgment
- [ ] Verify RLS policies work correctly

## Compliance with PP 35/2021

Per Indonesian labor law PP 35/2021:
- Daily workers are limited to 21 days per month per business
- System automatically tracks days worked per worker-business pair
- Workers are blocked from applying after reaching 21 days
- Businesses are warned when workers approach the limit
- Alternative workers are suggested when workers are blocked

## Next Steps

1. **UI Integration:**
   - Add compliance check UI to worker job application flow
   - Add compliance warnings to business dashboard
   - Show compliance status in worker profile
   - Integrate alternative workers suggestion in booking forms

2. **Testing:**
   - Test all compliance scenarios
   - Verify database triggers work correctly
   - Test RLS policies
   - Performance testing for compliance queries

3. **Monitoring:**
   - Set up alerts for 21-day violations
   - Track compliance metrics
   - Monitor database trigger performance

4. **Documentation:**
   - Add user-facing documentation
   - Update API docs with compliance info
   - Create admin guide for compliance management
