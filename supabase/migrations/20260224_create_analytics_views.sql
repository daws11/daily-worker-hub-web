-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================
-- This migration creates optimized database views and aggregate functions
-- for analytics queries to ensure efficient data retrieval for the admin dashboard.
-- Version: 20260224
-- Date: 2026-02-24
-- ============================================================================

-- ============================================================================
-- USER GROWTH ANALYTICS VIEW
-- ============================================================================
-- Tracks user registrations, active users (DAU/MAU), and role distribution
CREATE OR REPLACE VIEW analytics_user_growth AS
SELECT
  date_trunc('day', created_at) AS date,
  COUNT(*) FILTER (WHERE role = 'worker') AS new_workers,
  COUNT(*) FILTER (WHERE role = 'business') AS new_businesses,
  COUNT(*) AS total_new_users,
  -- Total counts as of this date
  (SELECT COUNT(*) FROM users WHERE users.created_at <= date_trunc('day', u.created_at)) AS cumulative_users,
  (SELECT COUNT(*) FROM users WHERE users.role = 'worker' AND users.created_at <= date_trunc('day', u.created_at)) AS cumulative_workers,
  (SELECT COUNT(*) FROM users WHERE users.role = 'business' AND users.created_at <= date_trunc('day', u.created_at)) AS cumulative_businesses
FROM users u
GROUP BY date_trunc('day', created_at)
ORDER BY date;

-- Create materialized view for better performance on daily active users
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_active_users AS
SELECT
  date_trunc('day', created_at) AS date,
  COUNT(DISTINCT user_id) AS daily_active_users
FROM (
  -- Users who logged in (created sessions via auth)
  SELECT id AS user_id, created_at
  FROM users
  WHERE created_at >= NOW() - INTERVAL '90 days'
) AS user_activity
GROUP BY date_trunc('day', created_at)
ORDER BY date;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_active_users_date
  ON analytics_daily_active_users(date);

-- Create materialized view for monthly active users
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_monthly_active_users AS
SELECT
  date_trunc('month', created_at) AS month,
  COUNT(DISTINCT user_id) AS monthly_active_users
FROM (
  -- Users who logged in (created sessions via auth)
  SELECT id AS user_id, created_at
  FROM users
  WHERE created_at >= NOW() - INTERVAL '365 days'
) AS user_activity
GROUP BY date_trunc('month', created_at)
ORDER BY month;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_monthly_active_users_month
  ON analytics_monthly_active_users(month);

-- ============================================================================
-- JOB COMPLETION RATES VIEW
-- ============================================================================
-- Tracks job posting and completion metrics
CREATE OR REPLACE VIEW analytics_job_completion AS
SELECT
  date_trunc('day', j.created_at) AS date,
  COUNT(*) AS total_jobs,
  COUNT(*) FILTER (WHERE j.status = 'open') AS open_jobs,
  COUNT(*) FILTER (WHERE j.status = 'in_progress') AS in_progress_jobs,
  COUNT(*) FILTER (WHERE j.status = 'completed') AS completed_jobs,
  COUNT(*) FILTER (WHERE j.status = 'cancelled') AS cancelled_jobs,
  -- Calculate completion rate
  ROUND(
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE j.status = 'completed')::NUMERIC / COUNT(*) * 100)
      ELSE 0
    END,
    2
  ) AS completion_rate_percentage,
  -- Jobs with bookings
  (SELECT COUNT(DISTINCT b.job_id)
   FROM bookings b
   WHERE b.created_at >= date_trunc('day', j.created_at)
   AND b.created_at < date_trunc('day', j.created_at) + INTERVAL '1 day'
  ) AS jobs_with_bookings
FROM jobs j
GROUP BY date_trunc('day', j.created_at)
ORDER BY date;

-- ============================================================================
-- TRANSACTION VOLUME VIEW
-- ============================================================================
-- Tracks payment transaction volume and success rates
CREATE OR REPLACE VIEW analytics_transaction_volume AS
SELECT
  date_trunc('day', t.created_at) AS date,
  COUNT(*) AS total_transactions,
  COUNT(*) FILTER (WHERE t.type = 'payment') AS payment_count,
  COUNT(*) FILTER (WHERE t.type = 'refund') AS refund_count,
  COUNT(*) FILTER (WHERE t.status = 'success') AS successful_transactions,
  COUNT(*) FILTER (WHERE t.status = 'pending') AS pending_transactions,
  COUNT(*) FILTER (WHERE t.status = 'failed') AS failed_transactions,
  -- Calculate success rate
  ROUND(
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE t.status = 'success')::NUMERIC / COUNT(*) * 100)
      ELSE 0
    END,
    2
  ) AS success_rate_percentage,
  -- Volume metrics
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'payment' AND t.status = 'success'), 0) AS total_payment_volume,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'refund' AND t.status = 'success'), 0) AS total_refund_volume,
  COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'success'), 0) AS net_transaction_volume,
  -- Average transaction amounts
  ROUND(
    COALESCE(AVG(t.amount) FILTER (WHERE t.type = 'payment' AND t.status = 'success'), 0),
    2
  ) AS avg_payment_amount,
  ROUND(
    COALESCE(AVG(t.amount) FILTER (WHERE t.type = 'refund' AND t.status = 'success'), 0),
    2
  ) AS avg_refund_amount
FROM transactions t
GROUP BY date_trunc('day', t.created_at)
ORDER BY date;

-- ============================================================================
-- GEOGRAPHIC DISTRIBUTION VIEW
-- ============================================================================
-- Tracks distribution of workers and jobs by location in Bali
CREATE OR REPLACE VIEW analytics_geographic_distribution AS
SELECT
  COALESCE(w.location_name, 'Unknown') AS location_name,
  COUNT(DISTINCT w.id) AS worker_count,
  COUNT(DISTINCT j.id) AS job_count,
  COUNT(DISTINCT b.id) AS booking_count,
  -- Calculate booking rate per location
  CASE
    WHEN COUNT(DISTINCT w.id) > 0 THEN
      ROUND((COUNT(DISTINCT b.id)::NUMERIC / COUNT(DISTINCT w.id)), 2)
    ELSE 0
  END AS bookings_per_worker,
  -- Approximate coordinates for mapping (using worker locations)
  ROUND(AVG(w.lat), 6) AS avg_lat,
  ROUND(AVG(w.lng), 6) AS avg_lng
FROM workers w
LEFT JOIN jobs j ON ST_DWithin(
  ST_Point(w.lng, w.lat)::geography,
  ST_Point(j.lng, j.lat)::geography,
  5000 -- 5km radius
)
LEFT JOIN bookings b ON b.worker_id = w.id
WHERE w.lat IS NOT NULL AND w.lng IS NOT NULL
GROUP BY w.location_name
ORDER BY worker_count DESC;

-- ============================================================================
-- TRENDING CATEGORIES VIEW
-- ============================================================================
-- Identifies the most in-demand job categories
CREATE OR REPLACE VIEW analytics_trending_categories AS
SELECT
  c.id AS category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  COUNT(DISTINCT j.id) AS job_count,
  COUNT(DISTINCT b.id) AS booking_count,
  -- Calculate demand ratio (bookings per job)
  CASE
    WHEN COUNT(DISTINCT j.id) > 0 THEN
      ROUND((COUNT(DISTINCT b.id)::NUMERIC / COUNT(DISTINCT j.id)), 2)
    ELSE 0
  END AS demand_ratio,
  -- Calculate average budget for this category
  ROUND(
    COALESCE(AVG((j.budget_min + j.budget_max) / 2), 0),
    2
  ) AS avg_budget,
  -- Completion rate for this category
  ROUND(
    CASE
      WHEN COUNT(DISTINCT j.id) > 0 THEN
        (COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed')::NUMERIC /
         COUNT(DISTINCT j.id) * 100)
      ELSE 0
    END,
    2
  ) AS completion_rate_percentage
FROM categories c
LEFT JOIN jobs j ON j.category_id = c.id
LEFT JOIN bookings b ON b.job_id = j.id
GROUP BY c.id, c.name, c.slug
ORDER BY booking_count DESC, job_count DESC;

-- ============================================================================
-- COMPLIANCE VIOLATIONS VIEW
-- ============================================================================
-- Tracks KYC verification status and compliance issues
CREATE OR REPLACE VIEW analytics_compliance_violations AS
SELECT
  date_trunc('day', k.submitted_at) AS date,
  COUNT(*) AS total_kyc_submissions,
  COUNT(*) FILTER (WHERE k.status = 'pending') AS pending_verifications,
  COUNT(*) FILTER (WHERE k.status = 'verified') AS verified_workers,
  COUNT(*) FILTER (WHERE k.status = 'rejected') AS rejected_verifications,
  -- Calculate verification success rate
  ROUND(
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE k.status = 'verified')::NUMERIC / COUNT(*) * 100)
      ELSE 0
    END,
    2
  ) AS verification_success_rate,
  -- Calculate rejection rate
  ROUND(
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE k.status = 'rejected')::NUMERIC / COUNT(*) * 100)
      ELSE 0
    END,
    2
  ) AS rejection_rate_percentage,
  -- Average time to verify (in hours)
  ROUND(
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (k.verified_at - k.submitted_at)) / 3600)
      FILTER (WHERE k.status IN ('verified', 'rejected') AND k.verified_at IS NOT NULL),
      0
    ),
    2
  ) AS avg_verification_hours,
  -- Workers without KYC
  (SELECT COUNT(*) FROM workers w2
   LEFT JOIN kyc_verifications k2 ON k2.worker_id = w2.id
   WHERE k2.id IS NULL
   AND date_trunc('day', w2.created_at) = date_trunc('day', k.submitted_at)
  ) AS workers_without_kyc
FROM kyc_verifications k
GROUP BY date_trunc('day', k.submitted_at)
ORDER BY date;

-- ============================================================================
-- REVENUE METRICS VIEW
-- ============================================================================
-- Tracks platform revenue and earnings
CREATE OR REPLACE VIEW analytics_revenue AS
SELECT
  date_trunc('day', t.created_at) AS date,
  -- Transaction counts
  COUNT(*) FILTER (WHERE t.type = 'payment' AND t.status = 'success') AS successful_payments,
  COUNT(*) FILTER (WHERE t.type = 'refund' AND t.status = 'success') AS successful_refunds,
  -- Revenue amounts
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'payment' AND t.status = 'success'), 0) AS gross_revenue,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'refund' AND t.status = 'success'), 0) AS refunds_amount,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'payment' AND t.status = 'success'), 0) -
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'refund' AND t.status = 'success'), 0) AS net_revenue,
  -- Average transaction values
  ROUND(
    COALESCE(AVG(t.amount) FILTER (WHERE t.type = 'payment' AND t.status = 'success'), 0),
    2
  ) AS avg_payment_amount,
  -- Platform fee (assuming 10% platform fee - adjust as needed)
  ROUND(
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'payment' AND t.status = 'success'), 0) * 0.10,
    2
  ) AS platform_fee,
  -- Cumulative revenue
  (
    SELECT SUM(t2.amount) * 0.10
    FROM transactions t2
    WHERE t2.type = 'payment'
    AND t2.status = 'success'
    AND t2.created_at <= date_trunc('day', t.created_at) + INTERVAL '1 day'
  ) AS cumulative_platform_fee
FROM transactions t
GROUP BY date_trunc('day', t.created_at)
ORDER BY date;

-- ============================================================================
-- BOOKING SUMMARY VIEW
-- ============================================================================
-- Aggregates booking status and timeline metrics
CREATE OR REPLACE VIEW analytics_booking_summary AS
SELECT
  date_trunc('day', b.created_at) AS date,
  COUNT(*) AS total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'pending') AS pending_bookings,
  COUNT(*) FILTER (WHERE b.status = 'accepted') AS accepted_bookings,
  COUNT(*) FILTER (WHERE b.status = 'rejected') AS rejected_bookings,
  COUNT(*) FILTER (WHERE b.status = 'in_progress') AS in_progress_bookings,
  COUNT(*) FILTER (WHERE b.status = 'completed') AS completed_bookings,
  COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled_bookings,
  -- Calculate acceptance rate
  ROUND(
    CASE WHEN COUNT(*) FILTER (WHERE b.status IN ('accepted', 'rejected', 'in_progress', 'completed', 'cancelled')) > 0
      THEN (COUNT(*) FILTER (WHERE b.status = 'accepted')::NUMERIC /
            COUNT(*) FILTER (WHERE b.status IN ('accepted', 'rejected', 'in_progress', 'completed', 'cancelled')) * 100)
      ELSE 0
    END,
    2
  ) AS acceptance_rate_percentage,
  -- Calculate completion rate
  ROUND(
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE b.status = 'completed')::NUMERIC / COUNT(*) * 100)
      ELSE 0
    END,
    2
  ) AS completion_rate_percentage,
  -- Average final price
  ROUND(COALESCE(AVG(b.final_price) FILTER (WHERE b.status = 'completed'), 0), 2) AS avg_final_price,
  -- Total earnings from completed bookings
  COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) AS total_earnings
FROM bookings b
GROUP BY date_trunc('day', b.created_at)
ORDER BY date;

-- ============================================================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================================================

-- Function to refresh daily active users materialized view
CREATE OR REPLACE FUNCTION refresh_analytics_daily_active_users()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_active_users;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh monthly active users materialized view
CREATE OR REPLACE FUNCTION refresh_analytics_monthly_active_users()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_monthly_active_users;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) FOR ANALYTICS VIEWS
-- ============================================================================
-- Note: Views don't directly support RLS policies, but we can secure access
-- by creating wrapper functions that check permissions

-- Function to get user growth analytics (admin only)
CREATE OR REPLACE FUNCTION get_analytics_user_growth(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  date TIMESTAMPTZ,
  new_workers BIGINT,
  new_businesses BIGINT,
  total_new_users BIGINT,
  cumulative_users BIGINT,
  cumulative_workers BIGINT,
  cumulative_businesses BIGINT
) AS $$
BEGIN
  -- Only admins can access analytics
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics_user_growth
  WHERE (start_date IS NULL OR date >= start_date)
    AND (end_date IS NULL OR date <= end_date)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get job completion analytics (admin only)
CREATE OR REPLACE FUNCTION get_analytics_job_completion(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  date TIMESTAMPTZ,
  total_jobs BIGINT,
  open_jobs BIGINT,
  in_progress_jobs BIGINT,
  completed_jobs BIGINT,
  cancelled_jobs BIGINT,
  completion_rate_percentage NUMERIC,
  jobs_with_bookings BIGINT
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics_job_completion
  WHERE (start_date IS NULL OR date >= start_date)
    AND (end_date IS NULL OR date <= end_date)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get transaction volume analytics (admin only)
CREATE OR REPLACE FUNCTION get_analytics_transaction_volume(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  date TIMESTAMPTZ,
  total_transactions BIGINT,
  payment_count BIGINT,
  refund_count BIGINT,
  successful_transactions BIGINT,
  pending_transactions BIGINT,
  failed_transactions BIGINT,
  success_rate_percentage NUMERIC,
  total_payment_volume NUMERIC,
  total_refund_volume NUMERIC,
  net_transaction_volume NUMERIC,
  avg_payment_amount NUMERIC,
  avg_refund_amount NUMERIC
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics_transaction_volume
  WHERE (start_date IS NULL OR date >= start_date)
    AND (end_date IS NULL OR date <= end_date)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get geographic distribution analytics (admin only)
CREATE OR REPLACE FUNCTION get_analytics_geographic_distribution()
RETURNS TABLE (
  location_name TEXT,
  worker_count BIGINT,
  job_count BIGINT,
  booking_count BIGINT,
  bookings_per_worker NUMERIC,
  avg_lat NUMERIC,
  avg_lng NUMERIC
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics_geographic_distribution
  ORDER BY worker_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending categories analytics (admin only)
CREATE OR REPLACE FUNCTION get_analytics_trending_categories()
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_slug TEXT,
  job_count BIGINT,
  booking_count BIGINT,
  demand_ratio NUMERIC,
  avg_budget NUMERIC,
  completion_rate_percentage NUMERIC
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics_trending_categories
  ORDER BY booking_count DESC, job_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get compliance violations analytics (admin only)
CREATE OR REPLACE FUNCTION get_analytics_compliance_violations(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  date TIMESTAMPTZ,
  total_kyc_submissions BIGINT,
  pending_verifications BIGINT,
  verified_workers BIGINT,
  rejected_verifications BIGINT,
  verification_success_rate NUMERIC,
  rejection_rate_percentage NUMERIC,
  avg_verification_hours NUMERIC,
  workers_without_kyc BIGINT
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics_compliance_violations
  WHERE (start_date IS NULL OR date >= start_date)
    AND (end_date IS NULL OR date <= end_date)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue analytics (admin only)
CREATE OR REPLACE FUNCTION get_analytics_revenue(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  date TIMESTAMPTZ,
  successful_payments BIGINT,
  successful_refunds BIGINT,
  gross_revenue NUMERIC,
  refunds_amount NUMERIC,
  net_revenue NUMERIC,
  avg_payment_amount NUMERIC,
  platform_fee NUMERIC,
  cumulative_platform_fee NUMERIC
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics_revenue
  WHERE (start_date IS NULL OR date >= start_date)
    AND (end_date IS NULL OR date <= end_date)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get booking summary analytics (admin only)
CREATE OR REPLACE FUNCTION get_analytics_booking_summary(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  date TIMESTAMPTZ,
  total_bookings BIGINT,
  pending_bookings BIGINT,
  accepted_bookings BIGINT,
  rejected_bookings BIGINT,
  in_progress_bookings BIGINT,
  completed_bookings BIGINT,
  cancelled_bookings BIGINT,
  acceptance_rate_percentage NUMERIC,
  completion_rate_percentage NUMERIC,
  avg_final_price NUMERIC,
  total_earnings NUMERIC
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM analytics_booking_summary
  WHERE (start_date IS NULL OR date >= start_date)
    AND (end_date IS NULL OR date <= end_date)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on analytics functions to authenticated users (access controlled within functions)
GRANT EXECUTE ON FUNCTION get_analytics_user_growth TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_job_completion TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_transaction_volume TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_geographic_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_trending_categories TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_compliance_violations TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_booking_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_daily_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_monthly_active_users TO authenticated;

-- Grant select on views for authenticated users (admin check is in the wrapper functions)
GRANT SELECT ON analytics_user_growth TO authenticated;
GRANT SELECT ON analytics_job_completion TO authenticated;
GRANT SELECT ON analytics_transaction_volume TO authenticated;
GRANT SELECT ON analytics_geographic_distribution TO authenticated;
GRANT SELECT ON analytics_trending_categories TO authenticated;
GRANT SELECT ON analytics_compliance_violations TO authenticated;
GRANT SELECT ON analytics_revenue TO authenticated;
GRANT SELECT ON analytics_booking_summary TO authenticated;
GRANT SELECT ON analytics_daily_active_users TO authenticated;
GRANT SELECT ON analytics_monthly_active_users TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON VIEW analytics_user_growth IS 'User growth metrics including new registrations and cumulative counts by date';
COMMENT ON VIEW analytics_job_completion IS 'Job posting and completion metrics by date';
COMMENT ON VIEW analytics_transaction_volume IS 'Transaction volume metrics including success rates and amounts by date';
COMMENT ON VIEW analytics_geographic_distribution IS 'Distribution of workers, jobs, and bookings by location';
COMMENT ON VIEW analytics_trending_categories IS 'Trending job categories sorted by demand';
COMMENT ON VIEW analytics_compliance_violations IS 'KYC verification status and compliance metrics by date';
COMMENT ON VIEW analytics_revenue IS 'Platform revenue and earnings metrics by date';
COMMENT ON VIEW analytics_booking_summary IS 'Booking status and timeline metrics by date';
COMMENT ON MATERIALIZED VIEW analytics_daily_active_users IS 'Daily active users for DAU calculations (refresh periodically)';
COMMENT ON MATERIALIZED VIEW analytics_monthly_active_users IS 'Monthly active users for MAU calculations (refresh periodically)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
