-- ============================================================================
-- Daily Worker Hub - Worker Availability System
-- ============================================================================
-- This migration adds support for worker availability management
-- Workers can set their availability per day (Monday-Sunday)
-- Each day has 4-12 hour availability blocks
-- Version: 20260227
-- Date: 2026-02-27
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create worker_availabilities table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_availabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Monday, 7=Sunday
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23), -- Hour (0-23)
  end_hour INTEGER NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23), -- Hour (0-23)
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure each day has only one availability block per worker
  UNIQUE(worker_id, day_of_week),

  -- Ensure end_hour is after start_hour
  CHECK (end_hour > start_hour),

  -- Ensure availability block is 4-12 hours
  CHECK (end_hour - start_hour >= 4 AND end_hour - start_hour <= 12)
);

-- ----------------------------------------------------------------------------
-- Create indexes for quick querying
-- ----------------------------------------------------------------------------

-- Index for worker availability lookups
CREATE INDEX IF NOT EXISTS idx_worker_availabilities_worker_id
  ON worker_availabilities(worker_id);

-- Index for day-based queries
CREATE INDEX IF NOT EXISTS idx_worker_availabilities_day_of_week
  ON worker_availabilities(day_of_week);

-- Index for available workers by day and time
CREATE INDEX IF NOT EXISTS idx_worker_availabilities_available_day_time
  ON worker_availabilities(day_of_week, start_hour, end_hour)
  WHERE is_available = true;

-- Composite index for matching workers to jobs
CREATE INDEX IF NOT EXISTS idx_worker_availabilities_matching
  ON worker_availabilities(worker_id, day_of_week, is_available)
  WHERE is_available = true;

-- ----------------------------------------------------------------------------
-- Add helpful comments
-- ----------------------------------------------------------------------------

COMMENT ON TABLE worker_availabilities IS 'Stores worker availability by day of week. Each worker can set one availability block per day (4-12 hours).';

COMMENT ON COLUMN worker_availabilities.worker_id IS 'Reference to the worker';
COMMENT ON COLUMN worker_availabilities.day_of_week IS 'Day of week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday';
COMMENT ON COLUMN worker_availabilities.start_hour IS 'Start hour of availability (0-23, 24-hour format)';
COMMENT ON COLUMN worker_availabilities.end_hour IS 'End hour of availability (0-23, 24-hour format)';
COMMENT ON COLUMN worker_availabilities.is_available IS 'Whether the worker is available on this day';

-- ----------------------------------------------------------------------------
-- Create a function to update updated_at timestamp
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_worker_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Create trigger for updated_at
-- ----------------------------------------------------------------------------

CREATE TRIGGER trigger_update_worker_availability_updated_at
  BEFORE UPDATE ON worker_availabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_availability_updated_at();

-- ----------------------------------------------------------------------------
-- Create a helper function to check worker availability
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_worker_availability(
  p_worker_id UUID,
  p_day_of_week INTEGER,
  p_job_start_hour INTEGER,
  p_job_end_hour INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_available BOOLEAN;
  v_start_hour INTEGER;
  v_end_hour INTEGER;
BEGIN
  -- Get worker's availability for the day
  SELECT start_hour, end_hour, is_available
  INTO v_start_hour, v_end_hour, v_available
  FROM worker_availabilities
  WHERE worker_id = p_worker_id
    AND day_of_week = p_day_of_week;

  -- No availability set or explicitly unavailable
  IF v_start_hour IS NULL OR NOT v_available THEN
    RETURN FALSE;
  END IF;

  -- Check if job duration fits within availability block
  -- Job must be completely within the worker's available hours
  IF p_job_start_hour >= v_start_hour AND p_job_end_hour <= v_end_hour THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Create a function to get availability score (0-20 points)
-- -- 20 points: Job fits perfectly within availability
-- -- 0 points: No availability or doesn't fit
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION calculate_availability_score(
  p_worker_id UUID,
  p_day_of_week INTEGER,
  p_job_start_hour INTEGER,
  p_job_end_hour INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  IF check_worker_availability(p_worker_id, p_day_of_week, p_job_start_hour, p_job_end_hour) THEN
    RETURN 20; -- Available for full duration
  ELSE
    RETURN 0; -- Not available
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Insert sample availability data for testing (optional)
-- ----------------------------------------------------------------------------

-- Uncomment the following lines to insert sample data for existing workers
-- This will give workers a default 9-17 (9 AM - 5 PM) availability Mon-Fri

-- INSERT INTO worker_availabilities (worker_id, day_of_week, start_hour, end_hour, is_available)
-- SELECT id, day, 9, 17, true
-- FROM workers,
--      (SELECT generate_series(1, 5) AS day) days
-- ON CONFLICT (worker_id, day_of_week) DO NOTHING;
