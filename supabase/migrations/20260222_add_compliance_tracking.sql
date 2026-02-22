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

-- Create RLS policies
-- Policy: Businesses can view compliance tracking for their own business
CREATE POLICY "Businesses can view own compliance tracking"
  ON public.compliance_tracking
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Workers can view compliance tracking for themselves
CREATE POLICY "Workers can view own compliance tracking"
  ON public.compliance_tracking
  FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view all compliance tracking data
CREATE POLICY "Admins can view all compliance tracking data"
  ON public.compliance_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: System can insert compliance tracking data (via triggers/functions)
CREATE POLICY "Authenticated users can insert compliance tracking data"
  ON public.compliance_tracking
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: System can update compliance tracking data (via triggers/functions)
CREATE POLICY "Authenticated users can update compliance tracking data"
  ON public.compliance_tracking
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

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
