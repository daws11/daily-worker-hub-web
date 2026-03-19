-- ============================================================================
-- PAYMENT GATEWAY TABLES
-- ============================================================================
-- This migration adds tables for payment gateway integration (Xendit)
-- - payment_transactions: Track payment requests (top-ups)
-- - payout_requests: Track withdrawal requests (disbursements)
-- ============================================================================

-- Create payment provider enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    CREATE TYPE payment_provider AS ENUM ('xendit', 'midtrans');
  END IF;
END $$;

-- Create payment transaction status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_transaction_status') THEN
    CREATE TYPE payment_transaction_status AS ENUM ('pending', 'success', 'failed', 'expired', 'cancelled');
  END IF;
END $$;

-- Create payout request status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
  END IF;
END $$;

-- ============================================================================
-- PAYMENT_TRANSACTIONS TABLE
-- ============================================================================
-- Tracks all payment transactions (business wallet top-ups)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY, -- Custom transaction ID (e.g., payment_biz123_1234567890_abc)
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  fee_amount NUMERIC(15, 2) DEFAULT 0,
  status payment_transaction_status NOT NULL DEFAULT 'pending',
  payment_provider payment_provider NOT NULL DEFAULT 'xendit',
  provider_payment_id TEXT, -- Xendit/Midtrans payment ID
  payment_url TEXT,
  qris_expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_business_id ON payment_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_payment_id ON payment_transactions(provider_payment_id);

-- ============================================================================
-- PAYOUT_REQUESTS TABLE
-- ============================================================================
-- Tracks all payout/withdrawal requests (worker earnings withdrawals)
CREATE TABLE IF NOT EXISTS payout_requests (
  id TEXT PRIMARY KEY, -- Custom payout ID (e.g., payout_worker123_1234567890_xyz)
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  fee_amount NUMERIC(15, 2) DEFAULT 0,
  net_amount NUMERIC(15, 2) NOT NULL, -- amount - fee
  status payout_status NOT NULL DEFAULT 'pending',
  payment_provider payment_provider NOT NULL DEFAULT 'xendit',
  provider_disbursement_id TEXT, -- Xendit disbursement ID
  
  -- Bank details
  bank_code TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  
  -- Tracking
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  failure_code TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payout_requests
CREATE INDEX IF NOT EXISTS idx_payout_requests_worker_id ON payout_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_provider ON payout_requests(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created_at ON payout_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_bank_code ON payout_requests(bank_code);
CREATE INDEX IF NOT EXISTS idx_payout_requests_provider_disbursement_id ON payout_requests(provider_disbursement_id);

-- ============================================================================
-- ADD BANK ACCOUNT TO WORKERS TABLE
-- ============================================================================
-- Add bank account details for withdrawals
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR PAYMENT_TRANSACTIONS
-- ============================================================================

-- Businesses can read their own payment transactions
DROP POLICY IF EXISTS "Businesses can read own payment transactions" ON payment_transactions;
CREATE POLICY "Businesses can read own payment transactions"
  ON payment_transactions FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Admins can read all payment transactions
DROP POLICY IF EXISTS "Admins can read all payment transactions" ON payment_transactions;
CREATE POLICY "Admins can read all payment transactions"
  ON payment_transactions FOR SELECT
  USING (is_admin());

-- Only application layer can insert payment transactions
DROP POLICY IF EXISTS "Admins can insert payment transactions" ON payment_transactions;
CREATE POLICY "Admins can insert payment transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (is_admin());

-- Only application layer can update payment transactions
DROP POLICY IF EXISTS "Admins can update payment transactions" ON payment_transactions;
CREATE POLICY "Admins can update payment transactions"
  ON payment_transactions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- RLS POLICIES FOR PAYOUT_REQUESTS
-- ============================================================================

-- Workers can read their own payout requests
DROP POLICY IF EXISTS "Workers can read own payout requests" ON payout_requests;
CREATE POLICY "Workers can read own payout requests"
  ON payout_requests FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Admins can read all payout requests
DROP POLICY IF EXISTS "Admins can read all payout requests" ON payout_requests;
CREATE POLICY "Admins can read all payout requests"
  ON payout_requests FOR SELECT
  USING (is_admin());

-- Only application layer can insert payout requests
DROP POLICY IF EXISTS "Admins can insert payout requests" ON payout_requests;
CREATE POLICY "Admins can insert payout requests"
  ON payout_requests FOR INSERT
  WITH CHECK (is_admin());

-- Only application layer can update payout requests
DROP POLICY IF EXISTS "Admins can update payout requests" ON payout_requests;
CREATE POLICY "Admins can update payout requests"
  ON payout_requests FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON payout_requests;
CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE payment_transactions IS 'Tracks business wallet top-up transactions via payment gateways (Xendit, Midtrans)';
COMMENT ON TABLE payout_requests IS 'Tracks worker withdrawal requests (disbursements) to bank accounts';
COMMENT ON COLUMN payment_transactions.id IS 'Custom transaction ID format: payment_{business_id}_{timestamp}_{random}';
COMMENT ON COLUMN payout_requests.id IS 'Custom payout ID format: payout_{worker_id}_{timestamp}_{random}';
