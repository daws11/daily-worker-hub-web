-- ============================================================================
-- Daily Worker Hub - Achievement Badges Migration
-- ============================================================================
-- This migration creates the achievement/gamification badge system for workers.
-- Version: 20260318000000
-- Date: 2026-03-18
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Achievement badge types
CREATE TYPE achievement_badge_type AS ENUM (
  'FIRST_JOB',           -- Completed first job
  'TOP_RATED',           -- Average rating >= 4.5 with at least 5 reviews
  'RELIABLE',            -- 95%+ attendance rate with 10+ completed jobs
  'FAST_RESPONDER',      -- Average response time < 1 hour
  'SUPER_WORKER',        -- Completed 50+ jobs with 4.0+ rating
  'EARLY_BIRD',          -- Completed 10+ early morning jobs (before 8 AM)
  'NIGHT_OWL',           -- Completed 10+ night jobs (after 10 PM)
  'WEEKEND_WARRIOR',     -- Completed 20+ weekend jobs
  'RISING_STAR',         -- New worker (30 days) with 4.5+ rating
  'VETERAN',             -- Active for 1+ year with 20+ completed jobs
  'FIVE_STAR',           -- Received 5-star rating on 10+ jobs
  'PERFECT_ATTENDANCE',  -- 100% attendance with 15+ jobs
  'QUICK_LEARNER',       -- Completed 5 jobs in first week
  'CROWD_FAVORITE',      -- Received 20+ positive reviews
  'CONSISTENT_EARNER',   -- Earned consistently for 3+ months
  'TEAM_PLAYER',         -- Worked with 10+ different businesses
  'GO_GETTER',           -- Applied to 50+ jobs
  'PROFESSIONAL'         -- Completed profile with verified phone, address
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Achievement badges table (stores earned badges for workers)
-- ----------------------------------------------------------------------------
CREATE TABLE worker_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  badge_type achievement_badge_type NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one badge per type per worker
  UNIQUE(worker_id, badge_type)
);

-- ----------------------------------------------------------------------------
-- Badge progress table (tracks progress toward unearned badges)
-- ----------------------------------------------------------------------------
CREATE TABLE worker_badge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  badge_type achievement_badge_type NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  target_value INTEGER NOT NULL DEFAULT 1,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one progress record per badge type per worker
  UNIQUE(worker_id, badge_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Worker achievements indexes
CREATE INDEX idx_worker_achievements_worker_id ON worker_achievements(worker_id);
CREATE INDEX idx_worker_achievements_badge_type ON worker_achievements(badge_type);
CREATE INDEX idx_worker_achievements_earned_at ON worker_achievements(earned_at);

-- Badge progress indexes
CREATE INDEX idx_worker_badge_progress_worker_id ON worker_badge_progress(worker_id);
CREATE INDEX idx_worker_badge_progress_badge_type ON worker_badge_progress(badge_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE worker_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_badge_progress ENABLE ROW LEVEL SECURITY;

-- Worker achievements policies
CREATE POLICY "Worker achievements are viewable by everyone" 
  ON worker_achievements FOR SELECT USING (true);

CREATE POLICY "Workers can view their own achievements" 
  ON worker_achievements FOR SELECT USING (
    EXISTS (SELECT 1 FROM workers WHERE workers.id = worker_id AND workers.user_id::text = auth.uid()::text)
  );

CREATE POLICY "System can insert achievements" 
  ON worker_achievements FOR INSERT WITH CHECK (true);

-- Badge progress policies
CREATE POLICY "Badge progress is viewable by worker owner" 
  ON worker_badge_progress FOR SELECT USING (
    EXISTS (SELECT 1 FROM workers WHERE workers.id = worker_id AND workers.user_id::text = auth.uid()::text)
  );

CREATE POLICY "System can manage badge progress" 
  ON worker_badge_progress FOR ALL USING (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically award badge when progress reaches target
CREATE OR REPLACE FUNCTION check_and_award_badge()
RETURNS TRIGGER AS $$
BEGIN
  -- If progress equals or exceeds target, award the badge
  IF NEW.current_value >= NEW.target_value THEN
    INSERT INTO worker_achievements (worker_id, badge_type, metadata)
    VALUES (NEW.worker_id, NEW.badge_type, jsonb_build_object('auto_awarded', true, 'progress_value', NEW.current_value))
    ON CONFLICT (worker_id, badge_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to badge progress
CREATE TRIGGER trigger_check_and_award_badge
  AFTER INSERT OR UPDATE ON worker_badge_progress
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badge();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE worker_achievements IS 'Stores achievement badges earned by workers for gamification';
COMMENT ON TABLE worker_badge_progress IS 'Tracks progress toward earning achievement badges';

COMMENT ON TYPE achievement_badge_type IS 'Types of achievement badges workers can earn';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
