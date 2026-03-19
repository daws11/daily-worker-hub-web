-- ============================================================================
-- BUSINESS SOCIAL CONNECTIONS TABLE
-- ============================================================================
-- This table stores social media account connections for businesses
-- OAuth tokens and platform-specific settings for each connection

-- Create enum for connection status
CREATE TYPE connection_status AS ENUM ('active', 'disconnected', 'expired', 'pending');

-- Create business_social_connections table
CREATE TABLE business_social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES social_platforms(id) ON DELETE CASCADE,

  -- Platform account details
  platform_account_id TEXT, -- The external account ID from the platform
  platform_account_name TEXT, -- Display name (e.g., @username)
  platform_account_url TEXT, -- Profile URL

  -- OAuth credentials (encrypted in production)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Connection status
  status connection_status NOT NULL DEFAULT 'pending',

  -- Connection settings
  is_default BOOLEAN DEFAULT FALSE, -- Mark as default for auto-posting
  auto_post_enabled BOOLEAN DEFAULT TRUE, -- Enable automatic job posting

  -- Webhook configuration
  webhook_enabled BOOLEAN DEFAULT FALSE,
  webhook_url TEXT,
  webhook_secret TEXT,

  -- Last sync and validation
  last_validated_at TIMESTAMPTZ,
  last_posted_at TIMESTAMPTZ,
  validation_errors JSONB,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one connection per platform per business (unique constraint)
  UNIQUE(business_id, platform_id)
);

-- Indexes for business_social_connections
CREATE INDEX idx_business_social_connections_business_id ON business_social_connections(business_id);
CREATE INDEX idx_business_social_connections_platform_id ON business_social_connections(platform_id);
CREATE INDEX idx_business_social_connections_status ON business_social_connections(status);
CREATE INDEX idx_business_social_connections_is_default ON business_social_connections(is_default);
CREATE INDEX idx_business_social_connections_platform_account_id ON business_social_connections(platform_account_id);
CREATE INDEX idx_business_social_connections_token_expires_at ON business_social_connections(token_expires_at);

-- Index for active connections with auto-post enabled
CREATE INDEX idx_business_social_connections_active_auto_post
  ON business_social_connections(business_id, platform_id)
  WHERE status = 'active' AND auto_post_enabled = TRUE;

-- Note: Token expiration check needs to be done via query
-- since NOW() is not IMMUTABLE and cannot be used in index predicate

-- ============================================================================
-- FUNCTIONS AND TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger to update updated_at column
CREATE TRIGGER update_business_social_connections_updated_at
  BEFORE UPDATE ON business_social_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on business_social_connections table
ALTER TABLE business_social_connections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR BUSINESS_SOCIAL_CONNECTIONS TABLE
-- ============================================================================

-- Businesses can read their own connections
CREATE POLICY "Businesses can read own connections"
  ON business_social_connections FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Admins can read all connections
CREATE POLICY "Admins can read all connections"
  ON business_social_connections FOR SELECT
  USING (is_admin());

-- Service role can read connections (for edge functions)
CREATE POLICY "Service role can read connections"
  ON business_social_connections FOR SELECT
  USING (auth.uid() IS NULL);

-- Businesses can insert their own connections
CREATE POLICY "Businesses can insert own connections"
  ON business_social_connections FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Service role can insert connections (for OAuth flow)
CREATE POLICY "Service role can insert connections"
  ON business_social_connections FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

-- Businesses can update their own connections
CREATE POLICY "Businesses can update own connections"
  ON business_social_connections FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Service role can update connections (for token refresh)
CREATE POLICY "Service role can update connections"
  ON business_social_connections FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

-- Admins can update any connection
CREATE POLICY "Admins can update any connection"
  ON business_social_connections FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Businesses can delete their own connections
CREATE POLICY "Businesses can delete own connections"
  ON business_social_connections FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Admins can delete any connection
CREATE POLICY "Admins can delete any connection"
  ON business_social_connections FOR DELETE
  USING (is_admin());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a new social connection
CREATE OR REPLACE FUNCTION create_business_social_connection(
  business_uuid UUID,
  platform_uuid UUID,
  account_name_val TEXT,
  access_token_val TEXT,
  refresh_token_val TEXT DEFAULT NULL,
  token_expires_val TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  connection_id UUID;
BEGIN
  -- Check if connection already exists
  SELECT id INTO connection_id
  FROM business_social_connections
  WHERE business_id = business_uuid
    AND platform_id = platform_uuid
    AND status IN ('active', 'pending')
  LIMIT 1;

  -- If exists, update tokens
  IF FOUND THEN
    UPDATE business_social_connections
    SET platform_account_name = account_name_val,
        access_token = access_token_val,
        refresh_token = refresh_token_val,
        token_expires_at = token_expires_val,
        status = 'active',
        updated_at = NOW()
    WHERE id = connection_id;

    RETURN connection_id;
  END IF;

  -- Otherwise, create new connection
  INSERT INTO business_social_connections (
    business_id,
    platform_id,
    platform_account_name,
    access_token,
    refresh_token,
    token_expires_at,
    status
  )
  VALUES (
    business_uuid,
    platform_uuid,
    account_name_val,
    access_token_val,
    refresh_token_val,
    token_expires_val,
    'active'
  )
  RETURNING id INTO connection_id;

  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active connections for a business
CREATE OR REPLACE FUNCTION get_business_active_connections(business_uuid UUID)
RETURNS TABLE (
  id UUID,
  platform_type social_platform_type,
  platform_name TEXT,
  platform_account_name TEXT,
  is_default BOOLEAN,
  auto_post_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bsc.id,
    sp.platform_type,
    sp.platform_name,
    bsc.platform_account_name,
    bsc.is_default,
    bsc.auto_post_enabled
  FROM business_social_connections bsc
  JOIN social_platforms sp ON bsc.platform_id = sp.id
  WHERE bsc.business_id = business_uuid
    AND bsc.status = 'active'
    AND sp.is_available = TRUE
  ORDER BY bsc.is_default DESC, bsc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get connections with expiring tokens (for automated refresh)
CREATE OR REPLACE FUNCTION get_expiring_token_connections()
RETURNS TABLE (
  id UUID,
  business_id UUID,
  platform_type social_platform_type,
  token_expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bsc.id,
    bsc.business_id,
    sp.platform_type,
    bsc.token_expires_at
  FROM business_social_connections bsc
  JOIN social_platforms sp ON bsc.platform_id = sp.id
  WHERE bsc.status = 'active'
    AND bsc.token_expires_at IS NOT NULL
    AND bsc.token_expires_at BETWEEN NOW() AND (NOW() + INTERVAL '7 days')
    AND bsc.refresh_token IS NOT NULL
  ORDER BY bsc.token_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update connection tokens (after OAuth refresh)
CREATE OR REPLACE FUNCTION update_connection_tokens(
  connection_uuid UUID,
  access_token_val TEXT,
  refresh_token_val TEXT DEFAULT NULL,
  token_expires_val TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE business_social_connections
  SET access_token = access_token_val,
      refresh_token = COALESCE(refresh_token_val, refresh_token),
      token_expires_at = token_expires_val,
      last_validated_at = NOW(),
      status = 'active'
  WHERE id = connection_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disconnect a social connection
CREATE OR REPLACE FUNCTION disconnect_social_connection(connection_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE business_social_connections
  SET status = 'disconnected',
      access_token = NULL,
      refresh_token = NULL,
      token_expires_at = NULL,
      updated_at = NOW()
  WHERE id = connection_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set default connection for a business/platform
CREATE OR REPLACE FUNCTION set_default_connection(connection_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  business_uuid UUID;
  platform_uuid UUID;
BEGIN
  -- Get business and platform
  SELECT business_id, platform_id
  INTO business_uuid, platform_uuid
  FROM business_social_connections
  WHERE id = connection_uuid;

  -- Clear existing default for same business/platform
  UPDATE business_social_connections
  SET is_default = FALSE
  WHERE business_id = business_uuid
    AND platform_id = platform_uuid
    AND id != connection_uuid;

  -- Set new default
  UPDATE business_social_connections
  SET is_default = TRUE
  WHERE id = connection_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION create_business_social_connection(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_active_connections(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_token_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION update_connection_tokens(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION disconnect_social_connection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_default_connection(UUID) TO authenticated;

-- Grant service role execution (for edge functions)
GRANT EXECUTE ON FUNCTION create_business_social_connection(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION update_connection_tokens(UUID, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION get_expiring_token_connections() TO service_role;
