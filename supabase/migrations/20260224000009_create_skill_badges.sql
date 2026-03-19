-- ============================================================================
-- Daily Worker Hub - Skill Badges Migration
-- ============================================================================
-- This migration creates the badges table for managing skill badges,
-- certifications, and training achievements for workers.
-- Version: 20260224_create_skill_badges
-- Date: 2026-02-24
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Badge category types
CREATE TYPE badge_category AS ENUM ('skill', 'training', 'certification', 'specialization');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Badges table (skill badges, certifications, and training)
-- ----------------------------------------------------------------------------
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  category badge_category NOT NULL,
  is_certified BOOLEAN NOT NULL DEFAULT FALSE,
  provider_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Badges indexes
CREATE INDEX idx_badges_slug ON badges(slug);
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_is_certified ON badges(is_certified);
CREATE INDEX idx_badges_provider_id ON badges(provider_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE badges IS 'Skill badges, certifications, and training achievements that workers can earn';
COMMENT ON COLUMN badges.id IS 'Unique identifier for the badge';
COMMENT ON COLUMN badges.name IS 'Display name of the badge';
COMMENT ON COLUMN badges.slug IS 'URL-friendly identifier for the badge';
COMMENT ON COLUMN badges.description IS 'Detailed description of what the badge represents';
COMMENT ON COLUMN badges.icon IS 'Icon name or URL for badge display';
COMMENT ON COLUMN badges.category IS 'Category type: skill, training, certification, or specialization';
COMMENT ON COLUMN badges.is_certified IS 'Whether this badge requires verification from a certified provider';
COMMENT ON COLUMN badges.provider_id IS 'Reference to business that provides/verifies this badge (for certified badges)';
COMMENT ON COLUMN badges.created_at IS 'Timestamp when the badge was created';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on badges table
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Badges policies
-- Policy: Badges are viewable by everyone
CREATE POLICY "Badges are viewable by everyone"
  ON badges
  FOR SELECT
  USING (true);

-- Policy: Admins can insert badges
CREATE POLICY "Admins can insert badges"
  ON badges
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update badges
CREATE POLICY "Admins can update badges"
  ON badges
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete badges
CREATE POLICY "Admins can delete badges"
  ON badges
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
