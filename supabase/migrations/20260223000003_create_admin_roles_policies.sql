-- ============================================================================
-- Daily Worker Hub - Admin Roles RLS Policies
-- ============================================================================
-- This migration adds comprehensive admin-specific RLS policies for all tables
-- and storage buckets. It ensures admins have proper access for moderation,
-- audit, and management purposes.
-- Version: 20260223000003
-- Date: 2026-02-23
-- ============================================================================

-- ============================================================================
-- DROP EXISTING ADMIN POLICIES (for consistency)
-- ============================================================================

-- Drop existing admin policies on storage.objects to replace with consistent versions
DROP POLICY IF EXISTS "Admins can view all storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can insert storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete storage objects" ON storage.objects;

-- ============================================================================
-- STORAGE BUCKET ADMIN POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Admin policies for avatars bucket
-- ----------------------------------------------------------------------------

-- Admins can view all avatars (for moderation)
CREATE POLICY "Admins can view all avatars"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can upload avatars (for user management)
CREATE POLICY "Admins can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any avatar
CREATE POLICY "Admins can update avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete any avatar (for content moderation)
CREATE POLICY "Admins can delete avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Admin policies for documents bucket
-- ----------------------------------------------------------------------------

-- Admins can view all documents (for KYC verification)
CREATE POLICY "Admins can view all documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can upload documents (for admin operations)
CREATE POLICY "Admins can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any document
CREATE POLICY "Admins can update documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete any document
CREATE POLICY "Admins can delete documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Admin policies for images bucket
-- ----------------------------------------------------------------------------

-- Admins can view all images (for moderation)
CREATE POLICY "Admins can view all images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can upload images (for content management)
CREATE POLICY "Admins can upload images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any image
CREATE POLICY "Admins can update images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete any image (for content moderation)
CREATE POLICY "Admins can delete images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE ADMIN POLICY CONSISTENCY UPDATES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Ensure admin_audit_logs has INSERT policy for database triggers
-- ----------------------------------------------------------------------------

-- Drop existing insert policy to replace with one that allows service role
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_logs;

-- Allow insert via service role (for triggers) and admin users
CREATE POLICY "Service role and admins can insert audit logs"
  ON admin_audit_logs
  FOR INSERT
  WITH CHECK (
    -- Allow service role (for database triggers)
    auth.uid() IS NULL
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

-- Add comments with error handling (may fail due to permissions)
DO $$
BEGIN
  -- Storage policies comments
  PERFORM pg_catalog.pg_extension_config_dump('comment on policy "Admins can view all avatars" on storage.objects', null);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add comment on policy: %', SQLERRM;
END $$;

-- Comments are optional, so we wrap them individually
DO $$
BEGIN
  COMMENT ON POLICY "Admins can view all avatars" ON storage.objects IS 'Allows admins to view all avatar images for moderation and audit purposes';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can upload avatars" ON storage.objects IS 'Allows admins to upload avatar images on behalf of users';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can update avatars" ON storage.objects IS 'Allows admins to modify any avatar image';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can delete avatars" ON storage.objects IS 'Allows admins to remove inappropriate avatar images';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can view all documents" ON storage.objects IS 'Allows admins to view all KYC documents for verification';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can upload documents" ON storage.objects IS 'Allows admins to upload documents for admin operations';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can update documents" ON storage.objects IS 'Allows admins to modify any documents';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can delete documents" ON storage.objects IS 'Allows admins to remove inappropriate or fraudulent documents';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can view all images" ON storage.objects IS 'Allows admins to view all user-uploaded images for moderation';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can upload images" ON storage.objects IS 'Allows admins to upload images for content management';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can update images" ON storage.objects IS 'Allows admins to modify any images';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  COMMENT ON POLICY "Admins can delete images" ON storage.objects IS 'Allows admins to remove inappropriate images';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Table policy comments
COMMENT ON POLICY "Service role and admins can insert audit logs" ON admin_audit_logs IS 'Allows database triggers (service role) and admin users to create audit log entries';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
