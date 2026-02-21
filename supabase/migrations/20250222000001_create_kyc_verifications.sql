-- Create kyc_verifications table
-- This table stores KYC (Know Your Customer) verification data for workers,
-- including KTP (Indonesian ID card) information and uploaded documents.

CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Foreign key to workers table
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,

  -- KTP number (16-digit Indonesian ID number)
  ktp_number TEXT NOT NULL UNIQUE,

  -- URLs to uploaded images (stored in Supabase Storage)
  ktp_image_url TEXT,
  selfie_image_url TEXT,

  -- Extracted data from KTP OCR (JSONB for flexible schema)
  ktp_extracted_data JSONB,

  -- Verification status: pending, verified, rejected
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),

  -- Rejection reason (nullable, only set when status is 'rejected')
  rejection_reason TEXT,

  -- Timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Admin who verified the KYC (nullable)
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_worker_id ON public.kyc_verifications(worker_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON public.kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_ktp_number ON public.kyc_verifications(ktp_number);

-- Add comment for documentation
COMMENT ON TABLE public.kyc_verifications IS 'Stores KYC verification data for workers including KTP validation and document uploads';
COMMENT ON COLUMN public.kyc_verifications.ktp_extracted_data IS 'JSONB field containing OCR-extracted data from KTP image (NIK, name, DOB, address, etc.)';
COMMENT ON COLUMN public.kyc_verifications.status IS 'Verification status: pending (awaiting review), verified (approved), rejected (denied)';

-- Enable Row Level Security (RLS)
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Workers can view their own KYC data
CREATE POLICY "Workers can view own KYC data"
  ON public.kyc_verifications
  FOR SELECT
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- Policy: Workers can insert their own KYC data
CREATE POLICY "Workers can insert own KYC data"
  ON public.kyc_verifications
  FOR INSERT
  WITH CHECK (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- Policy: Workers can update their own KYC data (only before verification)
CREATE POLICY "Workers can update own unverified KYC data"
  ON public.kyc_verifications
  FOR UPDATE
  USING (
    worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
    AND status = 'pending'
  );

-- Policy: Admins can view all KYC data
CREATE POLICY "Admins can view all KYC data"
  ON public.kyc_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all KYC data
CREATE POLICY "Admins can update all KYC data"
  ON public.kyc_verifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kyc_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_kyc_verifications_updated_at
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_verifications_updated_at();
