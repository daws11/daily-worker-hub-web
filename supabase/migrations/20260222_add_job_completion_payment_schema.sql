-- ============================================================================
-- JOB COMPLETION & PAYMENT RELEASE SCHEMA
-- ============================================================================
-- This migration adds wallet tables, transaction tracking, and payment dispute
-- functionality for automated job completion workflows.
-- ============================================================================

-- Create new enums for payment system
CREATE TYPE wallet_transaction_type AS ENUM ('earn', 'payout', 'refund', 'hold', 'release');
CREATE TYPE payment_status AS ENUM ('pending_review', 'available', 'released', 'disputed', 'cancelled');
CREATE TYPE dispute_status AS ENUM ('pending', 'investigating', 'resolved', 'rejected');

-- ============================================================================
-- WALLETS TABLE
-- ============================================================================
-- Tracks wallet balances for both workers and businesses.
-- Workers: pending balance (in review) and available balance (can withdraw)
-- Businesses: holds funds before release to workers
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pending_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  available_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for wallets
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_created_at ON wallets(created_at DESC);

-- ============================================================================
-- WALLET TRANSACTIONS TABLE
-- ============================================================================
-- Tracks all wallet transactions for audit trail and history.
-- Links to bookings to track payment flow from business to worker.
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  type wallet_transaction_type NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending_review',
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_transactions
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_booking_id ON wallet_transactions(booking_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================
-- Tracks payment disputes raised by businesses or workers.
-- When a dispute is active, payment release is paused.
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'pending',
  resolution TEXT,
  admin_notes TEXT,
  evidence_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for disputes
CREATE INDEX idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX idx_disputes_raised_by ON disputes(raised_by);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

-- Ensure one active dispute per booking
CREATE UNIQUE INDEX idx_disputes_booking_active ON disputes(booking_id)
  WHERE status IN ('pending', 'investigating');

-- ============================================================================
-- ALTER BOOKINGS TABLE - ADD COMPLETION FIELDS
-- ============================================================================
-- Add fields to track job completion and payment workflow
ALTER TABLE bookings
  ADD COLUMN checkout_time TIMESTAMPTZ,
  ADD COLUMN payment_status payment_status DEFAULT 'pending_review',
  ADD COLUMN review_deadline TIMESTAMPTZ;

-- Add indexes for booking completion fields
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_review_deadline ON bookings(review_deadline);
CREATE INDEX idx_bookings_checkout_time ON bookings(checkout_time);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to ensure wallet exists for a user
CREATE OR REPLACE FUNCTION ensure_wallet_exists(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  wallet_id UUID;
BEGIN
  -- Try to get existing wallet
  SELECT id INTO wallet_id FROM wallets WHERE user_id = user_uuid;

  -- If wallet doesn't exist, create one
  IF wallet_id IS NULL THEN
    INSERT INTO wallets (user_id)
    VALUES (user_uuid)
    RETURNING id INTO wallet_id;
  END IF;

  RETURN wallet_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to ensure wallet exists for user %: %', user_uuid, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update wallets updated_at
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update disputes updated_at
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE wallets IS 'Stores wallet balances for workers and businesses. Pending balance = funds in review period, Available balance = funds ready for withdrawal';
COMMENT ON TABLE wallet_transactions IS 'Transaction history for all wallet movements including earnings, payouts, refunds, and holds';
COMMENT ON TABLE disputes IS 'Payment disputes that pause automatic payment release until resolved';
COMMENT ON COLUMN wallets.pending_balance IS 'Funds earned but still in 24-hour review period';
COMMENT ON COLUMN wallets.available_balance IS 'Funds that have cleared review period and can be withdrawn';
COMMENT ON COLUMN bookings.checkout_time IS 'Timestamp when worker marked job as complete';
COMMENT ON COLUMN bookings.payment_status IS 'Current payment state: pending_review, available, released, disputed, or cancelled';
COMMENT ON COLUMN bookings.review_deadline IS 'End of 24-hour review period after which payment auto-releases';
