-- ============================================================================
-- ADD IS_ACTIVE TO WALLETS TABLE
-- ============================================================================

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'is_active') THEN
    ALTER TABLE wallets ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index for is_active
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON wallets(is_active);

-- Add comment
COMMENT ON COLUMN wallets.is_active IS 'Whether the wallet is active and can be used for transactions';
