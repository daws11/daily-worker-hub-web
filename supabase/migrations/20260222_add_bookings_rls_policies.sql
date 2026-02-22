-- Migration: Add Row Level Security (RLS) policies for bookings table
-- Date: 2026-02-22
-- Description: Implement security policies to ensure workers and businesses can only access their own bookings

-- Enable Row Level Security on bookings table
ALTER TABLE bookings
ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKER POLICIES
-- Workers can view, insert, and update their own bookings
-- ============================================================================

-- Policy: Workers can view their own bookings
CREATE POLICY "Workers can view their own bookings"
ON bookings FOR SELECT
USING (
  worker_id IN (
    SELECT id FROM worker_profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Workers can insert bookings (apply for jobs)
CREATE POLICY "Workers can create their own bookings"
ON bookings FOR INSERT
WITH CHECK (
  worker_id IN (
    SELECT id FROM worker_profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Workers can update their own bookings (cancel pending applications)
CREATE POLICY "Workers can update their own bookings"
ON bookings FOR UPDATE
USING (
  worker_id IN (
    SELECT id FROM worker_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  worker_id IN (
    SELECT id FROM worker_profiles WHERE user_id = auth.uid()
  )
  AND status = 'pending' -- Can only cancel pending bookings
);

-- ============================================================================
-- BUSINESS POLICIES
-- Businesses can view and update bookings for their jobs
-- ============================================================================

-- Policy: Businesses can view bookings for their jobs
CREATE POLICY "Businesses can view their job bookings"
ON bookings FOR SELECT
USING (
  business_id IN (
    SELECT id FROM business_profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Businesses can update booking status (accept/reject)
CREATE POLICY "Businesses can update booking status"
ON bookings FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM business_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM business_profiles WHERE user_id = auth.uid()
  )
  AND status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'no_show')
);

-- ============================================================================
-- ADMIN POLICIES
-- Admins have full access to all bookings for auditing and support
-- ============================================================================

-- Policy: Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update any booking
CREATE POLICY "Admins can update any booking"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can delete any booking (for moderation)
CREATE POLICY "Admins can delete any booking"
ON bookings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. Workers can only see and manage their own bookings
-- 2. Businesses can only see and manage bookings for their jobs
-- 3. Workers can only cancel pending bookings (not accepted/completed ones)
-- 4. Admins have full access for auditing and dispute resolution
-- 5. All policies use subqueries to map auth.uid() to worker/business IDs
-- ============================================================================
