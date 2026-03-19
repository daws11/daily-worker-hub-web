-- ============================================================================
-- COMPLIANCE ENHANCEMENTS FOR PP 35/2021
-- ============================================================================
-- This migration adds comprehensive compliance tracking for Indonesian
-- labor regulation PP 35/2021 (21-day monthly limit for daily workers).
-- Version: 20260305000000
-- Date: 2026-03-05
-- ============================================================================

-- ============================================================================
-- CREATE COMPLIANCE_TRACKING TABLE
-- ============================================================================
-- Tracks days worked per worker per business per month for PP 35/2021 compliance

CREATE TABLE IF NOT EXISTS compliance_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of the month (YYYY-MM-01)
  days_worked INTEGER NOT NULL DEFAULT 0,
  last_booking_date DATE,
  compliance_status TEXT NOT NULL DEFAULT 'compliant' CHECK (compliance_status IN (
    'compliant',      -- 0-14 days
    'warning',        -- 15-20 days
    'blocked'         -- 21+ days
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One record per worker per business per month
  UNIQUE(business_id, worker_id, month)
);

-- ============================================================================
-- CREATE COMPLIANCE_WARNINGS TABLE
-- ============================================================================
-- Stores warnings when workers approach or exceed the 21-day limit

CREATE TABLE IF NOT EXISTS compliance_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  compliance_tracking_id UUID REFERENCES compliance_tracking(id) ON DELETE SET NULL,
  month DATE NOT NULL,
  days_worked INTEGER NOT NULL DEFAULT 0,
  warning_level TEXT NOT NULL DEFAULT 'none' CHECK (warning_level IN (
    'none',           -- No warning needed
    'warning',        -- Approaching limit (15-20 days)
    'blocked'         -- Limit reached (21+ days)
  )),
  warning_type TEXT CHECK (warning_type IN (
    'approaching_limit', -- Worker approaching 21-day limit
    'limit_reached',     -- Worker has reached 21-day limit
    'limit_exceeded'     -- Worker has exceeded 21-day limit (violation)
  )),
  message TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One active warning per worker per business per month
  UNIQUE(business_id, worker_id, month)
);

-- ============================================================================
-- CREATE COMPLIANCE_AUDIT_LOG TABLE
-- ============================================================================
-- Audit trail for compliance-related actions

CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL CHECK (action IN (
    'booking_accepted',
    'booking_rejected_compliance',
    'warning_created',
    'warning_acknowledged',
    'limit_reset',
    'manual_override'
  )),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  month DATE,
  days_before INTEGER,
  days_after INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR COMPLIANCE TABLES
-- ============================================================================

-- Compliance tracking indexes
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_business_id ON compliance_tracking(business_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_worker_id ON compliance_tracking(worker_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_month ON compliance_tracking(month);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_status ON compliance_tracking(compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_business_month ON compliance_tracking(business_id, month);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_worker_month ON compliance_tracking(worker_id, month);

-- Compliance warnings indexes
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_business_id ON compliance_warnings(business_id);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_worker_id ON compliance_warnings(worker_id);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_month ON compliance_warnings(month);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_level ON compliance_warnings(warning_level);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_acknowledged ON compliance_warnings(acknowledged);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_business_month ON compliance_warnings(business_id, month);

-- Compliance audit log indexes
CREATE INDEX IF NOT EXISTS idx_compliance_audit_business_id ON compliance_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_worker_id ON compliance_audit_log(worker_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_action ON compliance_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_created_at ON compliance_audit_log(created_at DESC);

-- ============================================================================
-- FUNCTION: calculate_days_worked
-- ============================================================================
-- Calculate total days worked by a worker for a business in a specific month
-- Based on accepted and completed bookings

CREATE OR REPLACE FUNCTION calculate_days_worked(
  p_business_id UUID,
  p_worker_id UUID,
  p_month DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_days_worked INTEGER;
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  -- Calculate month boundaries
  v_month_start := date_trunc('month', p_month)::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Count distinct days from accepted and completed bookings
  SELECT COUNT(DISTINCT work_date)::INTEGER INTO v_days_worked
  FROM bookings
  WHERE business_id = p_business_id
    AND worker_id = p_worker_id
    AND status IN ('accepted', 'in_progress', 'completed')
    AND work_date >= v_month_start
    AND work_date <= v_month_end;
  
  RETURN COALESCE(v_days_worked, 0);
END;
$$;

-- ============================================================================
-- FUNCTION: get_compliance_status_for_worker
-- ============================================================================
-- Get compliance status for a worker-business pair for a specific month

CREATE OR REPLACE FUNCTION get_compliance_status_for_worker(
  p_business_id UUID,
  p_worker_id UUID,
  p_month DATE DEFAULT NULL
)
RETURNS TABLE (
  worker_id UUID,
  business_id UUID,
  month DATE,
  days_worked INTEGER,
  compliance_status TEXT,
  warning_level TEXT,
  message TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_month DATE;
  v_days INTEGER;
  v_status TEXT;
  v_warning TEXT;
  v_message TEXT;
BEGIN
  -- Default to current month if not provided
  v_month := COALESCE(p_month, date_trunc('month', CURRENT_DATE)::DATE);
  
  -- Calculate days worked
  v_days := calculate_days_worked(p_business_id, p_worker_id, v_month);
  
  -- Determine status based on PP 35/2021 rules
  IF v_days >= 21 THEN
    v_status := 'blocked';
    v_warning := 'blocked';
    v_message := format('Worker has reached %s days this month. PP 35/2021 limit (21 days) reached. Cannot accept more bookings.', v_days);
  ELSIF v_days >= 15 THEN
    v_status := 'warning';
    v_warning := 'warning';
    v_message := format('Warning: Worker has worked %s days this month. Approaching PP 35/2021 limit of 21 days.', v_days);
  ELSE
    v_status := 'compliant';
    v_warning := 'none';
    v_message := format('Worker is compliant. %s days worked this month.', v_days);
  END IF;
  
  RETURN QUERY SELECT
    p_worker_id,
    p_business_id,
    v_month,
    v_days,
    v_status,
    v_warning,
    v_message;
END;
$$;

-- ============================================================================
-- FUNCTION: update_compliance_tracking
-- ============================================================================
-- Update or create compliance tracking record for a worker-business pair

CREATE OR REPLACE FUNCTION update_compliance_tracking(
  p_business_id UUID,
  p_worker_id UUID,
  p_month DATE DEFAULT NULL
)
RETURNS compliance_tracking
LANGUAGE plpgsql
AS $$
DECLARE
  v_month DATE;
  v_days INTEGER;
  v_status TEXT;
  v_tracking compliance_tracking%ROWTYPE;
BEGIN
  -- Default to current month
  v_month := COALESCE(p_month, date_trunc('month', CURRENT_DATE)::DATE);
  
  -- Calculate days worked
  v_days := calculate_days_worked(p_business_id, p_worker_id, v_month);
  
  -- Determine status
  IF v_days >= 21 THEN
    v_status := 'blocked';
  ELSIF v_days >= 15 THEN
    v_status := 'warning';
  ELSE
    v_status := 'compliant';
  END IF;
  
  -- Upsert compliance tracking record
  INSERT INTO compliance_tracking (business_id, worker_id, month, days_worked, compliance_status, last_booking_date)
  VALUES (p_business_id, p_worker_id, v_month, v_days, v_status, CURRENT_DATE)
  ON CONFLICT (business_id, worker_id, month)
  DO UPDATE SET
    days_worked = v_days,
    compliance_status = v_status,
    last_booking_date = CURRENT_DATE,
    updated_at = NOW()
  RETURNING * INTO v_tracking;
  
  RETURN v_tracking;
END;
$$;

-- ============================================================================
-- FUNCTION: create_compliance_warning_if_needed
-- ============================================================================
-- Create or update compliance warning when worker approaches/exceeds limit

CREATE OR REPLACE FUNCTION create_compliance_warning_if_needed(
  p_business_id UUID,
  p_worker_id UUID,
  p_month DATE DEFAULT NULL
)
RETURNS compliance_warnings
LANGUAGE plpgsql
AS $$
DECLARE
  v_month DATE;
  v_days INTEGER;
  v_warning_level TEXT;
  v_warning_type TEXT;
  v_message TEXT;
  v_tracking_id UUID;
  v_warning compliance_warnings%ROWTYPE;
BEGIN
  -- Default to current month
  v_month := COALESCE(p_month, date_trunc('month', CURRENT_DATE)::DATE);
  
  -- Get current compliance tracking
  SELECT id, days_worked INTO v_tracking_id, v_days
  FROM compliance_tracking
  WHERE business_id = p_business_id
    AND worker_id = p_worker_id
    AND month = v_month;
  
  -- If no tracking record, create one
  IF v_tracking_id IS NULL THEN
    v_days := calculate_days_worked(p_business_id, p_worker_id, v_month);
    v_tracking_id := update_compliance_tracking(p_business_id, p_worker_id, v_month).id;
  END IF;
  
  -- Determine warning level and type
  IF v_days >= 21 THEN
    v_warning_level := 'blocked';
    v_warning_type := 'limit_reached';
    v_message := format('Worker has worked %s days this month. PP 35/2021 limit reached. New bookings will be auto-rejected.', v_days);
  ELSIF v_days >= 15 THEN
    v_warning_level := 'warning';
    v_warning_type := 'approaching_limit';
    v_message := format('Worker has worked %s of 21 allowed days this month. Approaching PP 35/2021 limit.', v_days);
  ELSE
    -- No warning needed, delete any existing warning
    DELETE FROM compliance_warnings
    WHERE business_id = p_business_id
      AND worker_id = p_worker_id
      AND month = v_month;
    RETURN NULL;
  END IF;
  
  -- Upsert warning
  INSERT INTO compliance_warnings (
    business_id, worker_id, compliance_tracking_id, month,
    days_worked, warning_level, warning_type, message
  )
  VALUES (
    p_business_id, p_worker_id, v_tracking_id, v_month,
    v_days, v_warning_level, v_warning_type, v_message
  )
  ON CONFLICT (business_id, worker_id, month)
  DO UPDATE SET
    days_worked = v_days,
    warning_level = v_warning_level,
    warning_type = v_warning_type,
    message = v_message,
    updated_at = NOW()
  RETURNING * INTO v_warning;
  
  RETURN v_warning;
END;
$$;

-- ============================================================================
-- FUNCTION: check_booking_compliance
-- ============================================================================
-- Check if a booking can be accepted based on PP 35/2021 compliance

CREATE OR REPLACE FUNCTION check_booking_compliance(
  p_business_id UUID,
  p_worker_id UUID,
  p_work_date DATE
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_days INTEGER,
  projected_days INTEGER,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_month DATE;
  v_current_days INTEGER;
  v_projected_days INTEGER;
  v_status TEXT;
  v_message TEXT;
  v_allowed BOOLEAN;
BEGIN
  -- Get the month of the work date
  v_month := date_trunc('month', p_work_date)::DATE;
  
  -- Get current days worked in the month
  v_current_days := calculate_days_worked(p_business_id, p_worker_id, v_month);
  
  -- Projected days if this booking is accepted
  v_projected_days := v_current_days + 1;
  
  -- Check compliance
  IF v_current_days >= 21 THEN
    v_allowed := FALSE;
    v_status := 'blocked';
    v_message := format('Worker has already worked %s days this month. PP 35/2021 limit reached.', v_current_days);
  ELSIF v_projected_days > 21 THEN
    v_allowed := FALSE;
    v_status := 'blocked';
    v_message := 'Accepting this booking would exceed the PP 35/2021 limit of 21 days per month.';
  ELSIF v_current_days >= 15 THEN
    v_allowed := TRUE;
    v_status := 'warning';
    v_message := format('Warning: Worker has worked %s days. This booking would bring total to %s days.', v_current_days, v_projected_days);
  ELSE
    v_allowed := TRUE;
    v_status := 'compliant';
    v_message := format('Booking allowed. Worker has worked %s days, projected %s days after this booking.', v_current_days, v_projected_days);
  END IF;
  
  RETURN QUERY SELECT v_allowed, v_current_days, v_projected_days, v_status, v_message;
END;
$$;

-- ============================================================================
-- FUNCTION: get_business_compliance_summary
-- ============================================================================
-- Get compliance summary for a business in a specific month

CREATE OR REPLACE FUNCTION get_business_compliance_summary(
  p_business_id UUID,
  p_month DATE DEFAULT NULL
)
RETURNS TABLE (
  total_workers BIGINT,
  compliant_workers BIGINT,
  warning_workers BIGINT,
  blocked_workers BIGINT,
  total_days_worked BIGINT,
  avg_days_per_worker NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_month DATE;
BEGIN
  -- Default to current month
  v_month := COALESCE(p_month, date_trunc('month', CURRENT_DATE)::DATE);
  
  RETURN QUERY SELECT
    COUNT(*) AS total_workers,
    COUNT(*) FILTER (WHERE compliance_status = 'compliant') AS compliant_workers,
    COUNT(*) FILTER (WHERE compliance_status = 'warning') AS warning_workers,
    COUNT(*) FILTER (WHERE compliance_status = 'blocked') AS blocked_workers,
    SUM(days_worked) AS total_days_worked,
    ROUND(AVG(days_worked)::NUMERIC, 2) AS avg_days_per_worker
  FROM compliance_tracking
  WHERE business_id = p_business_id
    AND month = v_month;
END;
$$;

-- ============================================================================
-- FUNCTION: get_all_compliance_warnings_admin
-- ============================================================================
-- Get all compliance warnings for admin dashboard

CREATE OR REPLACE FUNCTION get_all_compliance_warnings_admin(
  p_month DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  business_name TEXT,
  worker_id UUID,
  worker_name TEXT,
  month DATE,
  days_worked INTEGER,
  warning_level TEXT,
  warning_type TEXT,
  message TEXT,
  acknowledged BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_month DATE;
BEGIN
  -- Default to current month
  v_month := COALESCE(p_month, date_trunc('month', CURRENT_DATE)::DATE);
  
  RETURN QUERY SELECT
    cw.id,
    cw.business_id,
    b.name AS business_name,
    cw.worker_id,
    w.full_name AS worker_name,
    cw.month,
    cw.days_worked,
    cw.warning_level,
    cw.warning_type,
    cw.message,
    cw.acknowledged,
    cw.created_at
  FROM compliance_warnings cw
  JOIN businesses b ON b.id = cw.business_id
  JOIN workers w ON w.id = cw.worker_id
  WHERE cw.month = v_month
    AND cw.warning_level IN ('warning', 'blocked')
  ORDER BY
    CASE cw.warning_level
      WHEN 'blocked' THEN 1
      WHEN 'warning' THEN 2
    END,
    cw.days_worked DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- TRIGGER: Update compliance on booking status change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_compliance_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update compliance when booking becomes accepted, in_progress, or completed
  IF NEW.status IN ('accepted', 'in_progress', 'completed') THEN
    -- Update compliance tracking
    PERFORM update_compliance_tracking(
      NEW.business_id,
      NEW.worker_id,
      date_trunc('month', NEW.work_date)::DATE
    );
    
    -- Create warning if needed
    PERFORM create_compliance_warning_if_needed(
      NEW.business_id,
      NEW.worker_id,
      date_trunc('month', NEW.work_date)::DATE
    );
    
    -- Log the action
    INSERT INTO compliance_audit_log (
      action, business_id, worker_id, booking_id, month,
      days_before, days_after, details
    )
    SELECT
      'booking_accepted',
      NEW.business_id,
      NEW.worker_id,
      NEW.id,
      date_trunc('month', NEW.work_date)::DATE,
      ct.days_worked - 1,
      ct.days_worked,
      jsonb_build_object('booking_status', NEW.status)
    FROM compliance_tracking ct
    WHERE ct.business_id = NEW.business_id
      AND ct.worker_id = NEW.worker_id
      AND ct.month = date_trunc('month', NEW.work_date)::DATE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists, then create new one
DROP TRIGGER IF EXISTS update_compliance_on_booking_change ON bookings;
CREATE TRIGGER update_compliance_on_booking_change
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('accepted', 'in_progress', 'completed'))
  EXECUTE FUNCTION update_compliance_on_booking();

-- ============================================================================
-- TRIGGER: Update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_compliance_tracking_updated_at ON compliance_tracking;
CREATE TRIGGER update_compliance_tracking_updated_at
  BEFORE UPDATE ON compliance_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_warnings_updated_at ON compliance_warnings;
CREATE TRIGGER update_compliance_warnings_updated_at
  BEFORE UPDATE ON compliance_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE compliance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- Compliance Tracking Policies
CREATE POLICY "Businesses can view own compliance tracking"
  ON compliance_tracking FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Workers can view own compliance tracking"
  ON compliance_tracking FOR SELECT
  USING (worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all compliance tracking"
  ON compliance_tracking FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true));

CREATE POLICY "System can insert compliance tracking"
  ON compliance_tracking FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update compliance tracking"
  ON compliance_tracking FOR UPDATE
  USING (true);

-- Compliance Warnings Policies
CREATE POLICY "Businesses can view own compliance warnings"
  ON compliance_warnings FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Workers can view own compliance warnings"
  ON compliance_warnings FOR SELECT
  USING (worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all compliance warnings"
  ON compliance_warnings FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true));

CREATE POLICY "Businesses can acknowledge own warnings"
  ON compliance_warnings FOR UPDATE
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()))
  WITH CHECK (acknowledged = true);

CREATE POLICY "System can insert compliance warnings"
  ON compliance_warnings FOR INSERT
  WITH CHECK (true);

-- Compliance Audit Log Policies (read-only for admins)
CREATE POLICY "Admins can view compliance audit log"
  ON compliance_audit_log FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true));

CREATE POLICY "System can insert audit log"
  ON compliance_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- INITIAL DATA: Create compliance tracking for existing bookings
-- ============================================================================

-- Populate compliance tracking for existing accepted/completed bookings
INSERT INTO compliance_tracking (business_id, worker_id, month, days_worked, compliance_status, last_booking_date)
SELECT
  b.business_id,
  b.worker_id,
  date_trunc('month', b.work_date)::DATE AS month,
  COUNT(DISTINCT b.work_date)::INTEGER AS days_worked,
  CASE
    WHEN COUNT(DISTINCT b.work_date) >= 21 THEN 'blocked'
    WHEN COUNT(DISTINCT b.work_date) >= 15 THEN 'warning'
    ELSE 'compliant'
  END AS compliance_status,
  MAX(b.work_date) AS last_booking_date
FROM bookings b
WHERE b.status IN ('accepted', 'in_progress', 'completed')
GROUP BY b.business_id, b.worker_id, date_trunc('month', b.work_date)::DATE
ON CONFLICT (business_id, worker_id, month)
DO UPDATE SET
  days_worked = EXCLUDED.days_worked,
  compliance_status = EXCLUDED.compliance_status,
  last_booking_date = EXCLUDED.last_booking_date,
  updated_at = NOW();

-- Create warnings for existing workers approaching/at limit
INSERT INTO compliance_warnings (business_id, worker_id, compliance_tracking_id, month, days_worked, warning_level, warning_type, message)
SELECT
  ct.business_id,
  ct.worker_id,
  ct.id,
  ct.month,
  ct.days_worked,
  ct.compliance_status AS warning_level,
  CASE
    WHEN ct.days_worked >= 21 THEN 'limit_reached'
    WHEN ct.days_worked >= 15 THEN 'approaching_limit'
  END AS warning_type,
  CASE
    WHEN ct.days_worked >= 21 THEN format('Worker has worked %s days this month. PP 35/2021 limit reached.', ct.days_worked)
    WHEN ct.days_worked >= 15 THEN format('Worker has worked %s of 21 allowed days this month.', ct.days_worked)
  END AS message
FROM compliance_tracking ct
WHERE ct.days_worked >= 15
ON CONFLICT (business_id, worker_id, month)
DO UPDATE SET
  days_worked = EXCLUDED.days_worked,
  warning_level = EXCLUDED.warning_level,
  warning_type = EXCLUDED.warning_type,
  message = EXCLUDED.message,
  updated_at = NOW();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for the functions
GRANT EXECUTE ON FUNCTION calculate_days_worked TO authenticated;
GRANT EXECUTE ON FUNCTION get_compliance_status_for_worker TO authenticated;
GRANT EXECUTE ON FUNCTION update_compliance_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION create_compliance_warning_if_needed TO authenticated;
GRANT EXECUTE ON FUNCTION check_booking_compliance TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_compliance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_compliance_warnings_admin TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE compliance_tracking IS 'Tracks days worked per worker per business per month for PP 35/2021 compliance (21-day limit)';
COMMENT ON TABLE compliance_warnings IS 'Warnings when workers approach or exceed the PP 35/2021 21-day monthly limit';
COMMENT ON TABLE compliance_audit_log IS 'Audit trail for compliance-related actions';
COMMENT ON FUNCTION calculate_days_worked IS 'Calculate total days worked by a worker for a business in a specific month';
COMMENT ON FUNCTION get_compliance_status_for_worker IS 'Get compliance status for a worker-business pair';
COMMENT ON FUNCTION check_booking_compliance IS 'Check if a booking can be accepted based on PP 35/2021 compliance';
COMMENT ON FUNCTION get_business_compliance_summary IS 'Get compliance summary for a business in a specific month';
