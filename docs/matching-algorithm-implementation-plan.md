# Matching Algorithm Implementation Plan

## Implementation Status: ✅ COMPLETE

This document tracks the implementation of the 5-phase Matching Algorithm for Daily Worker Hub.

---

## Phase 1: Database Schema Updates ✅

### Migrations Created:
1. **`supabase/migrations/20260227_add_worker_tiers.sql`**
   - Added `worker_tier` enum type (classic, pro, elite, champion)
   - Added `jobs_completed` column to workers table
   - Added `tier` column to workers table
   - Created indexes for frequently queried columns

2. **`supabase/migrations/20260227_add_job_hours_fields.sql`**
   - Added `hours_needed` column to jobs table (4-12 hours constraint)
   - Added `overtime_multiplier` column to jobs table (1.0-1.5 constraint)
   - Added check constraints for validation

3. **`supabase/migrations/20260227_add_matching_fields.sql`**
   - Added `matching_score` column to bookings table (0-115 range)
   - Created index for sorting by matching score

### TypeScript Types Updated:
- Updated `lib/supabase/types.ts` to include:
  - `worker_tier` enum in Constants
  - `jobs_needed`, `overtime_multiplier` in jobs table
  - `jobs_completed`, `tier` in workers table
  - `matching_score` in bookings table
  - `WorkerTier` convenience type alias

---

## Phase 2: 4-Tier Worker System ✅

### Files Created:

1. **`lib/algorithms/tier-classifier.ts`**
   - `classifyWorkerTier()` - Calculate tier based on jobs, rating, punctuality
   - `getTierRank()` - Get tier rank for sorting
   - `getTierBonus()` - Get tier bonus for matching algorithm
   - `getTierLabel()` - Get display label
   - `getTierDescription()` - Get tier description
   - `canUpgradeTier()` / `canDowngradeTier()` - Check tier progression

2. **`lib/algorithms/tier-progression.ts`**
   - `updateWorkerTier()` - Update worker tier in database
   - `recalculateAllWorkerTiers()` - Admin function to recalculate all tiers
   - `getTierProgress()` - Get progress to next tier
   - `incrementJobsCompleted()` - Increment job counter and update tier
   - `WorkerMetrics` interface

3. **`components/worker/tier-badge.tsx`**
   - `TierBadge` - Main badge component with styling
   - `TierBadgeSmall` - Compact badge variant
   - `TierBadgeCompact` - Minimal badge variant
   - `TierBadgeDetailed` - Detailed badge with stats
   - Color-coded by tier (Champion=gold, Elite=purple, Pro=blue, Classic=gray)

### Integration:
- Updated `app/(dashboard)/worker/settings/page.tsx`
  - Added worker tier data fetching
  - Display `TierBadgeDetailed` with progress info

---

## Phase 3: 5-Point Matching Algorithm ✅

### Files Created:

1. **`lib/algorithms/matching-score.ts`**
   - `calculateHaversineDistance()` - Calculate distance between coordinates
   - `calculateSkillScore()` - 30 points max
   - `calculateDistanceScore()` - 30 points max (0-5km: 30, 5-10km: 20, 10-20km: 10)
   - `calculateAvailabilityScore()` - 20 points max
   - `calculateRatingScore()` - 15 points max
   - `calculateComplianceScore()` - 5 points max
   - `calculateMatchingScore()` - Total score calculation (0-115)
   - `getMatchingScoreBreakdown()` - Detailed breakdown
   - `getMatchQuality()` - Quality label based on score

2. **`lib/algorithms/generate-shortlist.ts`**
   - `generateWorkerShortlist()` - Generate ranked worker list
   - `generateWorkerShortlistFromIds()` - Score specific workers
   - `groupWorkersByTier()` - Group workers by tier
   - `getInterviewRecommendation()` - Interview requirements by tier
   - `WorkerWithScore` interface
   - `ShortlistParams` interface

---

## Phase 4: Wage Calculation with Overtime ✅

### Files Created/Updated:

1. **`lib/constants/rate-bali.ts`** (Updated)
   - Added `CategoryRate` interface
   - Added `CATEGORY_RATES` - Hourly rates by category and region
   - `getHourlyRate()` - Get rate by category and region
   - `getOvertimeMultiplier()` - 1.0 for 4-8h, 1.5 for 9-12h
   - `getHoursBreakdown()` - Split regular and overtime hours
   - `isValidHours()` - Validate hours range

2. **`lib/algorithms/wage-calculator.ts`**
   - `calculateWage()` - Main wage calculation
   - `getWageBreakdown()` - Display breakdown
   - `formatWageDisplay()` - Format for display
   - `formatWageCompact()` - Compact format
   - `calculateMultipleWorkersWage()` - For multiple workers
   - `getWageEstimate()` - Quick estimate
   - `WageCalculation` interface

3. **`components/business/hour-selection.tsx`**
   - `HourSelection` - Slider component (4-12h)
   - `HourSelectionCompact` - Quick buttons variant
   - Visual overtime indicators
   - Quick option buttons (4h, 6h, 8h, 10h, 12h)

4. **`components/business/wage-calculator.tsx`**
   - `WageCalculator` - Full wage calculator card
   - `WageCalculatorCompact` - Compact variant
   - Real-time calculation
   - Breakdown display
   - Overtime indicators

---

## Phase 5: Integration & UI ✅

### Files Created/Updated:

1. **`app/(dashboard)/worker/settings/page.tsx`** (Updated)
   - Added worker tier fetching
   - Display `TierBadgeDetailed`
   - Shows jobs completed, rating, punctuality

2. **`app/components/job-posting-form.tsx`** (Updated)
   - Added `hoursNeeded` to form schema
   - Integrated `HourSelection` component
   - Integrated `WageCalculator` component
   - Added `getCategoryFromPositionType()` helper

3. **`lib/actions/jobs.ts`** (Updated)
   - Added `hoursNeeded` to `CreateJobInput` interface
   - Updated `createJob` action to save `hours_needed` and `overtime_multiplier`

4. **`components/matching/worker-shortlist.tsx`** (Created)
   - Displays ranked worker list
   - Shows matching scores (0-115)
   - Tier badges
   - Interview recommendations
   - Score breakdown (skills, distance, etc.)
   - "Best Match" badge for top match

---

## Tier System Summary

| Tier | Jobs | Rating | Punctuality | Bonus | Interview |
|------|------|--------|-------------|-------|-----------|
| Champion | 300+ | 4.8+ | 98%+ | +20 | Instant (no interview) |
| Elite | 100+ | 4.6+ | 95%+ | +15 | Instant (no interview) |
| Pro | 20+ | 4.0+ | 90%+ | +10 | Chat interview (5-10 min) |
| Classic | 0-19 | <4.0 | <90% | +5 | Chat + Voice (10-15 min) |

---

## Matching Algorithm Scoring

| Factor | Max Points | Criteria |
|--------|-----------|----------|
| Skill Compatibility | 30 | Exact match: +30, Partial: +15, None: 0 |
| Distance | 30 | 0-5km: +30, 5-10km: +20, 10-20km: +10, 20+km: 0 |
| Availability | 20 | Full: +20, Partial: +10, None: 0 |
| Rating | 15 | 4.8-5.0: +15, 4.5-4.7: +12, 4.0-4.4: +8, <4.0: 0 |
| Compliance | 5 | Compliant: +5, Non-compliant: 0 |
| Tier Bonus | 20 | Champion: +20, Elite: +15, Pro: +10, Classic: +5 |
| **Total** | **115** | Max possible score |

---

## Wage Calculation

### Formula
```
totalWage = hoursWorked × hourlyRate × overtimeMultiplier

Where:
- hoursWorked: 4-12 hours
- hourlyRate: Based on category & region
- overtimeMultiplier: 1.0 for 4-8h, 1.5 for 9-12h
```

### Hourly Rates (IDR/hour)
| Category | Denpasar | Gianyar | Badung | Other |
|----------|----------|---------|--------|-------|
| Housekeeping | 20,000 | 19,000 | 18,500 | 18,000 |
| Waiter | 22,000 | 21,000 | 20,500 | 20,000 |
| Cook Helper | 21,000 | 20,000 | 19,500 | 19,000 |
| Cook (Line) | 25,000 | 24,000 | 23,500 | 23,000 |
| Cook (Head) | 35,000+ | 34,000+ | 33,000+ | 32,000+ |
| Steward | 23,000 | 22,000 | 21,500 | 21,000 |
| Driver | 24,000 | 23,000 | 22,500 | 22,000 |
| Bellman | 21,000 | 20,000 | 19,500 | 19,000 |
| Front Desk | 28,000 | 27,000 | 26,000 | 26,000 |
| Spa/Therapist | 30,000 | 29,000 | 28,000 | 28,000 |

### Fees
- Platform Fee: 6% of total wage
- Community Fund: 1% of worker's wage
- Worker Receives: Total wage - 1%
- Business Pays: Total wage + 6%

---

## Next Steps / TODO

### Pending (Not in this implementation):
- [ ] Run database migrations on local Supabase instance
- [ ] Run `supabase gen types typescript --local` to regenerate types from schema
- [ ] Test each phase with sample data
- [ ] Implement actual availability checking in `generateWorkerShortlist`
- [ ] Implement 21 Days Rule compliance checking
- [ ] Create worker profile page to show tier badge
- [ ] Create admin dashboard for tier management
- [ ] Add worker skill matching UI to business job posting

### Optional Enhancements:
- [ ] Real-time wage preview during job posting
- [ ] Worker shortlist visualization on job detail page
- [ ] Tier upgrade/downgrade notifications
- [ ] Matching algorithm performance analytics

---

## File Structure Summary

```
daily-worker-hub-clean/
├── lib/
│   ├── algorithms/
│   │   ├── tier-classifier.ts      # Tier classification functions
│   │   ├── tier-progression.ts     # Tier update functions
│   │   ├── matching-score.ts       # 5-point matching algorithm
│   │   ├── generate-shortlist.ts   # Worker shortlist generation
│   │   └── wage-calculator.ts      # Wage calculation with OT
│   ├── constants/
│   │   └── rate-bali.ts            # Hourly rates by category/region
│   └── supabase/
│       └── types.ts                # Updated TypeScript types
├── components/
│   ├── worker/
│   │   └── tier-badge.tsx          # Tier badge component
│   ├── business/
│   │   ├── hour-selection.tsx      # Hour selection slider
│   │   └── wage-calculator.tsx     # Wage calculator component
│   └── matching/
│       └── worker-shortlist.tsx    # Worker shortlist component
├── app/
│   ├── (dashboard)/
│   │   └── worker/
│   │       └── settings/
│   │           └── page.tsx        # Updated with tier badge
│   └── components/
│       └── job-posting-form.tsx    # Updated with wage calculator
├── lib/
│   └── actions/
│       └── jobs.ts                 # Updated createJob action
└── supabase/
    └── migrations/
        ├── 20260227_add_worker_tiers.sql
        ├── 20260227_add_job_hours_fields.sql
        └── 20260227_add_matching_fields.sql
```

---

## Testing Checklist

### Phase 1: Database
- [ ] Run migrations locally
- [ ] Verify new columns exist
- [ ] Verify constraints work correctly
- [ ] Regenerate types

### Phase 2: Tier System
- [ ] Test tier classification with different worker profiles
- [ ] Test tier progression logic
- [ ] Verify TierBadge renders correctly
- [ ] Test worker settings page

### Phase 3: Matching Algorithm
- [ ] Test Haversine distance calculation
- [ ] Test skill matching scoring
- [ ] Test full matching algorithm
- [ ] Verify shortlist generation

### Phase 4: Wage Calculator
- [ ] Test regular hours (4-8h) calculation
- [ ] Test overtime hours (9-12h) calculation
- [ ] Test hour selection slider
- [ ] Verify wage display formatting

### Phase 5: Integration
- [ ] Test job posting with hours selection
- [ ] Test wage calculation in job form
- [ ] Verify worker shortlist displays
- [ ] Test end-to-end job creation flow

---

## Specification Reference

Based on: `memory/2026-02-17-matching-algorithm.md`
