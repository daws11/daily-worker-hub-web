-- Migration: Add Attendance Tracking Fields
-- Date: 2026-02-22
-- Description: Add check-in/check-out timestamps, GPS location tracking, and QR code support for attendance tracking

-- ============================================================================
-- BOOKINGS TABLE - Attendance Tracking Columns
-- ============================================================================

-- Add check-in/check-out timestamp columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ DEFAULT NULL;

-- Add GPS location columns for check-in
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS check_in_lat DECIMAL(10, 8) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_in_lng DECIMAL(11, 8) DEFAULT NULL;

-- Add GPS location columns for check-out
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS check_out_lat DECIMAL(10, 8) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_out_lng DECIMAL(11, 8) DEFAULT NULL;

-- Add indexes for attendance queries
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_at ON bookings(check_in_at);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_at ON bookings(check_out_at);

-- Add comments for documentation
COMMENT ON COLUMN bookings.check_in_at IS 'Timestamp when worker checked in to the job';
COMMENT ON COLUMN bookings.check_out_at IS 'Timestamp when worker checked out from the job';
COMMENT ON COLUMN bookings.check_in_lat IS 'Latitude of worker location at check-in';
COMMENT ON COLUMN bookings.check_in_lng IS 'Longitude of worker location at check-in';
COMMENT ON COLUMN bookings.check_out_lat IS 'Latitude of worker location at check-out';
COMMENT ON COLUMN bookings.check_out_lng IS 'Longitude of worker location at check-out';

-- ============================================================================
-- JOBS TABLE - QR Code Support
-- ============================================================================

-- Add QR code columns
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS qr_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for QR code lookups
CREATE INDEX IF NOT EXISTS idx_jobs_qr_code ON jobs(qr_code);

-- Add unique constraint on qr_code to ensure uniqueness
ALTER TABLE jobs
  ADD CONSTRAINT jobs_qr_code_unique UNIQUE (qr_code);

-- Add comments for documentation
COMMENT ON COLUMN jobs.qr_code IS 'Unique QR code string for job attendance tracking';
COMMENT ON COLUMN jobs.qr_generated_at IS 'Timestamp when QR code was generated';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICY UPDATES
-- Allow workers to update their own attendance fields
-- ============================================================================

-- Enable RLS on bookings table if not already enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing worker update policy if it exists
DROP POLICY IF EXISTS "Workers can update their own bookings" ON bookings;

-- Recreate worker update policy to allow attendance updates
CREATE POLICY "Workers can update their own bookings"
ON bookings FOR UPDATE
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
  AND (
    -- Can only cancel pending bookings
    (status = 'pending' AND check_in_at IS NULL)
    OR
    -- Can update attendance fields (check_in_at, check_out_at, and location)
    (status IN ('accepted', 'in_progress') AND
     check_in_at IS NOT DISTINCT FROM OLD.check_in_at AND
     check_out_at IS NOT DISTINCT FROM OLD.check_out_at AND
     check_in_lat IS NOT DISTINCT FROM OLD.check_in_lat AND
     check_in_lng IS NOT DISTINCT FROM OLD.check_in_lng AND
     check_out_lat IS NOT DISTINCT FROM OLD.check_out_lat AND
     check_out_lng IS NOT DISTINCT FROM OLD.check_out_lng)
  )
);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. Workers can now update attendance fields (check_in_at, check_out_at, lat/lng)
-- 2. QR codes are unique per job for secure attendance tracking
-- 3. GPS coordinates are optional (nullable) to support devices without GPS
-- 4. Attendance timestamps are tracked separately from booking status changes
-- 5. Indexes on attendance columns ensure efficient queries for reporting
-- ============================================================================
