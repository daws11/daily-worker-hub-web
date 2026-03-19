-- Add platform_settings column to jobs table
-- This column stores platform distribution settings for job postings

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS platform_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN jobs.platform_settings IS 'JSON object storing platform distribution settings (e.g., which platforms to auto-distribute to)';
