-- ============================================================================
-- Daily Worker Hub - Add Admin Role
-- ============================================================================
-- This migration adds the 'admin' role to the user_role enum.
-- Version: 20260223000001
-- Date: 2026-02-23
-- ============================================================================

-- Add 'admin' value to user_role enum
ALTER TYPE user_role ADD VALUE 'admin';
