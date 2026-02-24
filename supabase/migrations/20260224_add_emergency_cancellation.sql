-- ============================================================================
-- Daily Worker Hub - Emergency Cancellation Schema
-- ============================================================================
-- This migration adds cancellation reasons enum and table for emergency
-- job cancellations with valid reasons and minimal penalties.
-- It also adds cancellation tracking columns to the bookings table.
-- Version: 20260224_add_emergency_cancellation
-- Date: 2026-02-24
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Cancellation reason categories
CREATE TYPE cancellation_reason_category AS ENUM (
  'illness',
  'family_emergency',
  'personal_emergency',
  'weather',
  'transportation',
  'schedule_conflict',
  'other'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Cancellation reasons table (predefined cancellation reasons)
-- ----------------------------------------------------------------------------
CREATE TABLE cancellation_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category cancellation_reason_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  requires_verification BOOLEAN NOT NULL DEFAULT FALSE,
  penalty_percentage INTEGER NOT NULL DEFAULT 0 CHECK (penalty_percentage >= 0 AND penalty_percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_cancellation_reasons_category ON cancellation_reasons(category);
CREATE INDEX idx_cancellation_reasons_is_active ON cancellation_reasons(is_active);
CREATE INDEX idx_cancellation_reasons_sort_order ON cancellation_reasons(sort_order);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to cancellation_reasons table
CREATE TRIGGER update_cancellation_reasons_updated_at
  BEFORE UPDATE ON cancellation_reasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on cancellation_reasons table
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Cancellation reasons: Public read access" ON cancellation_reasons
  FOR SELECT
  USING (true);

-- Admins can insert cancellation reasons
CREATE POLICY "Cancellation reasons: Admin insert access" ON cancellation_reasons
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update cancellation reasons
CREATE POLICY "Cancellation reasons: Admin update access" ON cancellation_reasons
  FOR UPDATE
  USING (is_admin());

-- Admins can delete cancellation reasons
CREATE POLICY "Cancellation reasons: Admin delete access" ON cancellation_reasons
  FOR DELETE
  USING (is_admin());

-- ============================================================================
-- MODIFY BOOKINGS TABLE - Add cancellation tracking columns
-- ============================================================================

-- Add cancellation columns to bookings table
ALTER TABLE bookings
  ADD COLUMN cancellation_reason_id UUID REFERENCES cancellation_reasons(id) ON DELETE SET NULL,
  ADD COLUMN cancellation_note TEXT,
  ADD COLUMN cancelled_at TIMESTAMPTZ;

-- Create index for cancellation_reason_id
CREATE INDEX idx_bookings_cancellation_reason_id ON bookings(cancellation_reason_id);
CREATE INDEX idx_bookings_cancelled_at ON bookings(cancelled_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert cancellation reasons with categories, descriptions, and penalties
INSERT INTO cancellation_reasons (id, category, name, description, requires_verification, penalty_percentage, is_active, sort_order) VALUES
  -- Illness (0% penalty - valid emergency)
  ('80000000-0000-0000-0000-000000000001', 'illness', 'Sick - Medical Condition', 'Worker is unable to work due to illness or medical condition', TRUE, 0, TRUE, 1),
  ('80000000-0000-0000-0000-000000000002', 'illness', 'Medical Appointment', 'Worker has a scheduled medical appointment', TRUE, 0, TRUE, 2),

  -- Family Emergency (0% penalty - valid emergency)
  ('80000000-0000-0000-0000-000000000003', 'family_emergency', 'Family Emergency', 'Family member requires immediate assistance', FALSE, 0, TRUE, 3),
  ('80000000-0000-0000-0000-000000000004', 'family_emergency', 'Childcare Issue', 'Unexpected childcare or school-related issue', FALSE, 0, TRUE, 4),

  -- Personal Emergency (0% penalty - valid emergency)
  ('80000000-0000-0000-0000-000000000005', 'personal_emergency', 'Personal Emergency', 'Personal emergency requiring immediate attention', FALSE, 0, TRUE, 5),
  ('80000000-0000-0000-0000-000000000006', 'personal_emergency', 'Accident', 'Worker was involved in an accident', TRUE, 0, TRUE, 6),

  -- Weather (0% penalty - valid emergency)
  ('80000000-0000-0000-0000-000000000007', 'weather', 'Severe Weather', 'Severe weather conditions preventing safe travel', FALSE, 0, TRUE, 7),
  ('80000000-0000-0000-0000-000000000008', 'weather', 'Natural Disaster', 'Natural disaster affecting area', FALSE, 0, TRUE, 8),

  -- Transportation (10% penalty - partial penalty)
  ('80000000-0000-0000-0000-000000000009', 'transportation', 'Vehicle Breakdown', 'Vehicle breakdown preventing travel to job site', TRUE, 10, TRUE, 9),
  ('80000000-0000-0000-0000-000000000010', 'transportation', 'Public Transport Issue', 'Public transportation delay or cancellation', FALSE, 10, TRUE, 10),

  -- Schedule Conflict (25% penalty - some penalty)
  ('80000000-0000-0000-0000-000000000011', 'schedule_conflict', 'Double Booked', 'Accidentally double booked another job', FALSE, 25, TRUE, 11),
  ('80000000-0000-0000-0000-000000000012', 'schedule_conflict', 'Time Conflict', 'Another commitment prevents attendance', FALSE, 25, TRUE, 12),

  -- Other (variable penalty - case by case)
  ('80000000-0000-0000-0000-000000000013', 'other', 'Other Reason', 'Other reason not listed above (requires approval)', TRUE, 25, TRUE, 13)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
