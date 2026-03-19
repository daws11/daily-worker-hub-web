-- ============================================================================
-- Daily Worker Hub - Fix Wallet Trigger Foreign Key Issue
-- ============================================================================
-- This migration fixes the trigger that was causing registration failures.
-- The trigger was trying to create a wallet before the user row existed in
-- public.users, causing a foreign key violation and blocking registration.
-- Version: 20260301000001
-- Date: 2026-03-01
-- ============================================================================

-- Drop the problematic trigger that creates wallets on auth.user signup
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;

-- Drop the trigger function
DROP FUNCTION IF EXISTS create_wallet_on_user_signup();

-- ============================================================================
-- Alternative: Create wallet via client-side or after user profile creation
-- ============================================================================
-- Instead of creating wallets via a database trigger on auth.users (which fails
-- because the user doesn't exist in public.users yet), wallets should be created
-- by the application code after successfully creating the user profile.
--
-- The signUp function in auth-provider.tsx should be updated to create a wallet
-- after successfully inserting the user into the public.users table.

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
