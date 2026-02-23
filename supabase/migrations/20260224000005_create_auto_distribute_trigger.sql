-- ============================================================================
-- AUTO-DISTRIBUTE TRIGGER FOR JOBS
-- ============================================================================
-- This migration creates a trigger that automatically creates job_posts entries
-- when a new job is created. The trigger:
-- 1. Fires after INSERT on the jobs table
-- 2. Checks the business's active social platform connections
-- 3. Respects per-job platform_settings overrides
-- 4. Creates pending job_posts for each enabled platform
-- Version: 20260224000005
-- Date: 2026-02-24
-- ============================================================================

-- Function to handle auto-distribution of new jobs to social platforms
CREATE OR REPLACE FUNCTION auto_distribute_job()
RETURNS TRIGGER AS $$
DECLARE
  connection_record RECORD;
  platform_enabled BOOLEAN;
  job_platform_settings JSONB;
BEGIN
  -- Get the job's platform_settings (defaults to empty object if null)
  job_platform_settings := COALESCE(NEW.platform_settings, '{}'::jsonb);

  -- Loop through all active social platform connections for the business
  FOR connection_record IN
    SELECT bsc.id, bsc.platform_id, sp.platform_type
    FROM business_social_connections bsc
    JOIN social_platforms sp ON bsc.platform_id = sp.id
    WHERE bsc.business_id = NEW.business_id
      AND bsc.status = 'active'
      AND sp.is_available = TRUE
      AND (bsc.token_expires_at IS NULL OR bsc.token_expires_at > NOW())
  LOOP
    -- Check if this platform is enabled for this specific job
    -- Platform settings format: { "platforms": { "instagram": { "enabled": true }, "facebook": { "enabled": false } } }
    platform_enabled := COALESCE(
      (job_platform_settings->'platforms'->connection_record.platform_type->>'enabled')::boolean,
      -- Default to true if auto_post is enabled in connection settings
      (connection_record.settings->>'auto_post')::boolean
    );

    -- Only create job_post if platform is enabled
    IF platform_enabled THEN
      INSERT INTO job_posts (job_id, connection_id, status)
      VALUES (NEW.id, connection_record.id, 'pending')
      ON CONFLICT (job_id, connection_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the job creation
    -- The job_posts entries can be created manually or via retry later
    RAISE WARNING 'Failed to auto-distribute job % to social platforms: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-distribution on job creation
DROP TRIGGER IF EXISTS trigger_auto_distribute_job ON jobs;
CREATE TRIGGER trigger_auto_distribute_job
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION auto_distribute_job();

-- ============================================================================
-- HELPER FUNCTION FOR MANUAL DISTRIBUTION
-- ============================================================================

-- Function to manually trigger distribution for an existing job
CREATE OR REPLACE FUNCTION manually_distribute_job(job_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  created_count INTEGER := 0;
  connection_record RECORD;
  platform_enabled BOOLEAN;
  job_record RECORD;
  job_platform_settings JSONB;
BEGIN
  -- Get the job details
  SELECT * INTO job_record FROM jobs WHERE id = job_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', job_uuid;
  END IF;

  -- Get the job's platform_settings
  job_platform_settings := COALESCE(job_record.platform_settings, '{}'::jsonb);

  -- Loop through all active social platform connections for the business
  FOR connection_record IN
    SELECT bsc.id, bsc.platform_id, sp.platform_type
    FROM business_social_connections bsc
    JOIN social_platforms sp ON bsc.platform_id = sp.id
    WHERE bsc.business_id = job_record.business_id
      AND bsc.status = 'active'
      AND sp.is_available = TRUE
      AND (bsc.token_expires_at IS NULL OR bsc.token_expires_at > NOW())
  LOOP
    -- Check if this platform is enabled for this job
    platform_enabled := COALESCE(
      (job_platform_settings->'platforms'->connection_record.platform_type->>'enabled')::boolean,
      (connection_record.settings->>'auto_post')::boolean
    );

    IF platform_enabled THEN
      INSERT INTO job_posts (job_id, connection_id, status)
      VALUES (job_uuid, connection_record.id, 'pending')
      ON CONFLICT (job_id, connection_id) DO NOTHING;

      IF FOUND THEN
        created_count := created_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION TO CHECK DISTRIBUTION STATUS
-- ============================================================================

-- Function to get distribution status for a job
CREATE OR REPLACE FUNCTION get_job_distribution_status(job_uuid UUID)
RETURNS TABLE (
  platform_type social_platform_type,
  platform_name TEXT,
  status job_post_status,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.platform_type,
    sp.platform_name,
    jp.status,
    jp.scheduled_at,
    jp.posted_at,
    jp.error_message
  FROM job_posts jp
  JOIN business_social_connections bsc ON jp.connection_id = bsc.id
  JOIN social_platforms sp ON bsc.platform_id = sp.id
  WHERE jp.job_id = job_uuid
  ORDER BY sp.platform_name, jp.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION manually_distribute_job(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_distribution_status(UUID) TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
