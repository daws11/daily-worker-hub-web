-- Create compliance_warnings table
-- This table tracks 21-day violations per worker-business pair as required by PP 35/2021
-- Warning levels: none (≤15 days), warning (16-20 days), blocked (≥21 days)

CREATE TABLE IF NOT EXISTS public.compliance_warnings (
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

  -- Warning level based on days worked:
  -- 'none' - 0-15 days (compliant)
  -- 'warning' - 16-20 days (approaching limit)
  -- 'blocked' - 21+ days (PP 35/2021 violation)
  warning_level TEXT NOT NULL DEFAULT 'none' CHECK (warning_level IN ('none', 'warning', 'blocked')),

  -- Whether this violation has been acknowledged by the business
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique business-worker-month combination
  UNIQUE(business_id, worker_id, month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_business_id ON public.compliance_warnings(business_id);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_worker_id ON public.compliance_warnings(worker_id);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_month ON public.compliance_warnings(month);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_warning_level ON public.compliance_warnings(warning_level);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_business_worker_month ON public.compliance_warnings(business_id, worker_id, month);

-- Add comments for documentation
COMMENT ON TABLE public.compliance_warnings IS 'Tracks PP 35/2021 compliance warnings per worker-business pair. Warning levels: none (0-15 days), warning (16-20 days), blocked (21+ days)';
COMMENT ON COLUMN public.compliance_warnings.month IS 'First day of the month being tracked (e.g., 2026-02-01 for February 2026)';
COMMENT ON COLUMN public.compliance_warnings.days_worked IS 'Number of days worked in this month';
COMMENT ON COLUMN public.compliance_warnings.warning_level IS 'Warning level: none (0-15), warning (16-20), blocked (21+)';
COMMENT ON COLUMN public.compliance_warnings.acknowledged IS 'Whether the business has acknowledged this warning';

-- Enable Row Level Security (RLS)
ALTER TABLE public.compliance_warnings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKER POLICIES
-- Workers can only view their own compliance warnings
-- ============================================================================

-- Policy: Workers can view their own compliance warnings
CREATE POLICY "Workers can view their own compliance warnings"
ON compliance_warnings FOR SELECT
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- BUSINESS POLICIES
-- Businesses can view and update their compliance warnings
-- ============================================================================

-- Policy: Businesses can view their compliance warnings
CREATE POLICY "Businesses can view their compliance warnings"
ON compliance_warnings FOR SELECT
USING (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
);

-- Policy: Businesses can update acknowledgement status
CREATE POLICY "Businesses can update acknowledgement status"
ON compliance_warnings FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
  AND acknowledged = TRUE -- Only allow updating acknowledged flag to true
);

-- ============================================================================
-- ADMIN POLICIES
-- Admins have full access for auditing and management
-- ============================================================================

-- Policy: Admins can view all compliance warnings
CREATE POLICY "Admins can view all compliance warnings"
ON compliance_warnings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update any compliance warning
CREATE POLICY "Admins can update any compliance warning"
ON compliance_warnings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can delete any compliance warning (for moderation)
CREATE POLICY "Admins can delete any compliance warning"
ON compliance_warnings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- TRIGGER FUNCTION: update_compliance_warnings_updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_compliance_warnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_compliance_warnings_updated_at
  BEFORE UPDATE ON public.compliance_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_warnings_updated_at();

-- ============================================================================
-- FUNCTION: update_compliance_warnings_for_booking
-- ============================================================================
-- Trigger function that updates compliance_warnings when a booking's status
-- changes. Automatically tracks 21-day violations per worker-business pair.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_compliance_warnings_for_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_month_start DATE;
  v_current_days INTEGER;
  v_warning_level TEXT;
BEGIN
  -- Only proceed if status has changed to 'accepted' or 'completed'
  IF (TG_OP = 'INSERT' AND NEW.status IN ('accepted', 'completed'))
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'completed')) THEN

    -- Calculate the month for this booking (first day of the month)
    v_month_start := date_trunc('month', COALESCE(NEW.start_date, NEW.created_at));

    -- Calculate current days worked using the helper function
    v_current_days := public.calculate_days_worked(NEW.business_id, NEW.worker_id, v_month_start);

    -- Determine warning level based on days worked
    IF v_current_days >= 21 THEN
      v_warning_level := 'blocked';
    ELSIF v_current_days >= 16 THEN
      v_warning_level := 'warning';
    ELSE
      v_warning_level := 'none';
    END IF;

    -- Insert or update compliance_warnings record
    INSERT INTO public.compliance_warnings (
      business_id,
      worker_id,
      month,
      days_worked,
      warning_level
    )
    VALUES (
      NEW.business_id,
      NEW.worker_id,
      v_month_start,
      v_current_days,
      v_warning_level
    )
    ON CONFLICT (business_id, worker_id, month)
    DO UPDATE SET
      days_worked = EXCLUDED.days_worked,
      warning_level = EXCLUDED.warning_level,
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
    RAISE WARNING 'Error updating compliance warnings for booking %: %',
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
COMMENT ON FUNCTION update_compliance_warnings_for_booking IS 'Trigger function that updates compliance_warnings when booking status changes. Automatically tracks PP 35/2021 violations (21-day limit).';

-- ============================================================================
-- TRIGGER: on_booking_status_change_for_warnings
-- ============================================================================

DROP TRIGGER IF EXISTS on_booking_status_change_for_warnings ON public.bookings;

CREATE TRIGGER on_booking_status_change_for_warnings
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_compliance_warnings_for_booking();

-- Add comment for documentation
COMMENT ON TRIGGER on_booking_status_change_for_warnings ON public.bookings IS 'Automatically updates compliance_warnings when booking status becomes accepted or completed';
