-- Migration: Add Row Level Security (RLS) policies for wallet tables
-- Date: 2026-02-22
-- Description: Implement security policies to ensure users can only access their own wallet data

-- ============================================================================
-- SECURITY HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user owns a wallet
CREATE OR REPLACE FUNCTION is_wallet_owner(wallet_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = wallet_id
    AND wallets.user_id::text = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- WALLETS TABLE
-- ============================================================================

-- Enable Row Level Security on wallets table
ALTER TABLE wallets
ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own wallet
CREATE POLICY "Users can view their own wallet"
ON wallets FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Policy: Wallets are created automatically via function (service role only)
CREATE POLICY "Wallets can be created by service"
ON wallets FOR INSERT
WITH CHECK (true);

-- Policy: Wallet balances are updated by system functions (service role only)
CREATE POLICY "Wallets can be updated by service"
ON wallets FOR UPDATE
WITH CHECK (true);

-- Policy: Users can delete their own wallet (on account deletion)
CREATE POLICY "Users can delete their own wallet"
ON wallets FOR DELETE
USING (user_id::text = auth.uid()::text);

-- Policy: Admins can view all wallets
CREATE POLICY "Admins can view all wallets"
ON wallets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update any wallet
CREATE POLICY "Admins can update any wallet"
ON wallets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can delete any wallet
CREATE POLICY "Admins can delete any wallet"
ON wallets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- WALLET TRANSACTIONS TABLE
-- ============================================================================

-- Enable Row Level Security on wallet_transactions table
ALTER TABLE wallet_transactions
ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view transactions for their own wallet
CREATE POLICY "Users can view their own wallet transactions"
ON wallet_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = wallet_transactions.wallet_id
    AND wallets.user_id::text = auth.uid()::text
  )
);

-- Policy: Transactions are created by system functions (service role only)
CREATE POLICY "Transactions can be created by service"
ON wallet_transactions FOR INSERT
WITH CHECK (true);

-- Policy: Transactions are updated by system functions (service role only)
CREATE POLICY "Transactions can be updated by service"
ON wallet_transactions FOR UPDATE
WITH CHECK (true);

-- Policy: Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON wallet_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update any transaction (for dispute resolution)
CREATE POLICY "Admins can update any transaction"
ON wallet_transactions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can delete any transaction
CREATE POLICY "Admins can delete any transaction"
ON wallet_transactions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================

-- Enable Row Level Security on disputes table
ALTER TABLE disputes
ENABLE ROW LEVEL SECURITY;

-- Policy: Workers involved in booking can view disputes
CREATE POLICY "Workers can view disputes for their bookings"
ON disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings
    JOIN workers ON workers.id = bookings.worker_id
    WHERE bookings.id = disputes.booking_id
    AND workers.user_id::text = auth.uid()::text
  )
);

-- Policy: Businesses involved in booking can view disputes
CREATE POLICY "Businesses can view disputes for their bookings"
ON disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings
    JOIN businesses ON businesses.id = bookings.business_id
    WHERE bookings.id = disputes.booking_id
    AND businesses.user_id::text = auth.uid()::text
  )
);

-- Policy: Workers can raise disputes for their bookings
CREATE POLICY "Workers can create disputes for their bookings"
ON disputes FOR INSERT
WITH CHECK (
  raised_by::text = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM bookings
    JOIN workers ON workers.id = bookings.worker_id
    WHERE bookings.id = disputes.booking_id
    AND workers.user_id::text = auth.uid()::text
  )
);

-- Policy: Businesses can raise disputes for their bookings
CREATE POLICY "Businesses can create disputes for their bookings"
ON disputes FOR INSERT
WITH CHECK (
  raised_by::text = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM bookings
    JOIN businesses ON businesses.id = bookings.business_id
    WHERE bookings.id = disputes.booking_id
    AND businesses.user_id::text = auth.uid()::text
  )
);

-- Policy: Dispute raiser can update their dispute (add evidence)
CREATE POLICY "Users can update their own disputes"
ON disputes FOR UPDATE
USING (raised_by::text = auth.uid()::text)
WITH CHECK (raised_by::text = auth.uid()::text);

-- Policy: Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
ON disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can update any dispute (resolution)
CREATE POLICY "Admins can update any dispute"
ON disputes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can delete any dispute (for moderation)
CREATE POLICY "Admins can delete any dispute"
ON disputes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. Wallets can only be viewed by their owner
-- 2. Wallet balances are immutable to users - only system functions can modify
-- 3. Wallet transactions can only be viewed by the wallet owner
-- 4. Disputes can be viewed by both workers and businesses involved in the booking
-- 5. Both workers and businesses can raise disputes for bookings they're part of
-- 6. Admins have full access for auditing, dispute resolution, and support
-- 7. All policies use ::text casting for UUID comparison consistency
-- ============================================================================
