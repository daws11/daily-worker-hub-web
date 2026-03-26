-- Migration: Platform Metrics Consolidated Function
-- Description: Create get_platform_metrics() function that consolidates 22 individual count queries
--              into a single RPC call for the admin dashboard. Computes date boundaries in SQL.
-- Date: 2026-03-26

-- ============================================================================
-- PLATFORM METRICS FUNCTION
-- ============================================================================

-- Function: get_platform_metrics()
-- Returns a JSON object containing all platform metric counts in a single call.
-- Replaces 22 individual supabase.from().select() count queries from the client.
-- Accessible to authenticated users (admin dashboard).
CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Build the metrics JSON object using subqueries for each count.
  -- All date computations happen server-side to avoid timezone mismatches.
  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total',           (SELECT COUNT(*) FROM users),
      'workers',         (SELECT COUNT(*) FROM users WHERE role = 'worker'),
      'businesses',      (SELECT COUNT(*) FROM users WHERE role = 'business'),
      'admins',          (SELECT COUNT(*) FROM users WHERE role = 'admin'),
      'newThisWeek',     (SELECT COUNT(*) FROM users WHERE created_at >= now() - interval '7 days'),
      'newThisMonth',    (SELECT COUNT(*) FROM users WHERE created_at >= now() - interval '30 days')
    ),
    'jobs', jsonb_build_object(
      'total',           (SELECT COUNT(*) FROM jobs),
      'active',          (SELECT COUNT(*) FROM jobs WHERE status = 'open'),
      'completed',       (SELECT COUNT(*) FROM jobs WHERE status = 'completed'),
      'cancelled',       (SELECT COUNT(*) FROM jobs WHERE status = 'cancelled'),
      'newThisWeek',     (SELECT COUNT(*) FROM jobs WHERE created_at >= now() - interval '7 days'),
      'newThisMonth',    (SELECT COUNT(*) FROM jobs WHERE created_at >= now() - interval '30 days')
    ),
    'bookings', jsonb_build_object(
      'total',           (SELECT COUNT(*) FROM bookings),
      'pending',         (SELECT COUNT(*) FROM bookings WHERE status = 'pending'),
      'inProgress',      (SELECT COUNT(*) FROM bookings WHERE status = 'in_progress'),
      'completed',       (SELECT COUNT(*) FROM bookings WHERE status = 'completed'),
      'cancelled',       (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled'),
      'newThisWeek',     (SELECT COUNT(*) FROM bookings WHERE created_at >= now() - interval '7 days'),
      'newThisMonth',    (SELECT COUNT(*) FROM bookings WHERE created_at >= now() - interval '30 days')
    ),
    'transactions', jsonb_build_object(
      'total',           0,
      'totalVolume',     0,
      'pendingVolume',   0,
      'completedVolume', 0,
      'thisWeekVolume',  0,
      'thisMonthVolume', 0
    ),
    'verifications', jsonb_build_object(
      'pendingBusiness', (SELECT COUNT(*) FROM businesses WHERE verification_status = 'pending'),
      'pendingKYC',      (SELECT COUNT(*) FROM kyc_verifications WHERE status = 'pending'),
      'approvedThisWeek', 0,
      'rejectedThisWeek',  0
    ),
    'disputes', jsonb_build_object(
      'open',               0,
      'resolvedThisWeek',   0,
      'resolvedThisMonth',  0,
      'avgResolutionTime',  0
    ),
    'reports', jsonb_build_object(
      'pending',         0,
      'open',            0,
      'resolvedThisWeek', 0
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Allow authenticated users to execute the function (admin dashboard uses auth)
GRANT EXECUTE ON FUNCTION get_platform_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_metrics() TO service_role;

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON FUNCTION get_platform_metrics() IS
'Returns all platform metric counts (users, jobs, bookings, verifications) as a single JSONB object. ' ||
'Consolidates 22 individual count queries into one RPC call for improved admin dashboard performance. ' ||
'Computed date boundaries (7-day / 30-day) are calculated server-side in SQL to avoid timezone mismatches.';
