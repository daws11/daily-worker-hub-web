-- Migration: Add Two-Way Review Support
-- Date: 2026-02-23
-- Description: Enable mutual reviews between businesses and workers with reviewer type tracking and 'would rehire' feature

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Create reviewer_type enum
CREATE TYPE reviewer_type AS ENUM ('business', 'worker');

-- ============================================================================
-- REVIEWS TABLE - Two-Way Review Columns
-- ============================================================================

-- Add business_id column (nullable to support worker reviews of businesses)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add reviewer_type column to track who created the review
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS reviewer reviewer_type NOT NULL DEFAULT 'business';

-- Add would_rehire column for business reviews (boolean, nullable)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS would_rehire BOOLEAN DEFAULT NULL;

-- ============================================================================
-- UNIQUE CONSTRAINT UPDATE
-- Drop old constraint and add new one to support two-way reviews
-- ============================================================================

-- Drop the old unique constraint
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_booking_id_worker_id_key;

-- Add new unique constraint to allow one review from each party per booking
ALTER TABLE reviews
  ADD CONSTRAINT reviews_booking_id_reviewer_unique UNIQUE (booking_id, reviewer);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Add index for business_id
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);

-- Add index for reviewer_type
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer);

-- Add composite index for would_rehire queries (business reviews)
CREATE INDEX IF NOT EXISTS idx_reviews_would_rehire ON reviews(would_rehire) WHERE would_rehire IS NOT NULL;

-- Add index for rating aggregation by reviewer type
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_rating ON reviews(reviewer, rating);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN reviews.business_id IS 'Business ID (set when reviewer is worker, NULL when reviewer is business)';
COMMENT ON COLUMN reviews.reviewer IS 'Type of reviewer: business or worker';
COMMENT ON COLUMN reviews.would_rehire IS 'Would rehire checkbox (only applicable when reviewer is business)';
COMMENT ON CONSTRAINT reviews_booking_id_reviewer_unique IS 'Ensures one review per booking per reviewer type (business can review worker, worker can review business)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICY UPDATES
-- Enable two-way review creation for businesses and workers
-- ============================================================================

-- Enable RLS on reviews table if not already enabled
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing review insert policy if it exists
DROP POLICY IF EXISTS "Reviews can be created by business owner" ON reviews;

-- Create new policy for businesses to create reviews (reviewing workers)
CREATE POLICY "Businesses can create reviews for workers"
ON reviews FOR INSERT
WITH CHECK (
  reviewer = 'business'
  AND EXISTS (
    SELECT 1 FROM bookings
    JOIN businesses ON businesses.id = bookings.business_id
    WHERE bookings.id = booking_id
      AND businesses.user_id = auth.uid()
      AND bookings.status = 'completed'
  )
);

-- Create new policy for workers to create reviews (reviewing businesses)
CREATE POLICY "Workers can create reviews for businesses"
ON reviews FOR INSERT
WITH CHECK (
  reviewer = 'worker'
  AND EXISTS (
    SELECT 1 FROM bookings
    JOIN workers ON workers.id = bookings.worker_id
    WHERE bookings.id = booking_id
      AND workers.user_id = auth.uid()
      AND bookings.status = 'completed'
  )
);

-- Drop existing select policy if it exists
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;

-- Create new select policy (everyone can view reviews)
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. Reviews can be created by both businesses (reviewing workers) and workers (reviewing businesses)
-- 2. Each booking can have at most 2 reviews: one from business, one from worker
-- 3. Reviews can only be created for completed bookings (status = 'completed')
-- 4. The would_rehire field is only applicable when reviewer = 'business'
-- 5. business_id is set when reviewer = 'worker', NULL when reviewer = 'business'
-- 6. worker_id remains in the schema but is conceptually the "reviewee" when reviewer = 'business'
-- 7. Indexes on reviewer_type and would_rehire enable efficient aggregation queries
-- 8. All reviews are publicly visible for transparency and trust building
-- ============================================================================
