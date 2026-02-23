-- ============================================================================
-- JOB POSTS TABLE
-- ============================================================================
-- This table tracks social media posts created for each job distribution
-- It stores the platform post ID, status, and performance metrics for analytics

-- Create enum for job post status
CREATE TYPE job_post_status AS ENUM ('pending', 'posted', 'failed', 'deleted');

-- Create job_posts table
CREATE TABLE job_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES business_social_connections(id) ON DELETE CASCADE,

  -- Platform post identifiers
  platform_post_id TEXT, -- The ID returned from the platform API
  platform_post_url TEXT, -- The URL to view the post on the platform

  -- Post content (for tracking what was actually posted)
  content JSONB DEFAULT '{
    "caption": "",
    "media_urls": [],
    "hashtags": []
  }'::jsonb,

  -- Post status and timing
  status job_post_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ, -- If post was scheduled for later
  posted_at TIMESTAMPTZ, -- When the post was actually made

  -- Performance metrics (updated via webhook or periodic fetch)
  metrics JSONB DEFAULT '{
    "impressions": 0,
    "reach": 0,
    "engagement_rate": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "clicks": 0,
    "last_updated": null
  }'::jsonb,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Post metadata
  post_type TEXT, -- e.g., 'image', 'video', 'carousel', 'text'
  media_ids TEXT[], -- Storage bucket IDs for uploaded media

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one post per job per connection (unless retrying)
  UNIQUE(job_id, connection_id)
);

-- Indexes for job_posts
CREATE INDEX idx_job_posts_job_id ON job_posts(job_id);
CREATE INDEX idx_job_posts_connection_id ON job_posts(connection_id);
CREATE INDEX idx_job_posts_status ON job_posts(status);
CREATE INDEX idx_job_posts_platform_post_id ON job_posts(platform_post_id);
CREATE INDEX idx_job_posts_posted_at ON job_posts(posted_at DESC);
CREATE INDEX idx_job_posts_created_at ON job_posts(created_at DESC);

-- Index for posts pending posting
CREATE INDEX idx_job_posts_pending ON job_posts(status)
  WHERE status = 'pending';

-- Index for posts that need metrics refresh
CREATE INDEX idx_job_posts_metrics ON job_posts(job_id, connection_id)
  WHERE status = 'posted' AND (metrics->>'last_updated') IS NULL;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger to update updated_at column
CREATE TRIGGER update_job_posts_updated_at
  BEFORE UPDATE ON job_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on job_posts table
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR JOB_POSTS TABLE
-- ============================================================================

-- Businesses can read posts for their own jobs
CREATE POLICY "Businesses can read own job posts"
  ON job_posts FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM businesses WHERE id IN (
        SELECT business_id FROM jobs WHERE id = job_id
      )
    )
  );

-- Admins can read all job posts
CREATE POLICY "Admins can read all job posts"
  ON job_posts FOR SELECT
  USING (is_admin());

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert job posts"
  ON job_posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL  -- Service role has no uid
    OR auth.uid() IN (
      SELECT user_id FROM businesses WHERE id IN (
        SELECT business_id FROM jobs WHERE id = job_id
      )
    )
  );

-- Businesses can update posts for their own jobs
CREATE POLICY "Businesses can update own job posts"
  ON job_posts FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM businesses WHERE id IN (
        SELECT business_id FROM jobs WHERE id = job_id
      )
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM businesses WHERE id IN (
        SELECT business_id FROM jobs WHERE id = job_id
      )
    )
  );

-- Service role can update (for webhooks/metrics updates)
CREATE POLICY "Service role can update job posts"
  ON job_posts FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

-- Admins can update any job post
CREATE POLICY "Admins can update any job post"
  ON job_posts FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Businesses can delete posts for their own jobs
CREATE POLICY "Businesses can delete own job posts"
  ON job_posts FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM businesses WHERE id IN (
        SELECT business_id FROM jobs WHERE id = job_id
      )
    )
  );

-- Admins can delete any job post
CREATE POLICY "Admins can delete any job post"
  ON job_posts FOR DELETE
  USING (is_admin());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a new job post entry
CREATE OR REPLACE FUNCTION create_job_post(
  job_uuid UUID,
  connection_uuid UUID,
  post_content JSONB DEFAULT NULL,
  post_type_val TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  post_id UUID;
BEGIN
  INSERT INTO job_posts (job_id, connection_id, content, post_type)
  VALUES (
    job_uuid,
    connection_uuid,
    COALESCE(post_content, '{"caption": "", "media_urls": [], "hashtags": []}'::jsonb),
    post_type_val
  )
  RETURNING id INTO post_id;

  RETURN post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark a job post as successfully posted
CREATE OR REPLACE FUNCTION mark_job_post_posted(
  post_uuid UUID,
  platform_post_id_val TEXT,
  platform_post_url_val TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_posts
  SET status = 'posted',
    platform_post_id = platform_post_id_val,
    platform_post_url = platform_post_url_val,
    posted_at = NOW(),
    error_message = NULL,
    error_code = NULL
  WHERE id = post_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark a job post as failed
CREATE OR REPLACE FUNCTION mark_job_post_failed(
  post_uuid UUID,
  error_msg TEXT DEFAULT NULL,
  error_cd TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_posts
  SET status = 'failed',
    error_message = error_msg,
    error_code = error_cd,
    retry_count = retry_count + 1,
    last_retry_at = NOW()
  WHERE id = post_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update job post metrics
CREATE OR REPLACE FUNCTION update_job_post_metrics(
  post_uuid UUID,
  metrics_data JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_posts
  SET metrics = metrics_data || jsonb_build_object('last_updated', NOW()::text)
  WHERE id = post_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to incrementally update a single metric
CREATE OR REPLACE FUNCTION increment_job_post_metric(
  post_uuid UUID,
  metric_name TEXT,
  metric_value INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_posts
  SET metrics = jsonb_set(
    COALESCE(metrics, '{}'::jsonb),
    ARRAY[metric_name],
    COALESCE((metrics->>metric_name)::INTEGER, 0) + metric_value,
    true
  ) || jsonb_build_object('last_updated', NOW()::text)
  WHERE id = post_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get job posts with platform details
CREATE OR REPLACE FUNCTION get_job_posts_with_platform(job_uuid UUID)
RETURNS TABLE (
  id UUID,
  platform_type social_platform_type,
  platform_name TEXT,
  platform_post_id TEXT,
  platform_post_url TEXT,
  status job_post_status,
  posted_at TIMESTAMPTZ,
  metrics JSONB,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jp.id,
    sp.platform_type,
    sp.platform_name,
    jp.platform_post_id,
    jp.platform_post_url,
    jp.status,
    jp.posted_at,
    jp.metrics,
    jp.error_message
  FROM job_posts jp
  JOIN business_social_connections bsc ON jp.connection_id = bsc.id
  JOIN social_platforms sp ON bsc.platform_id = sp.id
  WHERE jp.job_id = job_uuid
  ORDER BY jp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get posts pending distribution
CREATE OR REPLACE FUNCTION get_pending_job_posts()
RETURNS TABLE (
  id UUID,
  job_id UUID,
  connection_id UUID,
  platform_type social_platform_type,
  scheduled_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jp.id,
    jp.job_id,
    jp.connection_id,
    sp.platform_type,
    jp.scheduled_at
  FROM job_posts jp
  JOIN business_social_connections bsc ON jp.connection_id = bsc.id
  JOIN social_platforms sp ON bsc.platform_id = sp.id
  WHERE jp.status = 'pending'
    AND (jp.scheduled_at IS NULL OR jp.scheduled_at <= NOW())
    AND bsc.status = 'active'
    AND sp.is_available = TRUE
  ORDER BY jp.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retry failed job posts
CREATE OR REPLACE FUNCTION retry_job_post(post_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_posts
  SET status = 'pending',
    error_message = NULL,
    error_code = NULL,
    retry_count = retry_count + 1,
    last_retry_at = NOW()
  WHERE id = post_uuid AND status = 'failed';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION create_job_post(UUID, UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_job_post_posted(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_job_post_failed(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_job_post_metrics(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_job_post_metric(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_posts_with_platform(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_job_posts() TO authenticated;
GRANT EXECUTE ON FUNCTION retry_job_post(UUID) TO authenticated;
