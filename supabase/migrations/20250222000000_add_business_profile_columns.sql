-- Migration: Add business profile columns
-- Description: Adds columns for business_type, area, avatar_url, business_license_url, and verification_status to businesses table

-- Add new columns to businesses table
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS business_type TEXT CHECK (business_type IN ('hotel', 'villa', 'restaurant', 'event_company', 'other')),
  ADD COLUMN IF NOT EXISTS area TEXT CHECK (area IN ('Badung', 'Denpasar', 'Gianyar', 'Tabanan', 'Buleleng', 'Klungkung', 'Karangasem', 'Bangli', 'Jembrana')),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS business_license_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Migrate existing is_verified boolean to verification_status if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_verified') THEN
    UPDATE businesses
    SET verification_status = CASE
      WHEN is_verified = true THEN 'verified'
      ELSE 'pending'
    END
    WHERE verification_status IS NULL OR verification_status = 'pending';
  END IF;
END $$;

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON businesses(business_type);
CREATE INDEX IF NOT EXISTS idx_businesses_area ON businesses(area);
CREATE INDEX IF NOT EXISTS idx_businesses_verification_status ON businesses(verification_status);

-- Add comment for documentation
COMMENT ON COLUMN businesses.business_type IS 'Type of business: hotel, villa, restaurant, event_company, or other';
COMMENT ON COLUMN businesses.area IS 'Bali regency where the business is located';
COMMENT ON COLUMN businesses.avatar_url IS 'URL to the business profile avatar image';
COMMENT ON COLUMN businesses.business_license_url IS 'URL to the uploaded business license document';
COMMENT ON COLUMN businesses.verification_status IS 'Verification status: pending, verified, or rejected';
