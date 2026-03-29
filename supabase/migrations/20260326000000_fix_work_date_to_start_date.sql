-- Migration: Fix work_date column reference to start_date
-- The bookings table has 'start_date' column, not 'work_date'
-- This migration fixes the compliance functions that incorrectly reference 'work_date'

-- ============================================================================
-- FUNCTION: calculate_days_worked (FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_days_worked(
  p_business_id UUID,
  p_worker_id UUID,
  p_month DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_days_worked INTEGER;
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  -- Calculate month boundaries
  v_month_start := date_trunc('month', p_month)::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Count distinct days from accepted and completed bookings
  -- FIXED: work_date -> start_date
  SELECT COUNT(DISTINCT start_date)::INTEGER INTO v_days_worked
  FROM bookings
  WHERE business_id = p_business_id
    AND worker_id = p_worker_id
    AND status IN ('accepted', 'in_progress', 'completed')
    AND start_date >= v_month_start
    AND start_date <= v_month_end;

  RETURN COALESCE(v_days_worked, 0);
END;
$$;

-- ============================================================================
-- FUNCTION: update_application_reviewed_at (FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_application_reviewed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When status changes from pending to reviewed state, set reviewed_at
  -- FIXED: work_date -> start_date
  IF OLD.status = 'pending' AND NEW.status IN ('shortlisted', 'accepted', 'rejected') THEN
    NEW.reviewed_at := NOW();
  END IF;

  -- When application is withdrawn, clear reviewed_at
  IF NEW.status = 'withdrawn' THEN
    NEW.reviewed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- FUNCTION: get_worker_monthly_booking_count (FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_worker_monthly_booking_count(
  p_worker_id UUID,
  p_month DATE DEFAULT NULL
)
RETURNS TABLE (
  worker_id UUID,
  business_id UUID,
  month DATE,
  days_worked INTEGER,
  status TEXT,
  last_booking_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- FIXED: work_date -> start_date in multiple places
  RETURN QUERY
  SELECT
    b.worker_id,
    b.business_id,
    date_trunc('month', b.start_date)::DATE AS month,
    COUNT(DISTINCT b.start_date)::INTEGER AS days_worked,
    CASE
      WHEN COUNT(DISTINCT b.start_date) >= 21 THEN 'blocked'::TEXT
      WHEN COUNT(DISTINCT b.start_date) >= 15 THEN 'warning'::TEXT
      ELSE 'compliant'::TEXT
    END AS status,
    MAX(b.start_date) AS last_booking_date
  FROM bookings b
  WHERE b.worker_id = p_worker_id
    AND b.status IN ('accepted', 'in_progress', 'completed')
    AND date_trunc('month', b.start_date) = date_trunc('month', COALESCE(p_month, CURRENT_DATE))
  GROUP BY b.business_id, b.worker_id, date_trunc('month', b.start_date)::DATE;
END;
$$;

-- ============================================================================
-- FUNCTION: check_booking_compliance (NO CHANGES NEEDED - uses p_work_date parameter)
-- Note: This function receives workDate as parameter p_work_date but internally
-- calls calculate_days_worked which now uses start_date correctly
-- ============================================================================

-- The check_booking_compliance function signature remains the same:
-- p_business_id UUID, p_worker_id UUID, p_work_date DATE
-- It passes p_work_date to calculate_days_worked which is correct
-- The internal query in calculate_days_worked now uses start_date
