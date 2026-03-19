-- ============================================================================
-- ADD BUSINESS_ID AND WORKER_ID TO WALLETS TABLE
-- ============================================================================

-- Add business_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'business_id') THEN
    ALTER TABLE wallets ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add worker_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'worker_id') THEN
    ALTER TABLE wallets ADD COLUMN worker_id UUID REFERENCES workers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_wallets_business_id ON wallets(business_id);
CREATE INDEX IF NOT EXISTS idx_wallets_worker_id ON wallets(worker_id);

-- Add comments
COMMENT ON COLUMN wallets.business_id IS 'Reference to business if this is a business wallet';
COMMENT ON COLUMN wallets.worker_id IS 'Reference to worker if this is a worker wallet';
