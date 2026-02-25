-- ============================================================================
-- SOCIAL PLATFORMS TABLE
-- ============================================================================
-- This table defines the available social media platforms for job distribution
-- and stores platform-specific configuration for API integration

-- Create enum for platform types
CREATE TYPE social_platform_type AS ENUM ('instagram', 'facebook', 'twitter', 'linkedin');

-- Create enum for platform status
CREATE TYPE social_platform_status AS ENUM ('active', 'inactive', 'maintenance');

-- Create social_platforms table
CREATE TABLE social_platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_type social_platform_type NOT NULL UNIQUE,
  platform_name TEXT NOT NULL,
  description TEXT,
  status social_platform_status NOT NULL DEFAULT 'active',
  api_version TEXT,
  auth_type TEXT NOT NULL DEFAULT 'oauth2', -- oauth2, api_key, etc
  config JSONB DEFAULT '{
    "character_limit": 2200,
    "supports_images": true,
    "supports_videos": false,
    "auto_post_enabled": true
  }'::jsonb,
  webhook_url TEXT,
  webhook_secret TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for social_platforms
CREATE INDEX idx_social_platforms_type ON social_platforms(platform_type);
CREATE INDEX idx_social_platforms_status ON social_platforms(status);
CREATE INDEX idx_social_platforms_is_available ON social_platforms(is_available);
CREATE INDEX idx_social_platforms_created_at ON social_platforms(created_at DESC);

-- Insert default platforms
INSERT INTO social_platforms (platform_type, platform_name, description, api_version, config) VALUES
  ('instagram', 'Instagram', 'Instagram Graph API for automatic job posting to Instagram Business accounts', 'v18.0', '{
    "character_limit": 2200,
    "supports_images": true,
    "supports_videos": true,
    "auto_post_enabled": true,
    "requires_business_account": true,
    "post_types": ["image", "video", "carousel"]
  }'::jsonb),
  ('facebook', 'Facebook', 'Facebook Graph API for automatic job posting to Facebook Pages', 'v18.0', '{
    "character_limit": 63206,
    "supports_images": true,
    "supports_videos": true,
    "auto_post_enabled": true,
    "requires_page_access": true,
    "post_types": ["post", "photo", "video"]
  }'::jsonb);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger to update updated_at column
CREATE TRIGGER update_social_platforms_updated_at
  BEFORE UPDATE ON social_platforms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on social_platforms table
ALTER TABLE social_platforms ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR SOCIAL_PLATFORMS TABLE
-- ============================================================================

-- All authenticated users can read active/available platforms (needed for platform selection)
CREATE POLICY "Authenticated users can read available platforms"
  ON social_platforms FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (is_available = TRUE OR status = 'active')
  );

-- Admins can read all platforms
CREATE POLICY "Admins can read all platforms"
  ON social_platforms FOR SELECT
  USING (is_admin());

-- Only admins can insert platforms
CREATE POLICY "Admins can insert platforms"
  ON social_platforms FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update platforms
CREATE POLICY "Admins can update platforms"
  ON social_platforms FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete platforms
CREATE POLICY "Admins can delete platforms"
  ON social_platforms FOR DELETE
  USING (is_admin());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a platform is available for posting
CREATE OR REPLACE FUNCTION is_platform_available(platform social_platform_type)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM social_platforms
    WHERE platform_type = platform
    AND is_available = TRUE
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform config
CREATE OR REPLACE FUNCTION get_platform_config(platform social_platform_type)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT config FROM social_platforms
    WHERE platform_type = platform
    AND is_available = TRUE
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_platform_available(social_platform_type) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_config(social_platform_type) TO authenticated;
