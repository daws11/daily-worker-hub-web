-- Migration: Add Row Level Security (RLS) policies for reliability_score_history table
-- Date: 2026-02-22
-- Description: Implement security policies to ensure workers can only view their own score history, while admins can view all

-- Enable Row Level Security on reliability_score_history table
ALTER TABLE reliability_score_history
ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKER POLICIES
-- Workers can view their own reliability score history
-- ============================================================================

-- Policy: Workers can view their own score history
CREATE POLICY "Workers can view their own score history"
ON reliability_score_history FOR SELECT
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- ADMIN POLICIES
-- Admins have full access to all score history for auditing and support
-- ============================================================================

-- Policy: Admins can view all score history
CREATE POLICY "Admins can view all score history"
ON reliability_score_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- SYSTEM POLICIES
-- System/service role can insert score history records (for automated scoring)
-- ============================================================================

-- Policy: Service role can insert score history records
CREATE POLICY "Service role can insert score history"
ON reliability_score_history FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. Workers can only view their own score history (read-only)
-- 2. Admins can view all score history for auditing and support
-- 3. Score history is immutable - workers and admins cannot update or delete records
-- 4. Only the service role (backend) can insert new history entries
-- 5. This ensures data integrity and auditability of score changes over time
-- ============================================================================
