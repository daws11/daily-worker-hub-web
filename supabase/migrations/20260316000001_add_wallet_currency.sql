-- ============================================================================
-- ADD CURRENCY COLUMN TO WALLETS TABLE
-- ============================================================================

-- Add currency column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'currency') THEN
    ALTER TABLE wallets ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'IDR';
  END IF;
END $$;

-- Create index for currency if column exists
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);

-- Add comment
COMMENT ON COLUMN wallets.currency IS 'ISO 4217 currency code (e.g., IDR, USD)';
