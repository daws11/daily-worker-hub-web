-- ============================================================================
-- WORKER WALLET SYSTEM
-- ============================================================================
-- Complete wallet system for workers to receive payments and request withdrawals.
-- Version: 20260304125500
-- Date: 2026-03-04
-- ============================================================================

-- ============================================================================
-- ENUMS FOR WALLET SYSTEM
-- ============================================================================

-- Transaction type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_transaction_type') THEN
    CREATE TYPE worker_transaction_type AS ENUM ('earning', 'withdrawal', 'bonus', 'penalty');
  END IF;
END $$;

-- Transaction status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_transaction_status') THEN
    CREATE TYPE worker_transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
  END IF;
END $$;

-- Withdrawal request status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
    CREATE TYPE withdrawal_status AS ENUM ('pending', 'processing', 'completed', 'rejected');
  END IF;
END $$;

-- ============================================================================
-- WALLETS TABLE (Worker-specific)
-- ============================================================================

CREATE TABLE IF NOT EXISTS worker_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  pending_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_earned DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_withdrawn DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id)
);

-- Indexes for worker_wallets
CREATE INDEX IF NOT EXISTS idx_worker_wallets_worker_id ON worker_wallets(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_wallets_created_at ON worker_wallets(created_at DESC);

-- Constraints to ensure non-negative balances
ALTER TABLE worker_wallets DROP CONSTRAINT IF EXISTS worker_wallets_balance_nonnegative;
ALTER TABLE worker_wallets ADD CONSTRAINT worker_wallets_balance_nonnegative CHECK (balance >= 0);

ALTER TABLE worker_wallets DROP CONSTRAINT IF EXISTS worker_wallets_pending_balance_nonnegative;
ALTER TABLE worker_wallets ADD CONSTRAINT worker_wallets_pending_balance_nonnegative CHECK (pending_balance >= 0);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS worker_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES worker_wallets(id) ON DELETE CASCADE,
  type worker_transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status worker_transaction_status NOT NULL DEFAULT 'pending',
  reference_id UUID,
  reference_type TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for worker_transactions
CREATE INDEX IF NOT EXISTS idx_worker_transactions_wallet_id ON worker_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_type ON worker_transactions(type);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_status ON worker_transactions(status);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_reference ON worker_transactions(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_created_at ON worker_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_processed_at ON worker_transactions(processed_at);

-- ============================================================================
-- WITHDRAWAL REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES worker_wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for withdrawal_requests
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_worker_id ON withdrawal_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_wallet_id ON withdrawal_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_processed_at ON withdrawal_requests(processed_at);

-- Constraint to ensure positive withdrawal amount
ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_amount_positive;
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_amount_positive CHECK (amount > 0);

-- ============================================================================
-- TRIGGER: UPDATE UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_worker_wallets_updated_at ON worker_wallets;
CREATE TRIGGER update_worker_wallets_updated_at
  BEFORE UPDATE ON worker_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: AUTO-CREATE WALLET WHEN WORKER CREATED
-- ============================================================================

CREATE OR REPLACE FUNCTION create_wallet_on_worker_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Create wallet for new worker
  INSERT INTO public.worker_wallets (worker_id)
  VALUES (NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Wallet already exists, return without error
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on workers table
DROP TRIGGER IF EXISTS on_worker_created_wallet ON workers;
CREATE TRIGGER on_worker_created_wallet
  AFTER INSERT ON workers
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_on_worker_created();

-- ============================================================================
-- FUNCTION: UPDATE WALLET BALANCE ON TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  w_id UUID;
BEGIN
  -- Get wallet_id from NEW transaction
  w_id := NEW.wallet_id;
  
  -- Only update balances when transaction is completed
  IF NEW.status = 'completed' THEN
    IF NEW.type = 'earning' OR NEW.type = 'bonus' THEN
      -- Add to balance
      UPDATE worker_wallets
      SET 
        balance = balance + NEW.amount,
        total_earned = total_earned + NEW.amount,
        updated_at = NOW()
      WHERE id = w_id;
      
    ELSIF NEW.type = 'withdrawal' THEN
      -- Deduct from balance and add to total_withdrawn
      UPDATE worker_wallets
      SET 
        balance = balance - NEW.amount,
        total_withdrawn = total_withdrawn + NEW.amount,
        updated_at = NOW()
      WHERE id = w_id;
      
    ELSIF NEW.type = 'penalty' THEN
      -- Deduct from balance (penalty)
      UPDATE worker_wallets
      SET 
        balance = balance - NEW.amount,
        updated_at = NOW()
      WHERE id = w_id;
    END IF;
  END IF;
  
  -- Set processed_at when status is completed or failed
  IF NEW.status IN ('completed', 'failed', 'cancelled') AND NEW.processed_at IS NULL THEN
    NEW.processed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on worker_transactions table
DROP TRIGGER IF EXISTS on_transaction_update_wallet ON worker_transactions;
CREATE TRIGGER on_transaction_update_wallet
  BEFORE INSERT OR UPDATE ON worker_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance_on_transaction();

-- ============================================================================
-- FUNCTION: UPDATE WITHDRAWAL STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION process_withdrawal_status_change()
RETURNS TRIGGER AS $$
DECLARE
  w_worker_id UUID;
  w_wallet_id UUID;
BEGIN
  -- When withdrawal is completed, create a withdrawal transaction
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get worker and wallet info
    SELECT worker_id, wallet_id INTO w_worker_id, w_wallet_id
    FROM withdrawal_requests
    WHERE id = NEW.id;
    
    -- Create withdrawal transaction
    INSERT INTO worker_transactions (
      wallet_id,
      type,
      amount,
      status,
      reference_id,
      reference_type,
      description
    ) VALUES (
      w_wallet_id,
      'withdrawal',
      NEW.amount,
      'completed',
      NEW.id,
      'withdrawal_request',
      'Withdrawal to ' || NEW.bank_name || ' - ' || NEW.bank_account_number
    );
    
    -- Set processed_at timestamp
    NEW.processed_at := NOW();
  END IF;
  
  -- Set processed_at when rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.processed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on withdrawal_requests table
DROP TRIGGER IF EXISTS on_withdrawal_status_change ON withdrawal_requests;
CREATE TRIGGER on_withdrawal_status_change
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_withdrawal_status_change();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on wallet tables
ALTER TABLE worker_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: WORKER_WALLETS
-- ============================================================================

-- Workers can view their own wallet
DROP POLICY IF EXISTS "Workers can view own wallet" ON worker_wallets;
CREATE POLICY "Workers can view own wallet"
  ON worker_wallets FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Admins can view all wallets
DROP POLICY IF EXISTS "Admins can view all wallets" ON worker_wallets;
CREATE POLICY "Admins can view all wallets"
  ON worker_wallets FOR SELECT
  USING (is_admin());

-- Only system/trigger can insert wallets
DROP POLICY IF EXISTS "System can insert wallets" ON worker_wallets;
CREATE POLICY "System can insert wallets"
  ON worker_wallets FOR INSERT
  WITH CHECK (true);

-- Only system can update wallets (via triggers)
DROP POLICY IF EXISTS "System can update wallets" ON worker_wallets;
CREATE POLICY "System can update wallets"
  ON worker_wallets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: WORKER_TRANSACTIONS
-- ============================================================================

-- Workers can view their own transactions
DROP POLICY IF EXISTS "Workers can view own transactions" ON worker_transactions;
CREATE POLICY "Workers can view own transactions"
  ON worker_transactions FOR SELECT
  USING (
    wallet_id IN (
      SELECT w.id FROM worker_wallets w
      JOIN workers wr ON wr.id = w.worker_id
      WHERE wr.user_id = auth.uid()
    )
  );

-- Admins can view all transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON worker_transactions;
CREATE POLICY "Admins can view all transactions"
  ON worker_transactions FOR SELECT
  USING (is_admin());

-- Only system can insert transactions
DROP POLICY IF EXISTS "System can insert transactions" ON worker_transactions;
CREATE POLICY "System can insert transactions"
  ON worker_transactions FOR INSERT
  WITH CHECK (true);

-- Only system can update transactions
DROP POLICY IF EXISTS "System can update transactions" ON worker_transactions;
CREATE POLICY "System can update transactions"
  ON worker_transactions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: WITHDRAWAL_REQUESTS
-- ============================================================================

-- Workers can view their own withdrawal requests
DROP POLICY IF EXISTS "Workers can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Workers can view own withdrawals"
  ON withdrawal_requests FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Admins can view all withdrawal requests
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON withdrawal_requests;
CREATE POLICY "Admins can view all withdrawals"
  ON withdrawal_requests FOR SELECT
  USING (is_admin());

-- Workers can create withdrawal requests
DROP POLICY IF EXISTS "Workers can create withdrawals" ON withdrawal_requests;
CREATE POLICY "Workers can create withdrawals"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Only admins can update withdrawal requests (process them)
DROP POLICY IF EXISTS "Admins can update withdrawals" ON withdrawal_requests;
CREATE POLICY "Admins can update withdrawals"
  ON withdrawal_requests FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- HELPER FUNCTIONS FOR APPLICATION LAYER
-- ============================================================================

-- Function to add earning to worker wallet
CREATE OR REPLACE FUNCTION add_worker_earning(
  p_worker_id UUID,
  p_amount DECIMAL(15,2),
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Get or create wallet
  SELECT id INTO v_wallet_id FROM worker_wallets WHERE worker_id = p_worker_id;
  
  IF v_wallet_id IS NULL THEN
    -- This shouldn't happen due to trigger, but handle it anyway
    INSERT INTO worker_wallets (worker_id) VALUES (p_worker_id) RETURNING id INTO v_wallet_id;
  END IF;
  
  -- Create pending transaction
  INSERT INTO worker_transactions (
    wallet_id,
    type,
    amount,
    status,
    reference_id,
    reference_type,
    description,
    metadata
  ) VALUES (
    v_wallet_id,
    'earning',
    p_amount,
    'completed',
    p_reference_id,
    p_reference_type,
    COALESCE(p_description, 'Earning from job'),
    p_metadata
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to request withdrawal
CREATE OR REPLACE FUNCTION request_withdrawal(
  p_worker_id UUID,
  p_amount DECIMAL(15,2),
  p_bank_name TEXT,
  p_bank_account_number TEXT,
  p_bank_account_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_withdrawal_id UUID;
  v_current_balance DECIMAL(15,2);
BEGIN
  -- Get wallet
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM worker_wallets 
  WHERE worker_id = p_worker_id;
  
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Worker wallet not found';
  END IF;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current balance: %, Requested: %', v_current_balance, p_amount;
  END IF;
  
  -- Create withdrawal request
  INSERT INTO withdrawal_requests (
    worker_id,
    wallet_id,
    amount,
    bank_name,
    bank_account_number,
    bank_account_name
  ) VALUES (
    p_worker_id,
    v_wallet_id,
    p_amount,
    p_bank_name,
    p_bank_account_number,
    p_bank_account_name
  ) RETURNING id INTO v_withdrawal_id;
  
  -- Hold the balance (deduct immediately)
  UPDATE worker_wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Create pending transaction
  INSERT INTO worker_transactions (
    wallet_id,
    type,
    amount,
    status,
    reference_id,
    reference_type,
    description
  ) VALUES (
    v_wallet_id,
    'withdrawal',
    p_amount,
    'pending',
    v_withdrawal_id,
    'withdrawal_request',
    'Withdrawal request to ' || p_bank_name
  );
  
  RETURN v_withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel withdrawal and refund balance
CREATE OR REPLACE FUNCTION cancel_withdrawal(
  p_withdrawal_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_worker_id UUID;
  v_wallet_id UUID;
  v_amount DECIMAL(15,2);
  v_status withdrawal_status;
BEGIN
  -- Get withdrawal details
  SELECT worker_id, wallet_id, amount, status
  INTO v_worker_id, v_wallet_id, v_amount, v_status
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Can only cancel pending withdrawals';
  END IF;
  
  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET status = 'rejected',
      notes = COALESCE(p_reason, 'Cancelled by system'),
      processed_at = NOW()
  WHERE id = p_withdrawal_id;
  
  -- Refund the balance
  UPDATE worker_wallets
  SET balance = balance + v_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Cancel pending transaction
  UPDATE worker_transactions
  SET status = 'cancelled',
      processed_at = NOW()
  WHERE reference_id = p_withdrawal_id AND type = 'withdrawal' AND status = 'pending';
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get worker wallet summary
CREATE OR REPLACE FUNCTION get_worker_wallet_summary(p_worker_id UUID)
RETURNS TABLE (
  wallet_id UUID,
  balance DECIMAL(15,2),
  pending_balance DECIMAL(15,2),
  total_earned DECIMAL(15,2),
  total_withdrawn DECIMAL(15,2),
  pending_withdrawals DECIMAL(15,2),
  total_transactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id AS wallet_id,
    w.balance,
    w.pending_balance,
    w.total_earned,
    w.total_withdrawn,
    COALESCE(SUM(wr.amount) FILTER (WHERE wr.status IN ('pending', 'processing')), 0) AS pending_withdrawals,
    (SELECT COUNT(*) FROM worker_transactions wt WHERE wt.wallet_id = w.id) AS total_transactions
  FROM worker_wallets w
  LEFT JOIN withdrawal_requests wr ON wr.wallet_id = w.id
  WHERE w.worker_id = p_worker_id
  GROUP BY w.id, w.balance, w.pending_balance, w.total_earned, w.total_withdrawn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIALIZE WALLETS FOR EXISTING WORKERS
-- ============================================================================

-- Create wallets for existing workers that don't have one yet
INSERT INTO worker_wallets (worker_id)
SELECT id FROM workers
WHERE id NOT IN (SELECT worker_id FROM worker_wallets)
ON CONFLICT (worker_id) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE worker_wallets IS 'Worker-specific wallets for receiving payments and tracking earnings';
COMMENT ON TABLE worker_transactions IS 'Transaction history for worker wallets including earnings, withdrawals, bonuses, and penalties';
COMMENT ON TABLE withdrawal_requests IS 'Worker withdrawal requests to bank accounts';

COMMENT ON COLUMN worker_wallets.balance IS 'Current available balance in IDR (can be withdrawn)';
COMMENT ON COLUMN worker_wallets.pending_balance IS 'Pending balance in IDR (waiting clearance)';
COMMENT ON COLUMN worker_wallets.total_earned IS 'Lifetime total earnings in IDR';
COMMENT ON COLUMN worker_wallets.total_withdrawn IS 'Lifetime total withdrawals in IDR';

COMMENT ON COLUMN worker_transactions.type IS 'earning=job payment, withdrawal=cash out, bonus=bonus payment, penalty=deduction';
COMMENT ON COLUMN worker_transactions.status IS 'pending=waiting, completed=done, failed=error, cancelled=reverted';
COMMENT ON COLUMN worker_transactions.reference_id IS 'ID of related entity (booking_id, etc)';
COMMENT ON COLUMN worker_transactions.reference_type IS 'Type of reference: booking, bonus, withdrawal_request, etc';

COMMENT ON COLUMN withdrawal_requests.status IS 'pending=awaiting review, processing=being processed, completed=sent to bank, rejected=cancelled';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
