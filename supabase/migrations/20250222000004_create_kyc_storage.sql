-- Create KYC Documents Storage Bucket
-- This bucket stores KTP (Indonesian ID card) images and selfie photos
-- for worker KYC verification.

-- Insert the bucket configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false, -- Private bucket (documents are sensitive)
  5242880, -- 5MB file size limit (in bytes)
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Add comment for documentation
COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Maximum file size in bytes (5MB for KYC documents)';
COMMENT ON TABLE storage.buckets IS 'Storage bucket configuration for KYC documents';

-- Enable Row Level Security (RLS) for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for KYC documents bucket

-- Policy: Workers can upload their own KYC documents
-- Files should be stored in folders named by worker ID (e.g., kyc-documents/{worker_id}/ktp.jpg)
CREATE POLICY "Workers can upload own KYC documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text
      FROM public.workers
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Workers can view their own KYC documents
CREATE POLICY "Workers can view own KYC documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text
      FROM public.workers
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Workers can delete their own KYC documents (only pending KYC)
CREATE POLICY "Workers can delete own pending KYC documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text
      FROM public.workers w
      WHERE w.user_id = auth.uid()
        AND w.kyc_status IN ('unverified', 'pending')
    )
  );

-- Policy: Workers can update (replace) their own KYC documents (only pending KYC)
CREATE POLICY "Workers can update own pending KYC documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text
      FROM public.workers w
      WHERE w.user_id = auth.uid()
        AND w.kyc_status IN ('unverified', 'pending')
    )
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text
      FROM public.workers w
      WHERE w.user_id = auth.uid()
        AND w.kyc_status IN ('unverified', 'pending')
    )
  );

-- Policy: Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete any KYC documents
CREATE POLICY "Admins can delete any KYC documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Workers can upload own KYC documents" ON storage.objects IS 'Allows authenticated workers to upload KYC documents to their own folder';
COMMENT ON POLICY "Workers can view own KYC documents" ON storage.objects IS 'Allows authenticated workers to view their own KYC documents';
COMMENT ON POLICY "Workers can delete own pending KYC documents" ON storage.objects IS 'Allows workers to delete documents only when KYC is pending or unverified';
COMMENT ON POLICY "Workers can update own pending KYC documents" ON storage.objects IS 'Allows workers to replace documents only when KYC is pending or unverified';
COMMENT ON POLICY "Admins can view all KYC documents" ON storage.objects IS 'Allows admins to view all KYC documents for verification';
COMMENT ON POLICY "Admins can delete any KYC documents" ON storage.objects IS 'Allows admins to delete any KYC documents if needed';
