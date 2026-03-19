-- Migration: Add Matching Fields
-- Description: Adds matching_score column to bookings table for worker-job matching algorithm

-- Add matching_score column to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS matching_score INTEGER;

-- Add constraint for matching_score range (0-115 max)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_matching_score' AND conrelid = 'bookings'::regclass) THEN
    ALTER TABLE bookings DROP CONSTRAINT check_matching_score;
  END IF;
END $$;

ALTER TABLE bookings
  ADD CONSTRAINT check_matching_score
    CHECK (matching_score IS NULL OR (matching_score >= 0 AND matching_score <= 115));

-- Add index for sorting by matching score
CREATE INDEX IF NOT EXISTS idx_bookings_matching_score ON bookings(matching_score DESC) WHERE matching_score IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN bookings.matching_score IS 'Matching algorithm score (0-100 base + 0-20 tier bonus = 115 max)';
