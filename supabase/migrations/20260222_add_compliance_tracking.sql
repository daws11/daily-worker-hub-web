-- Create compliance_tracking table
-- This table tracks the number of days worked by each worker for each business per month,
-- as required by Indonesian labor law PP 35/2021 which limits daily workers to 21 days per month.

CREATE TABLE IF NOT EXISTS public.compliance_tracking (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Foreign key to businesses table
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Foreign key to workers table
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,

  -- Month being tracked (stored as DATE for easy querying - first day of month)
  month DATE NOT NULL,

  -- Number of days worked in this month
  days_worked INTEGER NOT NULL DEFAULT 0 CHECK (days_worked >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique business-worker-month combination
  UNIQUE(business_id, worker_id, month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_business_id ON public.compliance_tracking(business_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_worker_id ON public.compliance_tracking(worker_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_month ON public.compliance_tracking(month);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_business_worker_month ON public.compliance_tracking(business_id, worker_id, month);

-- Add comments for documentation
COMMENT ON TABLE public.compliance_tracking IS 'Tracks days worked per worker-business pair per month for PP 35/2021 compliance (21-day limit for daily workers)';
COMMENT ON COLUMN public.compliance_tracking.month IS 'First day of the month being tracked (e.g., 2026-02-01 for February 2026)';
COMMENT ON COLUMN public.compliance_tracking.days_worked IS 'Number of days worked in this month. Warning at 15-18 days, block at 21 days';

-- Enable Row Level Security (RLS)
ALTER TABLE public.compliance_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKER POLICIES
-- Workers can only view their own compliance tracking records
-- ============================================================================

-- Policy: Workers can view their own compliance tracking
CREATE POLICY "Workers can view their own compliance tracking"
ON compliance_tracking FOR SELECT
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- BUSINESS POLICIES
-- Businesses can only view compliance tracking for their workers
-- ============================================================================

-- Policy: Businesses can view compliance tracking for their business
CREATE POLICY "Businesses can view their compliance tracking"
ON compliance_tracking FOR SELECT
USING (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- ADMIN POLICIES
-- Admins have full access to all compliance tracking for auditing and management
-- ============================================================================

-- Policy: Admins can view all compliance tracking
CREATE POLICY "Admins can view all compliance tracking"
ON compliance_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update any compliance tracking record
CREATE POLICY "Admins can update any compliance tracking"
ON compliance_tracking FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can delete any compliance tracking record (for moderation)
CREATE POLICY "Admins can delete any compliance tracking"
ON compliance_tracking FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. Workers can only view their own compliance tracking records
-- 2. Businesses can only view compliance tracking for their business
-- 3. Regular users cannot INSERT or UPDATE - only system triggers can modify data
-- 4. Admins have full access for auditing and dispute resolution
-- 5. The table is effectively read-only for workers and businesses
-- 6. All data modifications happen via database triggers/functions (SECURITY DEFINER)
-- ============================================================================

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_compliance_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_compliance_tracking_updated_at
  BEFORE UPDATE ON public.compliance_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_tracking_updated_at();

-- ============================================================================
-- FUNCTION: calculate_days_worked
-- ============================================================================
-- Calculates the number of days worked by a worker for a business in a specific month.
-- This is used to track compliance with PP 35/2021 (21-day limit for daily workers).
--
-- Parameters:
--   p_business_id UUID - The business ID
--   p_worker_id UUID - The worker ID
--   p_month DATE - First day of the month (e.g., '2026-02-01'::date)
--
-- Returns:
--   INTEGER - Count of accepted/completed bookings in the specified month
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_days_worked(
  p_business_id UUID,
  p_worker_id UUID,
  p_month DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_days_worked INTEGER;
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  -- Calculate the start and end of the month
  v_month_start := date_trunc('month', p_month);
  v_month_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::DATE;

  -- Count bookings with accepted or completed status within the month
  -- A booking counts as a day worked if it was accepted or completed
  -- and its start_date falls within the target month
  SELECT COUNT(*)
  INTO v_days_worked
  FROM public.bookings
  WHERE business_id = p_business_id
    AND worker_id = p_worker_id
    AND status IN ('accepted', 'completed')
    AND start_date >= v_month_start
    AND start_date <= v_month_end;

  -- Ensure non-negative result
  IF v_days_worked IS NULL THEN
    v_days_worked := 0;
  END IF;

  RETURN v_days_worked;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 0 on failure
    RAISE WARNING 'Error calculating days worked for business %, worker %, month %: %',
      p_business_id, p_worker_id, p_month, SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_days_worked IS 'Calculates days worked by a worker for a business in a month. Counts accepted/completed bookings with start_date in the specified month. Used for PP 35/2021 compliance tracking (21-day limit).';

-- ============================================================================
-- FUNCTION: update_compliance_tracking_for_booking
-- ============================================================================
-- Trigger function that updates compliance_tracking when a booking's status
-- changes to 'accepted' or 'completed'. This ensures the days_worked counter
-- stays up-to-date for PP 35/2021 compliance monitoring.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_compliance_tracking_for_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_month_start DATE;
  v_current_days INTEGER;
BEGIN
  -- Only proceed if status has changed to 'accepted' or 'completed'
  -- Check both INSERT (NEW only) and UPDATE (OLD vs NEW) scenarios
  IF (TG_OP = 'INSERT' AND NEW.status IN ('accepted', 'completed'))
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'completed')) THEN

    -- Calculate the month for this booking (first day of the month)
    v_month_start := date_trunc('month', COALESCE(NEW.start_date, NEW.created_at));

    -- Calculate current days worked using the helper function
    v_current_days := public.calculate_days_worked(NEW.business_id, NEW.worker_id, v_month_start);

    -- Insert or update compliance_tracking record
    INSERT INTO public.compliance_tracking (business_id, worker_id, month, days_worked)
    VALUES (NEW.business_id, NEW.worker_id, v_month_start, v_current_days)
    ON CONFLICT (business_id, worker_id, month)
    DO UPDATE SET
      days_worked = EXCLUDED.days_worked,
      updated_at = NOW();

  END IF;

  -- Return the row as-is for INSERT/UPDATE operations
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the booking operation
    RAISE WARNING 'Error updating compliance tracking for booking %: %',
      COALESCE(NEW.id, OLD.id), SQLERRM;

    -- Still return the row to allow the booking operation to succeed
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION update_compliance_tracking_for_booking IS 'Trigger function that updates compliance_tracking when booking status changes to accepted/completed. Automatically maintains days_worked counter for PP 35/2021 compliance.';

-- ============================================================================
-- TRIGGER: on_booking_status_change_for_compliance
-- ============================================================================
-- Creates a trigger on the bookings table that automatically updates
-- compliance_tracking when a booking status changes to 'accepted' or 'completed'.
-- ============================================================================

DROP TRIGGER IF EXISTS on_booking_status_change_for_compliance ON public.bookings;

CREATE TRIGGER on_booking_status_change_for_compliance
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_compliance_tracking_for_booking();

-- Add comment for documentation
COMMENT ON TRIGGER on_booking_status_change_for_compliance ON public.bookings IS 'Automatically updates compliance_tracking when booking status becomes accepted or completed';
