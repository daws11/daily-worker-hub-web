-- ============================================================================
-- Daily Worker Hub - Payment Tables RLS Policies
-- ============================================================================
-- This migration adds comprehensive Row Level Security policies for payment
-- related tables (wallets, payment_transactions, payout_requests, bank_accounts)
-- following the established security patterns.
-- Version: 20250222000010
-- Date: 2025-02-22
-- ============================================================================

-- ============================================================================
-- DROP EXISTING POLICIES (for replacement with enhanced versions)
-- ============================================================================

-- Drop existing wallet policies
DROP POLICY IF EXISTS "Businesses can read own wallet" ON wallets;
DROP POLICY IF EXISTS "Workers can read own wallet" ON wallets;
DROP POLICY IF EXISTS "Admins can read all wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can insert wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can update wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can delete wallets" ON wallets;

-- Drop existing payment_transactions policies
DROP POLICY IF EXISTS "Businesses can read own payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admins can read all payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admins can insert payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admins can update payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admins can delete payment transactions" ON payment_transactions;

-- Drop existing payout_requests policies
DROP POLICY IF EXISTS "Workers can read own payout requests" ON payout_requests;
DROP POLICY IF EXISTS "Admins can read all payout requests" ON payout_requests;
DROP POLICY IF EXISTS "Workers can create payout requests" ON payout_requests;
DROP POLICY IF EXISTS "Admins can update any payout request" ON payout_requests;
DROP POLICY IF EXISTS "Admins can delete any payout request" ON payout_requests;

-- Drop existing bank_accounts policies
DROP POLICY IF EXISTS "Workers can read own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Workers can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Workers can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Workers can delete own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can read all bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can insert any bank account" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can update any bank account" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can delete any bank account" ON bank_accounts;

-- ============================================================================
-- ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WALLETS TABLE POLICIES
-- ============================================================================

-- Business owners can read their own wallet
CREATE POLICY "Wallets: Business owners can read own wallet"
  ON wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Workers can read their own wallet
CREATE POLICY "Wallets: Workers can read own wallet"
  ON wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Admins can read all wallets
CREATE POLICY "Wallets: Admins can read all wallets"
  ON wallets FOR SELECT
  USING (is_admin());

-- Only admins can insert wallets (auto-created via application)
CREATE POLICY "Wallets: Admins can insert wallets"
  ON wallets FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update wallets (all balance changes via application functions)
CREATE POLICY "Wallets: Admins can update wallets"
  ON wallets FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete wallets
CREATE POLICY "Wallets: Admins can delete wallets"
  ON wallets FOR DELETE
  USING (is_admin());

-- ============================================================================
-- PAYMENT_TRANSACTIONS TABLE POLICIES
-- ============================================================================

-- Business owners can read their own payment transactions
CREATE POLICY "Payment Transactions: Business owners can read own transactions"
  ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = payment_transactions.business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can read all payment transactions
CREATE POLICY "Payment Transactions: Admins can read all transactions"
  ON payment_transactions FOR SELECT
  USING (is_admin());

-- Only admins can insert payment transactions (auto-created via application)
CREATE POLICY "Payment Transactions: Admins can insert transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update payment transactions (via webhooks/application)
CREATE POLICY "Payment Transactions: Admins can update transactions"
  ON payment_transactions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete payment transactions
CREATE POLICY "Payment Transactions: Admins can delete transactions"
  ON payment_transactions FOR DELETE
  USING (is_admin());

-- ============================================================================
-- PAYOUT_REQUESTS TABLE POLICIES
-- ============================================================================

-- Workers can read their own payout requests
CREATE POLICY "Payout Requests: Workers can read own requests"
  ON payout_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Admins can read all payout requests
CREATE POLICY "Payout Requests: Admins can read all requests"
  ON payout_requests FOR SELECT
  USING (is_admin());

-- Workers can create payout requests for themselves
CREATE POLICY "Payout Requests: Workers can create requests"
  ON payout_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Workers can update their own pending requests (cancel before processing)
CREATE POLICY "Payout Requests: Workers can cancel own pending requests"
  ON payout_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
    AND status = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
    AND status = 'cancelled'
  );

-- Admins can update any payout request
CREATE POLICY "Payout Requests: Admins can update any request"
  ON payout_requests FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete any payout request
CREATE POLICY "Payout Requests: Admins can delete any request"
  ON payout_requests FOR DELETE
  USING (is_admin());

-- ============================================================================
-- BANK_ACCOUNTS TABLE POLICIES
-- ============================================================================

-- Workers can read their own bank accounts
CREATE POLICY "Bank Accounts: Workers can read own accounts"
  ON bank_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Workers can insert their own bank accounts
CREATE POLICY "Bank Accounts: Workers can insert own accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Workers can update their own bank accounts
CREATE POLICY "Bank Accounts: Workers can update own accounts"
  ON bank_accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Workers can delete their own bank accounts
CREATE POLICY "Bank Accounts: Workers can delete own accounts"
  ON bank_accounts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Admins can read all bank accounts
CREATE POLICY "Bank Accounts: Admins can read all accounts"
  ON bank_accounts FOR SELECT
  USING (is_admin());

-- Admins can insert any bank account
CREATE POLICY "Bank Accounts: Admins can insert any account"
  ON bank_accounts FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update any bank account
CREATE POLICY "Bank Accounts: Admins can update any account"
  ON bank_accounts FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete any bank account
CREATE POLICY "Bank Accounts: Admins can delete any account"
  ON bank_accounts FOR DELETE
  USING (is_admin());

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. Business owners can only see their own wallet and payment transactions
-- 2. Workers can only see their own wallet, payout requests, and bank accounts
-- 3. Workers can cancel their own pending payout requests (not processing/completed)
-- 4. Admins have full access for auditing and dispute resolution
-- 5. All policies use text casting (::text) for UUID comparisons to avoid type issues
-- 6. INSERT operations restricted to admins for wallet and payment_transactions
--    (auto-created via application functions)
-- 7. Workers can create payout requests and manage their bank accounts
-- 8. EXISTS subqueries used for better performance on joins
-- ============================================================================
