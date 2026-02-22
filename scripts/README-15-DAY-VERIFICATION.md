# PP 35/2021 Compliance Verification: Warning at 15 Days

## Overview

This verification script tests that compliance warnings appear correctly when a worker has worked 15 days for the same business in a month.

## Expected Behavior at 15 Days

- **Compliance Status**: `"warning"` (not `"blocked"`)
- **ComplianceWarningBanner**: Visible with yellow/amber warning styles
- **Accept Button**: ENABLED (only disabled at 21 days when status is `"blocked"`)
- **Message**: "Approaching PP 35/2021 Limit (15/21 days)"

## Prerequisites

1. Supabase instance running (local or remote)
2. Database migrations applied (compliance_tracking table exists)
3. Environment variables set (optional, defaults to local Supabase)

## Running the Verification

### Option 1: Using npx tsx (Recommended)

```bash
npx tsx scripts/verify-15-day-warning.ts
```

### Option 2: Using ts-node

```bash
npx ts-node scripts/verify-15-day-warning.ts
```

### Option 3: Compile and run

```bash
npx tsc scripts/verify-15-day-warning.ts --outDir ./dist
node dist/scripts/verify-15-day-warning.js
```

## Environment Variables

The script uses these environment variables (with defaults for local Supabase):

- `DATABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL (default: `http://127.0.0.1:54321`)
- `SUPABASE_SERVICE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase API key

## What the Script Does

1. **Creates test data**: Business, worker, and job records
2. **Creates 15 accepted bookings** for the worker-business pair in the current month
3. **Verifies compliance_tracking** table shows exactly 15 days worked
4. **Verifies calculate_days_worked** function returns 15
5. **Verifies getComplianceStatus** logic returns "warning" status (not "blocked")
6. **Documents UI expectations** for manual browser verification

## Expected Output

```
=== PP 35/2021 Compliance Warning Verification (15 Days) ===

STEP 1: Creating test data...
✓ Created test business, worker, and job

STEP 2: Creating 15 accepted bookings...
✓ Created 15 accepted bookings

STEP 3: Verifying compliance_tracking table...
✓ Compliance tracking record found
  - Days worked: 15
✓ Days worked count is correct (15 days)

STEP 4: Verifying calculate_days_worked function...
✓ calculate_days_worked returns 15

STEP 5: Verifying compliance status logic...
✓ Compliance status: "warning"
  - Warning level: "approaching"
  - Message: "Warning: Worker has worked 15 days this month. Approaching PP 35/2021 limit of 21 days."

STEP 6: Verifying UI component expectations...
Expected UI behavior:
  1. ComplianceWarningBanner:
     - Should render: YES (status !== 'ok')
     - Status: "warning"
     - Styles: border-amber-200 bg-amber-50 (yellow/amber warning)
     - Title: "Approaching PP 35/2021 Limit (15/21 days)"
     - Subtext: "6 days remaining before limit."

  2. BookingActions accept button:
     - Disabled: NO (isComplianceBlocked = status === "blocked" = false)
     - User can still click accept: YES

  3. ComplianceStatusBadge:
     - Status: "warning"
     - Shows days worked: 15

=== VERIFICATION SUCCESSFUL ===
...
```

## Manual Browser Verification

After the automated verification passes, complete the verification by checking the UI:

1. Start the dev server: `npm run dev`
2. Navigate to: http://localhost:3000/dashboard/business/jobs
3. Find the test job or create a new job application for the test worker
4. Verify a **yellow/amber warning banner** is displayed
5. Verify the banner shows **"Approaching PP 35/2021 Limit (15/21 days)"**
6. Verify the **accept button is still enabled** (clickable)
7. Verify the **compliance badge shows warning status**

## Troubleshooting

### "Failed to create business/worker" error

Make sure your Supabase instance is running and accessible:
- Local: `supabase status`
- Remote: Check your `DATABASE_URL` and API keys

### "No compliance tracking record found" error

This means the database trigger is not firing. Check:
1. Does the `compliance_tracking` table exist? Run: `\d compliance_tracking`
2. Is the trigger set up on the `bookings` table?
3. Check Supabase logs for trigger errors

### "calculate_days_worked returned X, expected 15"

The trigger might be counting incorrectly. Check:
1. The booking statuses (should be 'accepted', not 'pending')
2. The booking dates (should be in the current month)
3. The trigger logic in the migration file

## Related Files

- `lib/supabase/queries/compliance.ts` - Compliance query functions
- `components/booking/compliance-warning-banner.tsx` - Warning banner component
- `components/booking/booking-actions.tsx` - Accept/reject buttons with compliance check
- `components/applicant-list.tsx` - List of applicants with compliance status
- `supabase/migrations/20260222_add_compliance_tracking.sql` - Database schema and triggers
