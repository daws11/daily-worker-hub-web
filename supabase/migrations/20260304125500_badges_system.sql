-- ============================================================================
-- Daily Worker Hub - Badges System Migration
-- ============================================================================
-- This migration creates the badges and worker_badges tables for gamification
-- and tier progression.
-- Version: 20260304125500
-- Date: 2026-03-04
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Badge types
CREATE TYPE badge_type AS ENUM ('tier', 'achievement', 'skill');

-- Tier requirements
CREATE TYPE tier_requirement AS ENUM ('classic', 'pro', 'elite', 'champion');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Badges table (badge definitions)
-- ----------------------------------------------------------------------------
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT DEFAULT NULL,
  badge_type badge_type NOT NULL,
  tier_requirement tier_requirement DEFAULT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on badge_type for faster queries
CREATE INDEX idx_badges_type ON badges(badge_type);

-- Add index on tier_requirement for faster queries
CREATE INDEX idx_badges_tier ON badges(tier_requirement) WHERE tier_requirement IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Worker badges table (earned badges by workers)
-- ----------------------------------------------------------------------------
CREATE TABLE worker_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, badge_id)
);

-- Add index on worker_id for faster queries
CREATE INDEX idx_worker_badges_worker ON worker_badges(worker_id);

-- Add index on badge_id for faster queries
CREATE INDEX idx_worker_badges_badge ON worker_badges(badge_id);

-- Add index on earned_at for sorting
CREATE INDEX idx_worker_badges_earned ON worker_badges(earned_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on badges table
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Enable RLS on worker_badges table
ALTER TABLE worker_badges ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Badges policies
-- ----------------------------------------------------------------------------

-- Public can view active badge definitions
CREATE POLICY "Badges are viewable by everyone"
ON badges FOR SELECT
USING (is_active = TRUE);

-- Only admins can insert badges (using service role)
CREATE POLICY "Service role can insert badges"
ON badges FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Only admins can update badges (using service role)
CREATE POLICY "Service role can update badges"
ON badges FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Only admins can delete badges (using service role)
CREATE POLICY "Service role can delete badges"
ON badges FOR DELETE
USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- Worker badges policies
-- ----------------------------------------------------------------------------

-- Workers can view their own badges
CREATE POLICY "Workers can view own badges"
ON worker_badges FOR SELECT
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- Businesses can view worker badges (for job listings)
CREATE POLICY "Businesses can view worker badges"
ON worker_badges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workers w
    WHERE w.id = worker_badges.worker_id
  )
);

-- System can insert badges (using service role)
CREATE POLICY "Service role can assign badges"
ON worker_badges FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- System can update badges (using service role)
CREATE POLICY "Service role can update worker badges"
ON worker_badges FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- System can delete badges (using service role)
CREATE POLICY "Service role can delete worker badges"
ON worker_badges FOR DELETE
USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update badges timestamp
CREATE TRIGGER badges_updated_at
BEFORE UPDATE ON badges
FOR EACH ROW
EXECUTE FUNCTION update_badges_updated_at();

-- ============================================================================
-- SEED DATA - Initial Badges
-- ============================================================================

-- Insert Tier Badges
INSERT INTO badges (name, description, icon_url, badge_type, tier_requirement, criteria, points) VALUES
(
  'Classic',
  'Starting tier - Welcome to Daily Worker Hub!',
  '/badges/classic.svg',
  'tier',
  'classic',
  '{"description": "Default tier for all new workers"}'::jsonb,
  0
),
(
  'Pro',
  'Experienced worker with proven track record',
  '/badges/pro.svg',
  'tier',
  'pro',
  '{"jobs_completed": 10, "rating_min": 4.0}'::jsonb,
  100
),
(
  'Elite',
  'Top performer with excellent ratings and reliability',
  '/badges/elite.svg',
  'tier',
  'elite',
  '{"jobs_completed": 50, "rating_min": 4.5, "on_time_percentage": 90}'::jsonb,
  500
),
(
  'Champion',
  'Elite worker with outstanding performance and leadership',
  '/badges/champion.svg',
  'tier',
  'champion',
  '{"jobs_completed": 100, "rating_min": 4.8, "on_time_percentage": 95, "reliability_score": 95}'::jsonb,
  1000
);

-- Insert Achievement Badges
INSERT INTO badges (name, description, icon_url, badge_type, tier_requirement, criteria, points) VALUES
(
  'First Job',
  'Completed your first job on Daily Worker Hub',
  '/badges/first-job.svg',
  'achievement',
  NULL,
  '{"jobs_completed": 1}'::jsonb,
  10
),
(
  '10 Jobs',
  'Completed 10 jobs - You are building momentum!',
  '/badges/10-jobs.svg',
  'achievement',
  NULL,
  '{"jobs_completed": 10}'::jsonb,
  50
),
(
  '50 Jobs',
  'Completed 50 jobs - You are a reliable worker!',
  '/badges/50-jobs.svg',
  'achievement',
  NULL,
  '{"jobs_completed": 50}'::jsonb,
  200
),
(
  '100 Jobs',
  'Completed 100 jobs - You are a veteran worker!',
  '/badges/100-jobs.svg',
  'achievement',
  NULL,
  '{"jobs_completed": 100}'::jsonb,
  500
),
(
  'Perfect Week',
  'Completed all jobs in a week with 5-star rating',
  '/badges/perfect-week.svg',
  'achievement',
  NULL,
  '{"weekly_jobs": 5, "weekly_rating": 5.0}'::jsonb,
  100
),
(
  'Early Bird',
  'Accepted 10 jobs within 1 hour of posting',
  '/badges/early-bird.svg',
  'achievement',
  NULL,
  '{"fast_acceptances": 10}'::jsonb,
  75
);

-- Insert Skill Badges
INSERT INTO badges (name, description, icon_url, badge_type, tier_requirement, criteria, points) VALUES
(
  'Top Rated',
  'Maintained 4.8+ rating over 20+ jobs',
  '/badges/top-rated.svg',
  'skill',
  NULL,
  '{"jobs_completed": 20, "rating_min": 4.8}'::jsonb,
  150
),
(
  'Punctual',
  '90%+ on-time arrival rate over 20+ jobs',
  '/badges/punctual.svg',
  'skill',
  NULL,
  '{"jobs_completed": 20, "on_time_percentage": 90}'::jsonb,
  150
),
(
  'Reliable',
  '95%+ job completion rate with no no-shows',
  '/badges/reliable.svg',
  'skill',
  NULL,
  '{"jobs_completed": 30, "completion_rate": 95, "no_shows": 0}'::jsonb,
  200
),
(
  'Super Communicator',
  'Excellent communication with businesses',
  '/badges/communicator.svg',
  'skill',
  NULL,
  '{"jobs_completed": 15, "response_time_avg_minutes": 30, "communication_rating": 4.5}'::jsonb,
  100
),
(
  'Customer Favorite',
  'Received 10+ positive reviews from businesses',
  '/badges/customer-favorite.svg',
  'skill',
  NULL,
  '{"positive_reviews": 10, "jobs_completed": 15}'::jsonb,
  125
);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for worker badge summary
CREATE OR REPLACE VIEW worker_badge_summary AS
SELECT
  wb.worker_id,
  w.full_name,
  COUNT(wb.id) AS total_badges,
  SUM(b.points) AS total_points,
  MAX(wb.earned_at) AS last_badge_earned_at,
  array_agg(
    json_build_object(
      'name', b.name,
      'type', b.badge_type,
      'earned_at', wb.earned_at,
      'points', b.points
    )
  ) AS badges
FROM worker_badges wb
JOIN workers w ON w.id = wb.worker_id
JOIN badges b ON b.id = wb.badge_id
GROUP BY wb.worker_id, w.full_name;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if worker qualifies for a badge
CREATE OR REPLACE FUNCTION check_badge_eligibility(
  p_worker_id UUID,
  p_badge_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  badge_record RECORD;
  worker_stats RECORD;
  criteria_json JSONB;
  is_eligible BOOLEAN := TRUE;
BEGIN
  -- Get badge criteria
  SELECT criteria INTO criteria_json
  FROM badges
  WHERE id = p_badge_id;
  
  -- Get worker statistics (simplified version - can be expanded)
  SELECT
    COUNT(CASE WHEN b.status IN ('completed', 'accepted') THEN 1 END) AS jobs_completed,
    AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating END) AS avg_rating
  INTO worker_stats
  FROM bookings b
  LEFT JOIN reviews r ON r.booking_id = b.id
  WHERE b.worker_id = p_worker_id;
  
  -- Check criteria (basic implementation)
  -- Jobs completed check
  IF (criteria_json->>'jobs_completed') IS NOT NULL THEN
    IF worker_stats.jobs_completed < (criteria_json->>'jobs_completed')::INTEGER THEN
      is_eligible := FALSE;
    END IF;
  END IF;
  
  -- Rating check
  IF (criteria_json->>'rating_min') IS NOT NULL THEN
    IF worker_stats.avg_rating IS NULL OR worker_stats.avg_rating < (criteria_json->>'rating_min')::DECIMAL THEN
      is_eligible := FALSE;
    END IF;
  END IF;
  
  RETURN is_eligible;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award badge to worker
CREATE OR REPLACE FUNCTION award_badge(
  p_worker_id UUID,
  p_badge_id UUID,
  p_progress JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_badge_id UUID;
BEGIN
  INSERT INTO worker_badges (worker_id, badge_id, progress)
  VALUES (p_worker_id, p_badge_id, p_progress)
  RETURNING id INTO new_badge_id;
  
  RETURN new_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE badges IS 'Badge definitions for gamification system';
COMMENT ON TABLE worker_badges IS 'Badges earned by workers';
COMMENT ON COLUMN badges.badge_type IS 'Type of badge: tier (level), achievement (milestone), or skill (competency)';
COMMENT ON COLUMN badges.tier_requirement IS 'Required tier level for tier badges';
COMMENT ON COLUMN badges.criteria IS 'JSON criteria required to earn this badge';
COMMENT ON COLUMN badges.points IS 'Points awarded when badge is earned';
COMMENT ON COLUMN worker_badges.progress IS 'JSON tracking progress toward badge completion';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
