-- Add RLS Policies for Workers Table
-- This migration adds Row Level Security (RLS) policies to the workers table
-- to protect KYC-related data and personal information

-- Enable Row Level Security (RLS) on workers table
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Policy: Workers can view their own profile data
CREATE POLICY "Workers can view own profile"
  ON public.workers
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Workers can insert their own profile (on registration)
CREATE POLICY "Workers can insert own profile"
  ON public.workers
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Workers can update their own profile data
-- But restrict updates to certain fields when KYC is verified
CREATE POLICY "Workers can update own profile"
  ON public.workers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Allow updates to most fields, but prevent modifying KYC status once verified
    AND (
      -- Allow any updates if not verified
      kyc_status IN ('unverified', 'pending', 'rejected')
      -- If verified, only allow safe field updates
      OR (
        kyc_status = 'verified'
        AND NOT (
          -- Prevent changing kyc_status
          OLD.kyc_status IS DISTINCT FROM NEW.kyc_status
          -- Prevent changing reliability_score (admin only)
          OR OLD.reliability_score IS DISTINCT FROM NEW.reliability_score
        )
      )
    )
  );

-- Policy: Admins can view all worker profiles
CREATE POLICY "Admins can view all worker profiles"
  ON public.workers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all worker profiles
CREATE POLICY "Admins can update all worker profiles"
  ON public.workers
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

-- Policy: Admins can insert worker profiles (for manual worker creation)
CREATE POLICY "Admins can insert worker profiles"
  ON public.workers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Businesses can view verified worker profiles
-- This allows businesses to search and view workers who have completed KYC
CREATE POLICY "Businesses can view verified worker profiles"
  ON public.workers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'business'
    )
    AND kyc_status = 'verified'
  );

-- Add comments for documentation
COMMENT ON POLICY "Workers can view own profile" ON public.workers IS 'Allows authenticated workers to view their own profile data';
COMMENT ON POLICY "Workers can insert own profile" ON public.workers IS 'Allows authenticated workers to create their profile on registration';
COMMENT ON POLICY "Workers can update own profile" ON public.workers IS 'Allows workers to update their own profile with restrictions on kyc_status and reliability_score when verified';
COMMENT ON POLICY "Admins can view all worker profiles" ON public.workers IS 'Allows admins to view all worker profiles for management';
COMMENT ON POLICY "Admins can update all worker profiles" ON public.workers IS 'Allows admins to update any worker profile including kyc_status and reliability_score';
COMMENT ON POLICY "Admins can insert worker profiles" ON public.workers IS 'Allows admins to manually create worker profiles';
COMMENT ON POLICY "Businesses can view verified worker profiles" ON public.workers IS 'Allows businesses to view only verified worker profiles for hiring';
