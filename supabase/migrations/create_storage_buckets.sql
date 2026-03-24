-- Migration: Create Storage Buckets for Profile Photos and Business Logos
-- Run this in Supabase SQL Editor

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for profile-photos bucket
-- Allow public read access
CREATE POLICY "Public Access - Profile Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own photos
CREATE POLICY "Users can update own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up RLS policies for business-logos bucket
-- Allow public read access
CREATE POLICY "Public Access - Business Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload own business logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own logos
CREATE POLICY "Users can update own business logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own logos
CREATE POLICY "Users can delete own business logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
