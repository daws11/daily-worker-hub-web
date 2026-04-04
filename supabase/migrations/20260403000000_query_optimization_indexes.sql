-- ============================================================================
-- QUERY OPTIMIZATION INDEXES
-- ============================================================================
-- Composite and partial indexes to address specific slow query patterns
-- identified during code review of lib/supabase/queries/
--
-- Date: 2026-04-03
-- ============================================================================

-- ============================================================================
-- COMPLIANCE WARNINGS — business_id + month + warning_level
-- ============================================================================
-- Used by: getBusinessComplianceWarnings(), getUnacknowledgedWarnings()
-- Query pattern: WHERE business_id = ? AND month = ? AND warning_level IN ('warning','blocked')
-- Currently scans: idx_compliance_warnings_business_id (single column, inefficient)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cw_biz_month_level
  ON compliance_warnings(business_id, month, warning_level);

-- Partial index: unacknowledged warnings only (dashboard notification badge)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cw_unacknowledged
  ON compliance_warnings(business_id, month)
  WHERE acknowledged = FALSE AND warning_level IN ('warning', 'blocked');

-- ============================================================================
-- REVIEWS — worker_id + reviewer (for rating aggregations)
-- ============================================================================
-- Used by: getWorkerAverageRating(), getWorkerRatingBreakdown(), getWorkerRehireRate()
-- Query pattern: WHERE worker_id = ? AND reviewer = 'business'
-- Current single-column idx_reviews_worker_id doesn't cover reviewer filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_worker_reviewer
  ON reviews(worker_id, reviewer) INCLUDE (rating, would_rehire);

-- Reviews for business aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_reviewer
  ON reviews(business_id, reviewer) INCLUDE (rating)
  WHERE business_id IS NOT NULL;

-- ============================================================================
-- MESSAGES — unread count queries
-- ============================================================================
-- Used by: getUnreadCount(), getBookingUnreadCount()
-- Query pattern: WHERE receiver_id = ? AND is_read = FALSE
-- Current separate idx_messages_receiver_id + idx_messages_is_read require merge
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_unread
  ON messages(receiver_id, is_read)
  WHERE is_read = FALSE;

-- Messages by booking + receiver for conversation unread
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_booking_receiver_unread
  ON messages(booking_id, receiver_id, is_read)
  WHERE is_read = FALSE;

-- ============================================================================
-- CONVERSATIONS — user lookup + ordering
-- ============================================================================
-- Used by: getConversations()
-- Query pattern: WHERE participant_1_id = ? OR participant_2_id = ? ORDER BY last_message_at DESC
-- NOTE: Table uses participant_1_id/participant_2_id (NOT worker_id/business_id).
--       Code in conversations.ts references worker_id/business_id — schema mismatch!
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_p1_sorted
  ON conversations(participant_1_id, last_message_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_p2_sorted
  ON conversations(participant_2_id, last_message_at DESC);

-- ============================================================================
-- WALLET TRANSACTIONS — balance calculation queries
-- ============================================================================
-- Used by: calculatePendingBalance(), getTotalEarnings()
-- Query pattern: WHERE wallet_id = ? AND type = 'pending'/'credit'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_tx_wallet_type
  ON wallet_transactions(wallet_id, type) INCLUDE (amount);

-- ============================================================================
-- BOOKINGS — compliance/worker dashboards
-- ============================================================================
-- Used by: compliance queries, worker dashboards
-- Query pattern: WHERE worker_id = ? AND status = 'completed' (for reliability score)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_worker_completed
  ON bookings(worker_id, status)
  WHERE status IN ('completed', 'cancelled', 'no_show');

-- Bookings with payment status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_payment_status
  ON bookings(payment_status)
  WHERE payment_status IS NOT NULL;

-- Bookings by business + status + date range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_biz_status_date
  ON bookings(business_id, status, start_date);

-- ============================================================================
-- JOB APPLICATIONS — worker applications with status
-- ============================================================================
-- Used by: worker application tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_worker_status_date
  ON job_applications(worker_id, status, applied_at DESC);

-- ============================================================================
-- NOTIFICATIONS — unread badge count
-- ============================================================================
-- Used by: notification badge queries
-- Query pattern: WHERE user_id = ? AND is_read = FALSE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- ============================================================================
-- PAYMENT TRANSACTIONS — business dashboard
-- ============================================================================
-- Used by: business payment history, revenue calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_tx_biz_status_date
  ON payment_transactions(business_id, status, created_at DESC);

-- ============================================================================
-- JOBS — marketplace search optimization
-- ============================================================================
-- Partial index for open jobs only (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_open_created
  ON jobs(created_at DESC, category_id)
  WHERE status = 'open';

-- Jobs by business with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_biz_status_date
  ON jobs(business_id, status, created_at DESC);

-- ============================================================================
-- COMPLIANCE TRACKING — worker/business month lookups
-- ============================================================================
-- Used by: getWorkerDaysForMonth(), getBusinessComplianceRecords()
-- Composite on (business_id, worker_id, month) already exists; add covering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ct_biz_month
  ON compliance_tracking(business_id, month)
  INCLUDE (worker_id, days_worked);

-- ============================================================================
-- VERIFICATION QUERY (run after migration)
-- ============================================================================
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE indexname LIKE 'idx_%' AND schemaname = 'public'
-- ORDER BY tablename, indexname;
