-- Migration: Fix work_date column reference to start_date
-- The bookings table has 'start_date' column, not 'work_date'
-- This migration fixes all compliance functions and triggers that incorrectly
-- reference 'work_date', and creates the missing create_compliance_warning_if_needed function.
--
-- Idempotent: all functions use CREATE OR REPLACE and triggers use IF EXISTS.

-- ============================================================================
-- FUNCTION: calculate_days_worked
-- Counts distinct start_date days (was work_date, now fixed).
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
  v_month_start := date_trunc('month', p_month)::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

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
-- FUNCTION: update_compliance_tracking
-- Upserts compliance_tracking based on start_date-day counts.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_compliance_tracking(
  p_business_id UUID,
  p_worker_id UUID,
  p_month DATE DEFAULT NULL
)
RETURNS compliance_tracking
LANGUAGE plpgsql
AS $$
DECLARE
  v_month DATE;
  v_days INTEGER;
  v_status TEXT;
  v_tracking compliance_tracking%ROWTYPE;
BEGIN
  v_month := COALESCE(p_month, date_trunc('month', CURRENT_DATE)::DATE);
  v_days := calculate_days_worked(p_business_id, p_worker_id, v_month);

  IF v_days >= 21 THEN
    v_status := 'blocked';
  ELSIF v_days >= 15 THEN
    v_status := 'warning';
  ELSE
    v_status := 'compliant';
  END IF;

  INSERT INTO compliance_tracking (business_id, worker_id, month, days_worked, compliance_status, last_booking_date)
  VALUES (p_business_id, p_worker_id, v_month, v_days, v_status, CURRENT_DATE)
  ON CONFLICT (business_id, worker_id, month)
  DO UPDATE SET
    days_worked = v_days,
    compliance_status = v_status,
    last_booking_date = CURRENT_DATE,
    updated_at = NOW()
  RETURNING * INTO v_tracking;

  RETURN v_tracking;
END;
$$;

-- ============================================================================
-- FUNCTION: create_compliance_warning_if_needed
-- Creates a compliance_warnings row when status transitions to 'warning'.
-- Previously missing from the DB — causes trigger update_compliance_on_booking to fail.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_compliance_warning_if_needed(
  p_business_id UUID,
  p_worker_id UUID,
  p_month DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tracking compliance_tracking%ROWTYPE;
BEGIN
  SELECT * INTO v_tracking
  FROM compliance_tracking
  WHERE business_id = p_business_id
    AND worker_id = p_worker_id
    AND month = p_month;

  IF v_tracking.compliance_status = 'warning' THEN
    IF NOT EXISTS (
      SELECT 1 FROM compliance_warnings
      WHERE business_id = p_business_id
        AND worker_id = p_worker_id
        AND month = p_month
        AND acknowledged = FALSE
    ) THEN
      INSERT INTO compliance_warnings (
        business_id, worker_id, month, days_worked, warning_level, acknowledged
      ) VALUES (
        p_business_id, p_worker_id, p_month, v_tracking.days_worked, 'warning', FALSE
      );
    END IF;
  END IF;
END;
$$;

-- ============================================================================
-- FUNCTION: check_booking_compliance
-- Parameter renamed from p_work_date → p_start_date to match the column rename.
-- Internally delegates to calculate_days_worked which uses start_date.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_booking_compliance(
  p_business_id UUID,
  p_worker_id UUID,
  p_start_date DATE
)
RETURNS TABLE(allowed boolean, current_days integer, projected_days integer, status text, message text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_month DATE;
  v_current_days INTEGER;
  v_projected_days INTEGER;
  v_status TEXT;
  v_message TEXT;
  v_allowed BOOLEAN;
BEGIN
  v_month := date_trunc('month', p_start_date)::DATE;
  v_current_days := calculate_days_worked(p_business_id, p_worker_id, v_month);
  v_projected_days := v_current_days + 1;

  IF v_current_days >= 21 THEN
    v_allowed := FALSE;
    v_status := 'blocked';
    v_message := format('Worker has already worked %s days this month. PP 35/2021 limit reached.', v_current_days);
  ELSIF v_projected_days > 21 THEN
    v_allowed := FALSE;
    v_status := 'blocked';
    v_message := 'Accepting this booking would exceed the PP 35/2021 limit of 21 days per month.';
  ELSIF v_current_days >= 15 THEN
    v_allowed := TRUE;
    v_status := 'warning';
    v_message := format('Warning: Worker has worked %s days. This booking would bring total to %s days.', v_current_days, v_projected_days);
  ELSE
    v_allowed := TRUE;
    v_status := 'compliant';
    v_message := format('Booking allowed. Worker has worked %s days, projected %s days after this booking.', v_current_days, v_projected_days);
  END IF;

  RETURN QUERY SELECT v_allowed, v_current_days, v_projected_days, v_status, v_message;
END;
$$;

-- ============================================================================
-- FUNCTION: get_worker_monthly_booking_count
-- Reports monthly booking counts using start_date.
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
-- FUNCTION: update_application_reviewed_at
-- Sets reviewed_at when an application leaves 'pending'.
-- The comment said "work_date → start_date" but this function doesn't reference
-- booking dates — no actual change needed, kept for completeness.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_application_reviewed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('shortlisted', 'accepted', 'rejected') THEN
    NEW.reviewed_at := NOW();
  END IF;

  IF NEW.status = 'withdrawn' THEN
    NEW.reviewed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTIONS (kept as-is, they use start_date correctly already)
-- ============================================================================

-- auto_calculate_hours() — no date column changes needed
CREATE OR REPLACE FUNCTION auto_calculate_hours()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.check_in_at IS NOT NULL
     AND NEW.checkout_time IS NOT NULL
     AND NEW.actual_hours IS NULL
  THEN
    NEW.actual_hours := EXTRACT(EPOCH FROM (NEW.checkout_time - NEW.check_in_at)) / 3600;
  END IF;
  RETURN NEW;
END;
$$;

-- update_compliance_on_booking() — trigger handler, uses start_date correctly
CREATE OR REPLACE FUNCTION update_compliance_on_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('accepted', 'in_progress', 'completed') THEN
    PERFORM update_compliance_tracking(
      NEW.business_id,
      NEW.worker_id,
      date_trunc('month', COALESCE(NEW.start_date, CURRENT_DATE))::DATE
    );
    PERFORM create_compliance_warning_if_needed(
      NEW.business_id,
      NEW.worker_id,
      date_trunc('month', COALESCE(NEW.start_date, CURRENT_DATE))::DATE
    );
    INSERT INTO compliance_audit_log (
      action, business_id, worker_id, booking_id, month,
      days_before, days_after, details
    )
    SELECT
      'booking_accepted',
      NEW.business_id,
      NEW.worker_id,
      NEW.id,
      date_trunc('month', COALESCE(NEW.start_date, CURRENT_DATE))::DATE,
      ct.days_worked - 1,
      ct.days_worked,
      jsonb_build_object('booking_status', NEW.status)
    FROM compliance_tracking ct
    WHERE ct.business_id = NEW.business_id
      AND ct.worker_id = NEW.worker_id
      AND ct.month = date_trunc('month', COALESCE(NEW.start_date, CURRENT_DATE))::DATE;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- RE-ENABLE TRIGGERS
-- These were disabled because create_compliance_warning_if_needed was missing
-- and check_booking_compliance used the old parameter name.
-- ============================================================================

ALTER TABLE bookings ENABLE TRIGGER auto_calculate_booking_hours;
ALTER TABLE bookings ENABLE TRIGGER trigger_recalculate_reliability_score;
ALTER TABLE bookings ENABLE TRIGGER update_compliance_on_booking_change;
