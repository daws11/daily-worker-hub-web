-- ============================================================================
-- WALLETS TABLE
-- ============================================================================

-- Create wallet transaction type enum for wallet transactions (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transaction_type') THEN
    CREATE TYPE wallet_transaction_type AS ENUM ('credit', 'debit', 'pending', 'released');
  END IF;
END $$;

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  pending_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets(created_at DESC);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'balance') THEN
    ALTER TABLE wallets ADD COLUMN balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'pending_balance') THEN
    ALTER TABLE wallets ADD COLUMN pending_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- Check constraint to ensure balance never goes negative
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_balance_nonnegative;
ALTER TABLE wallets ADD CONSTRAINT wallets_balance_nonnegative CHECK (balance >= 0);
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_pending_balance_nonnegative;
ALTER TABLE wallets ADD CONSTRAINT wallets_pending_balance_nonnegative CHECK (pending_balance >= 0);

-- ============================================================================
-- WALLET TRANSACTIONS TABLE (for detailed transaction history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  type wallet_transaction_type NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id ON wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION TO CREATE WALLET ON USER SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION create_wallet_on_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create wallet for workers and businesses
  IF NEW.raw_user_meta_data->>'role' IN ('worker', 'business') THEN
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Wallet already exists, return without error
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_on_user_signup();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) FOR WALLETS
-- ============================================================================
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR WALLETS TABLE
-- ============================================================================

-- Users can read their own wallet
DROP POLICY IF EXISTS "Users can read own wallet" ON wallets;
CREATE POLICY "Users can read own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all wallets
DROP POLICY IF EXISTS "Admins can read all wallets" ON wallets;
CREATE POLICY "Admins can read all wallets"
  ON wallets FOR SELECT
  USING (is_admin());

-- Only application layer should insert wallets (via trigger)
DROP POLICY IF EXISTS "Admins can insert wallets" ON wallets;
CREATE POLICY "Admins can insert wallets"
  ON wallets FOR INSERT
  WITH CHECK (is_admin());

-- Users can only update their own wallet through application functions
DROP POLICY IF EXISTS "Admins can update any wallet" ON wallets;
CREATE POLICY "Admins can update any wallet"
  ON wallets FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- RLS POLICIES FOR WALLET_TRANSACTIONS TABLE
-- ============================================================================

-- Users can read their own wallet transactions
DROP POLICY IF EXISTS "Users can read own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can read own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM wallets WHERE id = wallet_transactions.wallet_id
    )
  );

-- Admins can read all wallet transactions
DROP POLICY IF EXISTS "Admins can read all wallet transactions" ON wallet_transactions;
CREATE POLICY "Admins can read all wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (is_admin());

-- Only application layer can insert wallet transactions
DROP POLICY IF EXISTS "Admins can insert wallet transactions" ON wallet_transactions;
CREATE POLICY "Admins can insert wallet transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (is_admin());
