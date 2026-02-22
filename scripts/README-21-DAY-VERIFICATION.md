# PP 35/2021 Compliance Verification: Blocking at 21 Days

## Overview

This verification script tests that bookings are blocked when a worker has worked 21 days for the same business in a month, as required by Indonesian labor law PP 35/2021.

## Expected Behavior at 21 Days

- **Compliance Status**: `"blocked"` (worker cannot be booked)
- **ComplianceWarningBanner**: Visible with red blocking styles
- **Accept Button**: DISABLED (user cannot click to accept)
- **AlternativeWorkersSuggestion**: Visible (shows available workers)
- **Message**: "PP 35/2021 Limit Reached (21/21 days)"
- **Server Action**: `checkComplianceBeforeAccept` returns `canAccept: false`

## Prerequisites

1. Supabase instance running (local or remote)
2. Database migrations applied (compliance_tracking table exists)
3. Environment variables set (optional, defaults to local Supabase)

## Running the Verification

### Option 1: Using npx tsx (Recommended)

```bash
npx tsx scripts/verify-21-day-blocking.ts
```

### Option 2: Using ts-node

```bash
npx ts-node scripts/verify-21-day-blocking.ts
```

### Option 3: Compile and run

```bash
npx tsc scripts/verify-21-day-blocking.ts --outDir ./dist
node dist/scripts/verify-21-day-blocking.js
```

## Environment Variables

The script uses these environment variables (with defaults for local Supabase):

- `DATABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL (default: `http://127.0.0.1:54321`)
- `SUPABASE_SERVICE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase API key

## What the Script Does

1. **Creates test data**: Business, worker, and job records
2. **Creates 21 accepted bookings** for the worker-business pair in the current month
3. **Verifies compliance_tracking** table shows exactly 21 days worked
4. **Verifies calculate_days_worked** function returns 21
5. **Verifies getComplianceStatus** logic returns "blocked" status
6. **Verifies checkComplianceBeforeAccept** logic blocks acceptance (canAccept=false)
7. **Documents UI expectations** for manual browser verification

## Expected Output

```
=== PP 35/2021 Compliance Blocking Verification (21 Days) ===

STEP 1: Creating test data...
✓ Created test business, worker, and job

STEP 2: Creating 21 accepted bookings...
✓ Created 21 accepted bookings

STEP 3: Verifying compliance_tracking table...
✓ Compliance tracking record found
  - Days worked: 21
✓ Days worked count is correct (21 days)

STEP 4: Verifying calculate_days_worked function...
✓ calculate_days_worked returns 21

STEP 5: Verifying compliance status logic...
✓ Compliance status: "blocked"
  - Warning level: "limit"
  - Message: "Worker has reached 21 days this month. PP 35/2021 limit (21 days) reached."

STEP 6: Verifying UI component expectations...
Expected UI behavior:
  1. ComplianceWarningBanner:
     - Should render: YES (status !== 'ok')
     - Status: "blocked"
     - Styles: border-red-200 bg-red-50 (red blocking banner)
     - Title: "PP 35/2021 Limit Reached (21/21 days)"
     - Subtext: "Worker has reached the monthly limit. Cannot accept more bookings this month."
     - "View Alternatives" button: VISIBLE

  2. BookingActions accept button:
     - Disabled: YES (isComplianceBlocked = status === "blocked" = true)
     - User can click accept: NO (button is disabled)

  3. ComplianceStatusBadge:
     - Status: "blocked"
     - Shows days worked: 21

  4. AlternativeWorkersSuggestion:
     - Should render: YES (complianceIssue.status === "blocked")
     - Shows list of workers who haven't reached 21-day limit
     - Allows business to select alternative worker

STEP 7: Verifying checkComplianceBeforeAccept logic...
✓ canAccept: false
✓ checkComplianceBeforeAccept correctly blocks acceptance (canAccept=false)

=== VERIFICATION SUCCESSFUL ===
...
```

## Manual Browser Verification

After the automated verification passes, complete the verification by checking the UI:

1. Start the dev server: `npm run dev`
2. Navigate to: http://localhost:3000/dashboard/business/jobs
3. Find the test job or create a new job application for the test worker
4. Verify a **RED blocking banner** is displayed
5. Verify the banner shows **"PP 35/2021 Limit Reached (21/21 days)"**
6. Verify the **accept button is DISABLED** (not clickable, grayed out)
7. Verify the **compliance badge shows blocked status** (red "Blocked" badge)
8. Verify **alternative workers suggestion appears** below the applicant list

## Component Behavior Details

### ComplianceWarningBanner (components/booking/compliance-warning-banner.tsx)

At 21 days, the banner should render with:
- **Status**: `"blocked"`
- **Title**: `"PP 35/2021 Limit Reached (21/21 days)"`
- **Description**: `"Worker has reached the monthly limit. Cannot accept more bookings this month."`
- **Styles**: `border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950`
- **Icon**: `AlertCircle` (red)
- **Button**: Optional "View Alternatives" button (if provided)

### BookingActions (components/booking/booking-actions.tsx)

At 21 days, the accept button should:
- **isComplianceBlocked**: `true` (because `complianceStatus?.status === "blocked"`)
- **isAcceptDisabled**: `true` (combines `isActionDisabled || isComplianceBlocked`)
- **Button state**: Disabled (grayed out, not clickable)
- **Hover behavior**: No hover effect (disabled)
- **Reject button**: Unaffected (can still reject if needed)

### ComplianceStatusBadge (components/booking/compliance-status-badge.tsx)

At 21 days, the badge should show:
- **Status**: `"blocked"`
- **Variant**: `"destructive"` (red)
- **Icon**: `XCircle` (red)
- **Text**: `"Blocked"` or with days: `"Blocked (21/21)"` (if `showDays=true`)

### AlternativeWorkersSuggestion (components/booking/alternative-workers-suggestion.tsx)

At 21 days, this component should:
- **Render**: YES (when `complianceIssue.status === "blocked"`)
- **Show**: Grid of available workers (those with <21 days)
- **Allow**: Clicking on alternative workers to select them
- **Display**: Worker details including days worked this month

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

### "calculate_days_worked returned X, expected 21"

The trigger might be counting incorrectly. Check:
1. The booking statuses (should be 'accepted', not 'pending')
2. The booking dates (should be in the current month)
3. The trigger logic in the migration file

### "Expected compliance status to be 'blocked', but got 'warning'"

The compliance logic might be incorrect. Check:
1. `lib/supabase/queries/compliance.ts` - `getComplianceStatus` function
2. The condition should be: `if (days >= 21) status = 'blocked'`
3. Make sure the logic is: `days >= 21` (not `days > 21`)

### "checkComplianceBeforeAccept should return canAccept=false"

The server action logic might be incorrect. Check:
1. `lib/actions/compliance.ts` - `checkComplianceBeforeAccept` function
2. The condition should be: `canAccept = status !== 'blocked'`
3. When status is "blocked", canAccept should be false

## Related Files

- `lib/supabase/queries/compliance.ts` - Compliance query functions
- `lib/actions/compliance.ts` - Server actions for compliance checking
- `lib/actions/job-applications.ts` - Accept application action with compliance check
- `components/booking/compliance-warning-banner.tsx` - Warning/blocking banner component
- `components/booking/compliance-status-badge.tsx` - Status badge component
- `components/booking/booking-actions.tsx` - Accept/reject buttons with compliance check
- `components/booking/alternative-workers-suggestion.tsx` - Alternative workers component
- `components/applicant-list.tsx` - List of applicants with compliance integration
- `supabase/migrations/20260222_add_compliance_tracking.sql` - Database schema and triggers

## Legal Compliance Note

PP 35/2021 is a real Indonesian labor law that limits daily workers to 21 days per month for the same employer. This verification ensures the system correctly enforces this limit to protect businesses from legal violations.
