-- Migration: Add Worker Tiers
-- Description: Adds columns for jobs_completed and tier to workers table for the 4-tier worker system

-- Create worker_tier enum type
CREATE TYPE worker_tier AS ENUM ('classic', 'pro', 'elite', 'champion');

-- Add tier-related columns to workers table
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS jobs_completed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier worker_tier NOT NULL DEFAULT 'classic';

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_workers_tier ON workers(tier);
CREATE INDEX IF NOT EXISTS idx_workers_jobs_completed ON workers(jobs_completed DESC);

-- Add comment for documentation
COMMENT ON COLUMN workers.jobs_completed IS 'Total number of jobs completed by the worker';
COMMENT ON COLUMN workers.tier IS 'Worker tier: classic (0-19 jobs), pro (20-99 jobs), elite (100+ jobs), champion (300+ jobs)';
