# Test Documentation: Worker Reviews Business Flow

## Subtask ID
subtask-6-2

## Overview
This document outlines the end-to-end testing steps for verifying that workers can successfully review businesses after job completion.

## Test Environment Setup

### Prerequisites
1. Database migration must be applied:
   ```bash
   supabase db push
   ```

2. Development server running:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000

3. Test data required:
   - At least one worker user account
   - At least one business user account
   - At least one completed booking (worker checked out)

### Test Accounts
Ensure you have the following test accounts:
- Worker account: `worker@test.com`
- Business account: `business@test.com`

---

## Test Case 1: Login as Worker User

### Steps
1. Navigate to http://localhost:3000/login
2. Enter worker email and password
3. Click "Masuk" (Login)

### Expected Result
- User is redirected to worker dashboard
- User can access worker pages

### Verification Points
- [ ] Login succeeds without errors
- [ ] User type is correctly identified as worker
- [ ] Dashboard loads with worker context

---

## Test Case 2: Navigate to Completed Booking

### Steps
1. From worker dashboard, navigate to `/dashboard/worker/bookings`
2. Verify the page loads
3. Look for bookings in the "Completed - Ready for Review" section

### Expected Result
- Worker bookings page loads successfully
- Completed bookings are displayed in the appropriate section
- Each completed booking shows:
  - Business name and verification status
  - Job title
  - Date and time of work
  - Final wage
  - "Tulis Ulasan" (Write Review) button (if not yet reviewed)

### Verification Points
- [ ] Page loads without errors
- [ ] Completed bookings section is visible
- [ ] Business information is displayed correctly
- [ ] Job details are accurate
- [ ] "Tulis Ulasan" button appears for bookings without reviews

---

## Test Case 3: Click 'Write Review' Button

### Steps
1. Locate a completed booking without an existing review
2. Click the "Tulis Ulasan" button

### Expected Result
- Review form dialog opens
- Dialog shows business name in title
- Form displays:
  - Star rating input (1-5 stars)
  - Comment textarea (optional)
  - NO "Would Rehire" checkbox (worker reviews don't have this field)

### Verification Points
- [ ] Dialog opens smoothly
- [ ] Business name is correctly displayed in title
- [ ] Star rating component is interactive
- [ ] Stars highlight on hover
- [ ] Comment field accepts text input
- [ ] "Would Rehire" checkbox is NOT present
- [ ] "Batal" (Cancel) and "Kirim Ulasan" (Submit) buttons are present

---

## Test Case 4: Submit Review with Rating and Comment (No Would Rehire)

### Steps
1. Click on a star to select rating (e.g., 5 stars)
2. Enter a comment (e.g., "Bisnis yang profesional dan membayar tepat waktu")
3. Verify there is NO "Would Rehire" checkbox
4. Click "Kirim Ulasan" (Submit Review)

### Expected Result
- Form validation passes
- Review is submitted to database
- Success toast message appears: "Ulasan berhasil disimpan"
- Dialog closes automatically
- Review button changes to show review status

### Verification Points
- [ ] Rating selection works correctly
- [ ] Comment field accepts up to 1000 characters
- [ ] No "Would Rehire" checkbox is shown
- [ ] Submit button is disabled until rating is selected
- [ ] Form submission succeeds without errors
- [ ] Success toast appears
- [ ] Dialog closes after successful submission
- [ ] Booking card shows "Ulasan diberikan" with rating

---

## Test Case 5: Verify Review Appears in Business's Reviews Page

### Steps
1. Logout as worker user
2. Login as the business who was reviewed
3. Navigate to `/dashboard/business/reviews`

### Expected Result
- Business reviews page loads
- The new review from the worker is visible
- Review displays:
  - Star rating with correct number of stars
  - Rating value (e.g., "5.0")
  - Worker name and avatar
  - Comment text
  - NO "Would Rehire" badge (worker reviews don't have this)
  - Relative date (e.g., "Today")
  - Briefcase icon indicating worker review

### Verification Points
- [ ] Business reviews page loads without errors
- [ ] New review appears in the list
- [ ] Star rating displays correctly with color coding
- [ ] Rating value is accurate
- [ ] Worker information is displayed (name, avatar)
- [ ] Comment text is shown
- [ ] "Would Rehire" badge is NOT present
- [ ] Briefcase icon is shown to indicate worker review
- [ ] Date is displayed correctly

---

## Test Case 6: Verify Business Average Rating Updates

### Steps
1. While on business's reviews page, check the rating summary
2. Note the average rating
3. Refresh the page to ensure data persistence
4. Verify the average rating calculation

### Expected Result
- Average rating reflects the new review
- Review count is incremented
- Rating is color-coded appropriately (green for high, yellow for medium, etc.)
- Rating summary displays correctly

### Verification Points
- [ ] Average rating is calculated correctly
- [ ] Review count is incremented
- [ ] Average rating displays with correct star visualization
- [ ] Color coding matches rating level:
  - 4.5-5.0: Green (Excellent)
  - 4.0-4.4: Light green
  - 3.5-3.9: Yellow (Good)
  - 3.0-3.4: Orange (Fair)
  - Below 3.0: Red (Poor)
- [ ] Data persists after page refresh

---

## Additional Edge Case Tests

### Test Case 7: Review Validation

### Steps
1. Open review form
2. Try to submit without selecting a rating

### Expected Result
- Submit button remains disabled
- Or if enabled, validation error appears
- Form does not submit

### Verification Points
- [ ] Rating is validated as required
- [ ] Appropriate error message appears
- [ ] Review is not created in database

---

### Test Case 8: Multiple Reviews Constraint

### Steps
1. Navigate back to worker bookings page
2. Find the booking that was just reviewed
3. Verify the "Tulis Ulasan" button is no longer visible

### Expected Result
- "Tulis Ulasan" button is replaced with review status
- Cannot submit another review for the same booking

### Verification Points
- [ ] Only one review per worker per booking is allowed
- [ ] Existing review status is displayed
- [ ] No duplicate review option

---

### Test Case 9: Review with Empty Comment

### Steps
1. Find another completed booking without a review
2. Open review form
3. Select rating only
4. Leave comment field empty
5. Submit

### Expected Result
- Review is created successfully
- Comment is stored as null/undefined
- Review displays without comment section

### Verification Points
- [ ] Comment is optional
- [ ] Form submits with empty comment
- [ ] Review displays correctly without comment

---

### Test Case 10: Worker Cannot See Would Rehire Checkbox

### Steps
1. Open review form for any completed booking
2. Verify the form structure

### Expected Result
- The "Would Rehire" checkbox is NOT visible
- Only rating and comment fields are present

### Verification Points
- [ ] Would Rehire field is exclusive to business reviews
- [ ] Worker review form has fewer fields than business review form
- [ ] Form is simpler and more focused on rating and comment

---

## Database Verification Queries

After testing, verify the database state:

```sql
-- Check reviews table for new entry (worker reviews)
SELECT
  id,
  booking_id,
  reviewer,
  rating,
  comment,
  would_rehire,
  created_at
FROM reviews
WHERE reviewer = 'worker'
ORDER BY created_at DESC
LIMIT 5;

-- Verify average rating calculation for business
SELECT
  business_id,
  COUNT(*) as review_count,
  AVG(rating) as average_rating
FROM reviews
WHERE reviewer = 'worker'
GROUP BY business_id;

-- Check unique constraint enforcement (one review per worker per booking)
SELECT
  booking_id,
  reviewer,
  COUNT(*)
FROM reviews
GROUP BY booking_id, reviewer
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates)

-- Verify would_rehire is NULL for worker reviews
SELECT
  id,
  reviewer,
  would_rehire
FROM reviews
WHERE reviewer = 'worker'
LIMIT 5;
-- All should have would_rehire = NULL
```

---

## TypeScript Verification

Run type check to ensure no type errors:

```bash
npm run type-check
```

Expected: No TypeScript errors related to review functionality

---

## Build Verification

Ensure the application builds successfully:

```bash
npm run build
```

Expected: Build completes without errors

---

## Key Differences from Business Reviews Worker Flow

1. **Reviewer Type**: Worker reviews have `reviewer = 'worker'` instead of `'business'`
2. **No Would Rehire**: Worker reviews do NOT have the `would_rehire` checkbox
3. **Target Entity**: Worker reviews target businesses, stored with `business_id`
4. **Display Location**: Worker reviews appear on business's reviews page
5. **Rating Impact**: Worker reviews affect business average rating, not worker reliability score
6. **Icon**: Worker reviews show Briefcase icon instead of Building icon

---

## Known Limitations for Manual Testing

Due to sandbox environment restrictions, some automated testing cannot be performed:
- Cannot run dev server in background (port binding EPERM)
- Cannot perform actual browser-based testing
- Cannot test real-time database updates without running application

**Recommended Next Steps:**
1. Run `npm run dev` in non-sandboxed environment
2. Manually test the flow following the test cases above
3. Record results in this document
4. Report any issues found

---

## Test Results Summary

### Test Execution Date: _______________

### Tester Name: _______________

### Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1: Login as Worker User | ☐ Pass ☐ Fail | |
| TC2: Navigate to Completed Booking | ☐ Pass ☐ Fail | |
| TC3: Click Write Review Button | ☐ Pass ☐ Fail | |
| TC4: Submit Review (No Would Rehire) | ☐ Pass ☐ Fail | |
| TC5: Verify Review in Business Page | ☐ Pass ☐ Fail | |
| TC6: Verify Business Average Rating Update | ☐ Pass ☐ Fail | |
| TC7: Review Validation | ☐ Pass ☐ Fail | |
| TC8: Multiple Reviews Constraint | ☐ Pass ☐ Fail | |
| TC9: Empty Comment Test | ☐ Pass ☐ Fail | |
| TC10: No Would Rehire Checkbox | ☐ Pass ☐ Fail | |

### Overall Status: ☐ Pass ☐ Fail

### Issues Found:
1. ________________________________________________________________
2. ________________________________________________________________
3. ________________________________________________________________

### Screenshots/Logs:
(Paste any relevant screenshots or console logs here)

---

## Sign-off

Tested by: _______________ Date: _______________

Approved by: _______________ Date: _______________
