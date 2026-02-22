-- Add reliability_score column to workers table
-- This column stores the worker's current reliability score (1.0 to 5.0 stars)
-- The score is calculated using the formula: 40% attendance + 30% punctuality + 30% ratings

-- Add reliability_score column
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS reliability_score NUMERIC(3, 2)
  CHECK (reliability_score >= 1.0 AND reliability_score <= 5.0);

-- Add comment for documentation
COMMENT ON COLUMN public.workers.reliability_score IS 'Worker reliability score from 1.0 to 5.0 stars. Calculated as 40% attendance rate + 30% punctuality rate + 30% average rating. Score is updated after each completed job. Workers need 5+ completed jobs for a reliable score.';

-- Create index for sorting workers by reliability score
CREATE INDEX IF NOT EXISTS idx_workers_reliability_score ON public.workers(reliability_score DESC);
