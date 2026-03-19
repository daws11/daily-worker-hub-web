-- ============================================================================
-- BOOKING FLOW IMPLEMENTATION
-- ============================================================================
-- This migration adds job applications table and enhances bookings table
-- for the complete booking flow from application to completion.
-- Version: 20260302000001
-- Date: 2026-03-02
-- ============================================================================

-- ============================================================================
-- CREATE JOB_APPLICATIONS TABLE
-- ============================================================================
-- Stores worker job applications separate from bookings.
-- Applications have a workflow: pending -> shortlisted -> accepted/rejected
-- When accepted, a booking is created linking to this application.

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Application status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'shortlisted',
    'accepted',
    'rejected',
    'withdrawn'
  )),

  -- Application details
  cover_letter TEXT,
  proposed_wage NUMERIC(12, 2) DEFAULT NULL,

  -- Availability (JSONB structure for flexibility)
  -- Format: [{ "day_of_week": 1, "start": "08:00", "end": "17:00" }]
  availability_json JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  responded_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one application per worker per job
  UNIQUE(job_id, worker_id)
);

-- ============================================================================
-- ADD BOOKING FLOW COLUMNS TO BOOKINGS TABLE
-- ============================================================================

-- Link booking to the original job application
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL;

-- Worker check-in/check-out tracking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ;

-- Actual hours worked (calculated from check-in/check-out or manually set)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(5, 2) DEFAULT NULL;

-- External payment provider ID (Stripe, Midtrans, etc.)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_id TEXT DEFAULT NULL;

-- Ensure payment_status uses the existing enum, set default if not set
-- Note: payment_status column and enum already exist from previous migration
ALTER TABLE bookings
  ALTER COLUMN payment_status SET DEFAULT 'pending_review';

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Job applications indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_worker_id ON job_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_business_id ON job_applications(business_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON job_applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);

-- Composite index for business application list queries
CREATE INDEX IF NOT EXISTS idx_job_applications_business_status
  ON job_applications(business_id, status, applied_at DESC);

-- Bookings new columns indexes
CREATE INDEX IF NOT EXISTS idx_bookings_application_id ON bookings(application_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_at ON bookings(check_in_at);
CREATE INDEX IF NOT EXISTS idx_bookings_actual_hours ON bookings(actual_hours);

-- Note: idx_bookings_payment_status already exists from previous migration

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR JOB_APPLICATIONS
-- ============================================================================

-- Enable RLS on job_applications table
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Workers can view their own applications
CREATE POLICY "Workers can view own applications"
  ON job_applications FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Businesses can view applications for their jobs
CREATE POLICY "Businesses can view applications for their jobs"
  ON job_applications FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Workers can create applications
CREATE POLICY "Workers can create applications"
  ON job_applications FOR INSERT
  WITH CHECK (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Workers can withdraw their own pending applications
CREATE POLICY "Workers can withdraw own applications"
  ON job_applications FOR UPDATE
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'withdrawn'
  );

-- Businesses can update application status (shortlist, accept, reject)
CREATE POLICY "Businesses can update applications"
  ON job_applications FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    status IN ('shortlisted', 'accepted', 'rejected')
  );

-- ============================================================================
-- UPDATE BOOKINGS RLS POLICIES FOR NEW COLUMNS
-- ============================================================================

-- Workers can check in to their own accepted bookings
CREATE POLICY "Workers can check in to own bookings"
  ON bookings FOR UPDATE
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
    AND status = 'accepted'
  )
  WITH CHECK (
    check_in_at IS NOT NULL
    AND status = 'in_progress'
  );

-- Workers can check out from their in-progress bookings
CREATE POLICY "Workers can check out from own bookings"
  ON bookings FOR UPDATE
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
    AND status = 'in_progress'
  )
  WITH CHECK (
    check_in_at IS NOT NULL
    AND actual_hours IS NOT NULL
    AND checkout_time IS NOT NULL
    AND status = 'completed'
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update updated_at timestamp for job_applications
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update reviewed_at when status changes from pending
CREATE OR REPLACE FUNCTION update_application_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('shortlisted', 'accepted', 'rejected') THEN
    NEW.reviewed_at = NOW();
    NEW.responded_at = CASE WHEN NEW.status IN ('accepted', 'rejected') THEN NOW() ELSE NEW.responded_at END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reviewed_at
CREATE TRIGGER update_application_reviewed_at
  BEFORE UPDATE OF status ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_reviewed_at();

-- Function to auto-calculate actual_hours if check_in_at and check_out_at exist
CREATE OR REPLACE FUNCTION auto_calculate_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- If check_in_at and checkout_time exist but actual_hours is NULL, calculate it
  IF NEW.check_in_at IS NOT NULL
     AND NEW.checkout_time IS NOT NULL
     AND NEW.actual_hours IS NULL
  THEN
    NEW.actual_hours := EXTRACT(EPOCH FROM (NEW.checkout_time - NEW.check_in_at)) / 3600;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-calculation
CREATE TRIGGER auto_calculate_booking_hours
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_hours();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE job_applications IS 'Worker job applications before booking acceptance. Applications become bookings when accepted.';
COMMENT ON COLUMN job_applications.status IS 'Application workflow: pending -> shortlisted -> accepted/rejected/withdrawn';
COMMENT ON COLUMN job_applications.cover_letter IS 'Optional cover letter from worker';
COMMENT ON COLUMN job_applications.proposed_wage IS 'Worker''s proposed wage (optional, may differ from job budget)';
COMMENT ON COLUMN job_applications.availability_json IS 'JSON array of available time slots: [{day_of_week: 1, start: "08:00", end: "17:00"}]';
COMMENT ON COLUMN job_applications.applied_at IS 'When worker submitted application';
COMMENT ON COLUMN job_applications.reviewed_at IS 'When business first reviewed the application';
COMMENT ON COLUMN job_applications.responded_at IS 'When business made final decision (accept/reject)';

COMMENT ON COLUMN bookings.application_id IS 'Links booking to the original job application';
COMMENT ON COLUMN bookings.check_in_at IS 'Timestamp when worker started work (checked in)';
COMMENT ON COLUMN bookings.actual_hours IS 'Actual hours worked (can be auto-calculated from check-in/out or manually set)';
COMMENT ON COLUMN bookings.payment_id IS 'External payment provider transaction ID (Stripe, Midtrans, etc.)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
