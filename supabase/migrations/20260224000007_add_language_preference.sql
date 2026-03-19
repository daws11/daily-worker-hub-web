-- Add language_preference column to users table
-- This migration adds a field to support multi-language preferences for users
-- Supported languages: English (en) and Indonesian (id)

-- Add language_preference field to track user's preferred language
-- Values: 'en' (English), 'id' (Indonesian)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS language_preference TEXT NOT NULL DEFAULT 'en'
  CHECK (language_preference IN ('en', 'id'));

-- Add comment for documentation
COMMENT ON COLUMN public.users.language_preference IS 'User''s preferred language: en (English - default) or id (Indonesian)';

-- Create index for language preference queries (useful for filtering users by language)
CREATE INDEX IF NOT EXISTS idx_users_language_preference ON public.users(language_preference);
