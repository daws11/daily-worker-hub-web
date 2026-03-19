-- Migration: Create reliability_score_history table
-- Date: 2026-02-22
-- Description: Create table to track reliability score history for workers

-- Create reliability_score_history table
CREATE TABLE IF NOT EXISTS reliability_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  previous_score NUMERIC(3, 2),
  new_score NUMERIC(3, 2),
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reliability_score_history_worker_id ON reliability_score_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_reliability_score_history_booking_id ON reliability_score_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_reliability_score_history_created_at ON reliability_score_history(created_at DESC);

-- Add comments
COMMENT ON TABLE reliability_score_history IS 'History of reliability score changes for workers';
COMMENT ON COLUMN reliability_score_history.previous_score IS 'Previous reliability score before change';
COMMENT ON COLUMN reliability_score_history.new_score IS 'New reliability score after change';
COMMENT ON COLUMN reliability_score_history.change_reason IS 'Reason for the score change';
