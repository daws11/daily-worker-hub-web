-- ============================================================================
-- Daily Worker Hub - Storage Buckets Migration
-- ============================================================================
-- This migration creates storage buckets for file uploads.
-- Version: 004
-- Date: 2026-02-22
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Insert storage buckets
-- ----------------------------------------------------------------------------

-- Avatars bucket (for user profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Documents bucket (for KYC documents, contracts, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket for sensitive documents
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Images bucket (for job photos, business portfolio, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- RLS Policies for Storage Buckets
-- ----------------------------------------------------------------------------

-- ============================================================================
-- AVATARS BUCKET POLICIES
-- ============================================================================

-- Allow public read access to avatars
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Allow users to upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
CREATE POLICY "Allow users to update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
CREATE POLICY "Allow users to delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- DOCUMENTS BUCKET POLICIES
-- ============================================================================

-- Deny public read access to documents (private bucket)
DROP POLICY IF EXISTS "Allow public read access to documents" ON storage.objects;

-- Allow users to read their own documents
CREATE POLICY "Allow users to read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to upload their own documents
CREATE POLICY "Allow users to upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own documents
CREATE POLICY "Allow users to update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own documents
CREATE POLICY "Allow users to delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- IMAGES BUCKET POLICIES
-- ============================================================================

-- Allow public read access to images
CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'images');

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own images
CREATE POLICY "Allow users to update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE FOLDER STRUCTURE
-- ============================================================================
-- Expected folder structure for each bucket:
--
-- avatars/
--   ├── {user_id}/
--   │   ├── avatar.jpg
--   │   └── ...
--
-- documents/
--   ├── {user_id}/
--   │   ├── ktp.pdf
--   │   ├── selfie.jpg
--   │   └── ...
--
-- images/
--   ├── {user_id}/
--   │   ├── job-001/
--   │   │   ├── photo1.jpg
--   │   │   └── ...
--   │   └── ...
--
-- Notes:
-- - {user_id} is the UUID of the user from auth.uid()
-- - Files are stored under user-specific folders for proper RLS
-- - RLS policies ensure users can only access their own files
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (Optional - for easier file path management)
-- ============================================================================

-- Function to get a user's avatar path
CREATE OR REPLACE FUNCTION get_user_avatar_path(user_id UUID, filename TEXT DEFAULT 'avatar.jpg')
RETURNS TEXT AS $$
  SELECT 'avatars/' || user_id::text || '/' || filename;
$$ LANGUAGE SQL STABLE;

-- Function to get a user's document path
CREATE OR REPLACE FUNCTION get_user_document_path(user_id UUID, filename TEXT)
RETURNS TEXT AS $$
  SELECT 'documents/' || user_id::text || '/' || filename;
$$ LANGUAGE SQL STABLE;

-- Function to get a user's image path
CREATE OR REPLACE FUNCTION get_user_image_path(user_id UUID, filename TEXT)
RETURNS TEXT AS $$
  SELECT 'images/' || user_id::text || '/' || filename;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- TRIGGERS (Optional - for automatic avatar_url updates)
-- ============================================================================

-- Trigger to update user avatar_url when a new avatar is uploaded
CREATE OR REPLACE FUNCTION handle_new_avatar()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract user_id from the storage path: avatars/{user_id}/{filename}
  -- Update the users table with the new avatar URL
  UPDATE users
  SET avatar_url = storage.public_url(NEW.id)
  WHERE id = (
    SELECT (regexp_matches(NEW.name, '^avatars/([^/]+)/'))[1]::UUID
  )
  AND (regexp_matches(NEW.name, '^avatars/([^/]+)/')) IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for avatar uploads
DROP TRIGGER IF EXISTS on_avatar_upload ON storage.objects;
CREATE TRIGGER on_avatar_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'avatars')
  EXECUTE FUNCTION handle_new_avatar();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO authenticated, anon;

-- Grant select on storage tables
GRANT SELECT ON storage.buckets TO authenticated, anon;
GRANT SELECT ON storage.objects TO authenticated, anon;

-- Grant necessary permissions for authenticated users
GRANT INSERT ON storage.objects TO authenticated;
GRANT UPDATE ON storage.objects TO authenticated;
GRANT DELETE ON storage.objects TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration sets up:
-- 1. Three storage buckets: avatars, documents, images
-- 2. RLS policies for secure access control
-- 3. Helper functions for file path management
-- 4. Trigger to automatically update user avatar_url
-- 5. Proper grants for authenticated and anonymous users
-- ============================================================================
