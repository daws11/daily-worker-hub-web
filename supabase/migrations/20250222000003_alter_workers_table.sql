-- Alter workers table to add KYC and profile fields
-- This migration adds fields to support worker profiles and KYC verification status

-- Add gender field (text field for gender identity)
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add experience_years field (integer for years of work experience)
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS experience_years INTEGER;

-- Add kyc_status field to track verification status
-- Values: 'unverified', 'pending', 'verified', 'rejected'
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'unverified'
  CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Add reliability_score field (decimal 0-5 for worker reliability rating)
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(3, 2) NOT NULL DEFAULT 0.00
  CHECK (reliability_score >= 0 AND reliability_score <= 5);

-- Add comments for documentation
COMMENT ON COLUMN public.workers.gender IS 'Worker gender identity (optional field)';
COMMENT ON COLUMN public.workers.experience_years IS 'Number of years of work experience in relevant field';
COMMENT ON COLUMN public.workers.kyc_status IS 'KYC verification status: unverified (not started), pending (submitted), verified (approved), rejected (denied)';
COMMENT ON COLUMN public.workers.reliability_score IS 'Worker reliability score from 0.00 to 5.00 based on completed jobs and reviews';

-- Create index for KYC status queries (useful for filtering verified workers)
CREATE INDEX IF NOT EXISTS idx_workers_kyc_status ON public.workers(kyc_status);

-- Create index for reliability score queries (useful for sorting workers by rating)
CREATE INDEX IF NOT EXISTS idx_workers_reliability_score ON public.workers(reliability_score DESC);

-- Create index for experience years queries (useful for filtering by experience level)
CREATE INDEX IF NOT EXISTS idx_workers_experience_years ON public.workers(experience_years);
