-- ============================================================================
-- Daily Worker Hub - Create Rate Limits Table
-- ============================================================================
-- This migration creates the rate_limits table for sliding window rate
-- limiting backed by PostgreSQL, replacing the in-memory Map approach.
-- This enables consistent rate limiting across serverless/multi-instance
-- deployments.
-- Version: 20260326100000
-- Date: 2026-03-26
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Rate limit type enum (matches RateLimitType in lib/rate-limit.ts)
CREATE TYPE rate_limit_type AS ENUM ('auth', 'api-authenticated', 'api-public', 'payment');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Rate limits table (request log for sliding window)
-- ----------------------------------------------------------------------------
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  -- Identifier format: "user:<userId>", "ip:<ipAddress>", or prefixed variants
  rate_limit_type rate_limit_type NOT NULL,
  -- Type of rate limit (auth, api-authenticated, api-public, payment)
  window_ms INTEGER NOT NULL,
  -- Window duration in milliseconds (stored for reference during cleanup)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Timestamp of this individual request record
  CONSTRAINT chk_identifier_not_empty CHECK (identifier <> '')
);

-- Add unique constraint to prevent duplicate entries within same millisecond
-- for the same identifier+type combination (unlikely but possible)
CREATE UNIQUE INDEX idx_rate_limits_unique_entry
  ON rate_limits (identifier, rate_limit_type, created_at)
  WHERE window_ms > 0;

-- ----------------------------------------------------------------------------
-- Indexes for efficient sliding window queries
-- ----------------------------------------------------------------------------

-- Primary index for rate limit lookups: count requests in window by identifier+type
CREATE INDEX idx_rate_limits_lookup
  ON rate_limits (identifier, rate_limit_type, created_at DESC);

-- Index for cleanup operations: delete old entries by type and timestamp
CREATE INDEX idx_rate_limits_cleanup
  ON rate_limits (rate_limit_type, created_at)
  WITH (fillfactor = 90);

-- Partial index for auth rate limits (highest traffic, cleanup priority)
CREATE INDEX idx_rate_limits_auth_active
  ON rate_limits (created_at DESC)
  WHERE rate_limit_type = 'auth'
  AND created_at > NOW() - INTERVAL '10 minutes';

-- Partial index for payment rate limits (most sensitive)
CREATE INDEX idx_rate_limits_payment_active
  ON rate_limits (created_at DESC)
  WHERE rate_limit_type = 'payment'
  AND created_at > NOW() - INTERVAL '10 minutes';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function to clean up expired rate limit entries
-- Called periodically to prevent table bloat from old request records
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_time TIMESTAMPTZ;
BEGIN
  -- Delete entries older than their respective window
  -- We need to be conservative: only delete entries definitely outside
  -- any possible window for their type
  cutoff_time := NOW() - INTERVAL '10 minutes';

  DELETE FROM rate_limits
  WHERE created_at < cutoff_time;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ----------------------------------------------------------------------------
-- Function to get current request count for sliding window
-- Returns the number of requests for an identifier+type within the window
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_rate_limit_count(
  p_identifier TEXT,
  p_rate_limit_type rate_limit_type,
  p_window_ms INTEGER
) RETURNS INTEGER AS $$
DECLARE
  request_count INTEGER;
  cutoff_time TIMESTAMPTZ;
BEGIN
  cutoff_time := NOW() - (p_window_ms || ' milliseconds')::INTERVAL;

  SELECT COUNT(*) INTO request_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND rate_limit_type = p_rate_limit_type
    AND created_at > cutoff_time;

  RETURN COALESCE(request_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ----------------------------------------------------------------------------
-- Function to record a rate-limited request
-- Inserts a new request record for sliding window tracking
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_rate_limit_request(
  p_identifier TEXT,
  p_rate_limit_type rate_limit_type,
  p_window_ms INTEGER
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO rate_limits (identifier, rate_limit_type, window_ms)
  VALUES (p_identifier, p_rate_limit_type, p_window_ms)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- RLS is disabled for this table as it is managed server-side using the
-- service role key. The rate limiter in lib/rate-limit.ts will use
-- SUPABASE_SERVICE_ROLE_KEY to access this table directly.
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users for reading their own rate limit status
-- (useful for client-side rate limit awareness)
GRANT SELECT ON rate_limits TO authenticated;
GRANT INSERT ON rate_limits TO authenticated;
GRANT DELETE ON rate_limits TO authenticated;

-- Grant access to anon for public API rate limiting (with IP-based identifiers)
GRANT SELECT ON rate_limits TO anon;
GRANT INSERT ON rate_limits TO anon;
GRANT DELETE ON rate_limits TO anon;

-- Service role has full access (managed by Supabase automatically)
GRANT ALL ON rate_limits TO service_role;

-- Grant usage on the new enum type
GRANT USAGE ON TYPE rate_limit_type TO authenticated, anon, service_role;

-- ============================================================================
-- INITIAL CLEANUP
-- ============================================================================

-- Remove any stale entries from the previous in-memory store that may have
-- been logged (if any migration of historical data were ever needed)
-- This is a no-op for fresh installations but ensures clean state.
PERFORM cleanup_expired_rate_limits();
