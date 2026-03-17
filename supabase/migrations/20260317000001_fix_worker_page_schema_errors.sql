-- ============================================================================
-- FIX WORKER PAGE SCHEMA ERRORS
-- ============================================================================
-- This migration fixes several schema errors found in worker pages:
-- 1. Add total_amount column to bookings table (was missing)
-- 2. Add completed_at column to bookings table (was missing)
-- 3. Ensure wallets table has currency column
-- 4. Ensure demo worker profile exists
-- 5. Refresh schema cache
-- Version: 20260317000001
-- Date: 2026-03-17
-- ============================================================================

-- ============================================================================
-- 1. ADD total_amount COLUMN TO bookings TABLE
-- ============================================================================
-- The earnings page queries total_amount, but only final_price exists
-- Add total_amount as a copy of final_price for backward compatibility

-- Add total_amount column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN total_amount NUMERIC(12, 2) DEFAULT 0;
    
    -- Copy final_price to total_amount for existing records
    UPDATE bookings SET total_amount = COALESCE(final_price, 0) WHERE total_amount IS NULL OR total_amount = 0;
  END IF;
END $$;

-- Create index for total_amount queries
CREATE INDEX IF NOT EXISTS idx_bookings_total_amount ON bookings(total_amount);

COMMENT ON COLUMN bookings.total_amount IS 'Total payment amount for the booking (synced with final_price)';

-- ============================================================================
-- 2. ADD completed_at COLUMN TO bookings TABLE
-- ============================================================================
-- Some pages query completed_at, but the column doesn't exist
-- Use check_out_at as the completion timestamp

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN completed_at TIMESTAMPTZ;
    
    -- Copy check_out_at to completed_at for existing completed bookings
    UPDATE bookings 
    SET completed_at = check_out_at 
    WHERE status = 'completed' AND check_out_at IS NOT NULL;
  END IF;
END $$;

-- Create index for completed_at queries
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at ON bookings(completed_at);

COMMENT ON COLUMN bookings.completed_at IS 'Timestamp when the booking was completed (synced with check_out_at)';

-- ============================================================================
-- 3. ADD currency COLUMN TO wallets TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'currency'
  ) THEN
    ALTER TABLE wallets ADD COLUMN currency TEXT DEFAULT 'IDR';
  END IF;
END $$;

-- Add balance column if missing (some wallet versions don't have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'balance'
  ) THEN
    ALTER TABLE wallets ADD COLUMN balance NUMERIC(10, 2) DEFAULT 0.00;
  END IF;
END $$;

-- Add is_active column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE wallets ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================================================
-- 4. ENSURE DEMO WORKER PROFILE EXISTS
-- ============================================================================

DO $$
DECLARE
  worker_user_id UUID := 'b1ffcd00-0d1c-5f90-cc7e-7cca0e491b22';
  worker_profile_id UUID;
BEGIN
  -- Check if worker profile exists
  SELECT id INTO worker_profile_id FROM workers WHERE user_id = worker_user_id;
  
  IF worker_profile_id IS NULL THEN
    -- Create worker profile
    INSERT INTO workers (user_id, full_name, phone, address, created_at, updated_at)
    VALUES (
      worker_user_id,
      'Demo Worker',
      '+6281234567891',
      'Jl. Worker No. 456, Bali',
      NOW(),
      NOW()
    )
    RETURNING id INTO worker_profile_id;
    
    RAISE NOTICE 'Created demo worker profile: %', worker_profile_id;
  ELSE
    RAISE NOTICE 'Demo worker profile already exists: %', worker_profile_id;
  END IF;
END $$;

-- ============================================================================
-- 5. ENSURE DEMO WORKER HAS WALLET
-- ============================================================================

DO $$
DECLARE
  worker_user_id UUID := 'b1ffcd00-0d1c-5f90-cc7e-7cca0e491b22';
BEGIN
  -- Create or update wallet for demo worker
  INSERT INTO wallets (user_id, balance, currency, is_active, created_at, updated_at)
  VALUES (worker_user_id, 500000, 'IDR', true, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = EXCLUDED.balance,
    currency = COALESCE(wallets.currency, 'IDR'),
    is_active = COALESCE(wallets.is_active, true),
    updated_at = NOW();
END $$;

-- ============================================================================
-- 6. FIX ANY SCHEMA CACHE ISSUES
-- ============================================================================

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
