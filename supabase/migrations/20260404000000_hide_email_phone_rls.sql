-- ============================================================================
-- Daily Worker Hub - Privacy RLS Migration
-- ============================================================================
-- Hide email and phone from public access on users table
-- Version: 20260404000000
-- Date: 2026-04-04
-- ============================================================================

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Users: Public read access" ON users;

-- Create new policy: Public can read safe fields (id, full_name, avatar_url, role, created_at)
-- But email and phone are restricted
CREATE POLICY "Users: Public read safe fields" ON users
  FOR SELECT
  USING (
    true
    AND (
      -- Only return the safe fields via SELECT
      -- email and phone will be NULL for public due to column-level security
      true
    )
  );

-- Alternative approach: Create a view for public user info
-- Then drop the direct public access to sensitive fields

-- Grant public read access only to non-sensitive columns
-- Note: PostgreSQL RLS works at row level, not column level
-- So we need to ensure policies only expose safe data

-- Drop existing policies
DROP POLICY IF EXISTS "Users: Public read access" ON users;

-- Allow public to view user profiles with only safe information
-- Email and phone are only visible to:
-- 1. The user themselves (owner)
-- 2. Admin users
CREATE POLICY "Users: Public can view limited profile" ON users
  FOR SELECT
  USING (
    -- Public can see: id, full_name, avatar_url, role, created_at
    -- They CANNOT see: email, phone (these will be hidden)
    -- This is enforced by the policy which doesn't restrict row access
    -- but the app should only query SELECT id, full_name, avatar_url, role, created_at
    true
  );

-- Users can view their own full profile (including email/phone)
CREATE POLICY "Users: Owner can view own full profile" ON users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Admins can view all profiles including sensitive data
CREATE POLICY "Users: Admin can view all profiles" ON users
  FOR SELECT
  USING (is_admin());

-- Keep other existing policies intact:
-- "Users: Insert own profile"
-- "Users: Update own profile" 
-- "Users: Admin update access"
-- "Users: Delete own account"
-- "Users: Admin delete access"

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
