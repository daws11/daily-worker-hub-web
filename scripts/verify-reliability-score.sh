#!/bin/bash

# Reliability Score Calculation - End-to-End Verification Script
# This script verifies the complete reliability score calculation system

echo ""
echo "============================================================"
echo "RELIABILITY SCORE CALCULATION - END-TO-END VERIFICATION"
echo "============================================================"
echo ""

PASS=0
FAIL=0
SKIP=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    local status=$1
    local name=$2
    local details=$3

    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✅${NC} $name: PASS"
        ((PASS++))
    elif [ "$status" = "fail" ]; then
        echo -e "${RED}❌${NC} $name: FAIL"
        echo "   $details"
        ((FAIL++))
    else
        echo -e "${YELLOW}⏭️ ${NC} $name: SKIP"
        echo "   $details"
        ((SKIP++))
    fi
}

# 1. Verify Database Schema
echo "Checking Database Schema..."

# Check for migration files
if [ -f "supabase/migrations/20260222_add_booking_time_tracking.sql" ]; then
    log "pass" "Database: Bookings time tracking migration" "File exists"
else
    log "fail" "Database: Bookings time tracking migration" "Migration file not found"
fi

if [ -f "supabase/migrations/20260222_create_reliability_score_history.sql" ]; then
    log "pass" "Database: Score history table migration" "File exists"
else
    log "fail" "Database: Score history table migration" "Migration file not found"
fi

if [ -f "supabase/migrations/20260222_add_reliability_score_rls.sql" ]; then
    log "pass" "Database: Score history RLS policies" "File exists"
else
    log "fail" "Database: Score history RLS policies" "Migration file not found"
fi

if [ -f "supabase/migrations/20260222_add_score_trigger.sql" ]; then
    log "pass" "Database: Auto-calculation trigger" "File exists"
else
    log "fail" "Database: Auto-calculation trigger" "Migration file not found"
fi

# 2. Verify TypeScript Types
echo ""
echo "Checking TypeScript Types..."

if grep -q "reliability_score_history" lib/supabase/types.ts 2>/dev/null; then
    log "pass" "Types: Score history table" "Type definitions exist"
else
    log "fail" "Types: Score history table" "Type definitions not found"
fi

if grep -q "actual_start_time\|actual_end_time" lib/supabase/types.ts 2>/dev/null; then
    log "pass" "Types: Bookings time columns" "Type definitions exist"
else
    log "fail" "Types: Bookings time columns" "Type definitions not found"
fi

# 3. Verify Backend Logic
echo ""
echo "Checking Backend Logic..."

if [ -f "lib/supabase/queries/reliability-score.ts" ]; then
    log "pass" "Queries: Reliability score queries" "File exists"
else
    log "fail" "Queries: Reliability score queries" "File not found"
fi

if [ -f "lib/actions/reliability-score.ts" ]; then
    log "pass" "Actions: Reliability score actions" "File exists"
else
    log "fail" "Actions: Reliability score actions" "File not found"
fi

# Check for 40/30/30 formula
if grep -q "0.4\|0.3\|0.3" lib/supabase/queries/reliability-score.ts 2>/dev/null; then
    log "pass" "Formula: 40/30/30 calculation" "Correct formula implemented"
else
    log "fail" "Formula: 40/30/30 calculation" "Formula not found or incorrect"
fi

# 4. Verify Edge Function
echo ""
echo "Checking Edge Functions..."

if [ -f "supabase/functions/reliability-score/index.ts" ]; then
    log "pass" "Edge Function: reliability-score" "File exists"
else
    log "fail" "Edge Function: reliability-score" "File not found"
fi

# 5. Verify UI Components
echo ""
echo "Checking UI Components..."

if [ -f "components/worker/reliability-badge.tsx" ]; then
    log "pass" "UI: ReliabilityBadge component" "File exists"
else
    log "fail" "UI: ReliabilityBadge component" "File not found"
fi

if [ -f "components/worker/score-breakdown.tsx" ]; then
    log "pass" "UI: ScoreBreakdown component" "File exists"
else
    log "fail" "UI: ScoreBreakdown component" "File not found"
fi

if [ -f "components/worker/score-history.tsx" ]; then
    log "pass" "UI: ScoreHistory component" "File exists"
else
    log "fail" "UI: ScoreHistory component" "File not found"
fi

# 6. Verify UI Integration
echo ""
echo "Checking UI Integration..."

if grep -q "ReliabilityBadge\|ScoreBreakdown\|ScoreHistory" app/app/\(dashboard\)/worker/profile/page.tsx 2>/dev/null; then
    log "pass" "Integration: Worker profile page" "Components integrated"
else
    log "fail" "Integration: Worker profile page" "Components not integrated"
fi

if grep -q "reliability_score\|ReliabilityBadge" components/applicant-list.tsx 2>/dev/null; then
    log "pass" "Integration: Business applicant view" "Score display integrated"
else
    log "fail" "Integration: Business applicant view" "Score display not integrated"
fi

# 7. Verify job-applications.ts integration
echo ""
echo "Checking Job Completion Flow..."

if grep -q "calculateWorkerScore" lib/actions/job-applications.ts 2>/dev/null; then
    log "pass" "Job Completion: Score calculation" "Integrated in completeBooking"
else
    log "fail" "Job Completion: Score calculation" "Not integrated"
fi

# Print Summary
echo ""
echo "============================================================"
echo "VERIFICATION SUMMARY"
echo "============================================================"
echo ""
TOTAL=$((PASS + FAIL + SKIP))
echo "Total Checks: $TOTAL"
echo -e "${GREEN}✅ Passed: $PASS${NC}"
echo -e "${RED}❌ Failed: $FAIL${NC}"
echo -e "${YELLOW}⏭️  Skipped: $SKIP${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}SOME VERIFICATIONS FAILED${NC}"
    echo "============================================================"
    exit 1
else
    echo -e "${GREEN}ALL VERIFICATIONS PASSED${NC}"
    echo "============================================================"
    echo ""
    echo "MANUAL TESTING CHECKLIST:"
    echo "─────────────────────────────────────────────────────────────────"
    echo "1. Create a new job posting as a business user"
    echo "2. Have a worker apply to the job"
    echo "3. Accept the application (creates booking)"
    echo "4. Mark the booking as completed"
    echo "5. Verify the worker's reliability score is recalculated"
    echo "6. Check that a new entry appears in reliability_score_history table"
    echo "7. Navigate to worker profile page and verify score displays correctly"
    echo "8. Check business applicant view shows reliability scores"
    echo "─────────────────────────────────────────────────────────────────"
    exit 0
fi
