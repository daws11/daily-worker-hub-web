-- Migration: Add Job Hours Fields
-- Description: Adds columns for hours_needed and overtime_multiplier to jobs table for wage calculation

-- Add hours-related columns to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS hours_needed INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS overtime_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.0;

-- Add constraints (drop if exists first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_hours_needed' AND conrelid = 'jobs'::regclass) THEN
    ALTER TABLE jobs DROP CONSTRAINT check_hours_needed;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_overtime_multiplier' AND conrelid = 'jobs'::regclass) THEN
    ALTER TABLE jobs DROP CONSTRAINT check_overtime_multiplier;
  END IF;
END $$;

ALTER TABLE jobs
  ADD CONSTRAINT check_hours_needed
    CHECK (hours_needed >= 4 AND hours_needed <= 12),
  ADD CONSTRAINT check_overtime_multiplier
    CHECK (overtime_multiplier >= 1.0 AND overtime_multiplier <= 1.5);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_jobs_hours_needed ON jobs(hours_needed);

-- Add comment for documentation
COMMENT ON COLUMN jobs.hours_needed IS 'Hours needed for the job (4-12 hours minimum)';
COMMENT ON COLUMN jobs.overtime_multiplier IS 'Overtime multiplier (1.0 for 4-8 hours, 1.5 for 9-12 hours)';
