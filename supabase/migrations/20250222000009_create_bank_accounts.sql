-- Create enum for bank codes
CREATE TYPE bank_code AS ENUM ('BCA', 'BRI', 'Mandiri', 'BNI');

-- ============================================================================
-- BANK_ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  bank_code bank_code NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for bank_accounts
CREATE INDEX idx_bank_accounts_worker_id ON bank_accounts(worker_id);
CREATE INDEX idx_bank_accounts_bank_code ON bank_accounts(bank_code);
CREATE INDEX idx_bank_accounts_is_primary ON bank_accounts(is_primary);
CREATE INDEX idx_bank_accounts_created_at ON bank_accounts(created_at DESC);

-- Ensure only one primary account per worker
CREATE UNIQUE INDEX idx_bank_accounts_worker_primary
  ON bank_accounts(worker_id)
  WHERE is_primary = TRUE;

-- Trigger to update updated_at column
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on bank_accounts table
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Workers can read their own bank accounts
CREATE POLICY "Workers can read own bank accounts"
  ON bank_accounts FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = bank_accounts.worker_id
    )
  );

-- Workers can insert their own bank accounts
CREATE POLICY "Workers can insert own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = worker_id
    )
  );

-- Workers can update their own bank accounts
CREATE POLICY "Workers can update own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = bank_accounts.worker_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = worker_id
    )
  );

-- Workers can delete their own bank accounts
CREATE POLICY "Workers can delete own bank accounts"
  ON bank_accounts FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = bank_accounts.worker_id
    )
  );

-- Admins can do everything with bank accounts
CREATE POLICY "Admins can read all bank accounts"
  ON bank_accounts FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert any bank account"
  ON bank_accounts FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update any bank account"
  ON bank_accounts FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete any bank account"
  ON bank_accounts FOR DELETE
  USING (is_admin());

-- ============================================================================
-- FUNCTION TO SET SINGLE PRIMARY ACCOUNT
-- ============================================================================

-- Function to ensure only one primary account per worker
CREATE OR REPLACE FUNCTION set_primary_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated row is being set as primary, unset all other primary accounts for this worker
  IF NEW.is_primary = TRUE THEN
    UPDATE bank_accounts
    SET is_primary = FALSE
    WHERE worker_id = NEW.worker_id
      AND id != NEW.id
      AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary account
CREATE TRIGGER enforce_single_primary_bank_account
  BEFORE INSERT OR UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_primary_bank_account();
