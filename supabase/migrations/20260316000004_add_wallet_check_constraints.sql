-- ============================================================================
-- ADD CHECK CONSTRAINTS FOR WALLETS TABLE
-- ============================================================================

-- Add check constraints to ensure only one foreign key is set at a time
-- This prevents "table reference 'users' is ambiguous" errors

DO $$
BEGIN
  -- Check constraint: For business wallets (user_id or business_id must be set, but not both)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_one_foreign_key') THEN
    ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_one_foreign_key;
  END IF;
  
  ALTER TABLE wallets ADD CONSTRAINT wallets_one_foreign_key
    CHECK (
      (user_id IS NOT NULL)::int = (business_id IS NULL)::int
      OR
      (worker_id IS NOT NULL)::int = (business_id IS NOT NULL)::int
      OR
      (business_id IS NOT NULL)::int = (user_id IS NOT NULL)::int
    );

  -- Check constraint: Ensure worker wallets don't have business_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_worker_no_business_id') THEN
    ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_worker_no_business_id;
  END IF;
  
  ALTER TABLE wallets ADD CONSTRAINT wallets_worker_no_business_id
    CHECK (worker_id IS NULL OR business_id IS NULL);

  -- Check constraint: Ensure business wallets don't have worker_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_business_no_worker_id') THEN
    ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_business_no_worker_id;
  END IF;
  
  ALTER TABLE wallets ADD CONSTRAINT wallets_business_no_worker_id
    CHECK (business_id IS NULL OR worker_id IS NULL);

  -- Add comments to document the purpose
  COMMENT ON CONSTRAINT wallets_one_foreign_key IS "Ensures only one foreign key is set: user_id for workers, business_id for businesses";
  COMMENT ON CONSTRAINT wallets_worker_no_business_id IS "Worker wallets cannot reference businesses";
  COMMENT ON CONSTRAINT wallets_business_no_worker_id IS "Business wallets cannot reference workers";
END $$;
