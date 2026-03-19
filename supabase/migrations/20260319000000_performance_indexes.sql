-- ============================================================================
-- PERFORMANCE INDEXES FOR DAILY WORKER HUB
-- ============================================================================
-- This migration adds performance-optimized indexes for common query patterns.
-- Uses CONCURRENTLY to avoid blocking writes during index creation.
-- Version: 20260319000000
-- Date: 2026-03-19
-- ============================================================================

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 1. CONCURRENTLY allows index creation without blocking writes (production-safe)
-- 2. Cannot run CONCURRENTLY in transaction blocks - each statement is autonomous
-- 3. Some indexes already exist from 001_initial_schema.sql - we use IF NOT EXISTS
-- 4. For PostGIS GIST indexes, PostGIS extension must be enabled first
-- ============================================================================

-- ============================================================================
-- JOBS TABLE INDEXES
-- ============================================================================

-- Index for: Filtering jobs by status and sorting by creation date (DESC)
-- Common query: Get open jobs ordered by most recent first
-- Example: SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC LIMIT 20;
-- Performance: Enables efficient filtering + sorting in single index scan
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status_created_at
  ON jobs(status, created_at DESC);

-- Note: idx_jobs_business_id already exists from 001_initial_schema.sql
-- Note: idx_jobs_category_id already exists from 001_initial_schema.sql

-- Index for: Location-based queries (requires PostGIS)
-- If PostGIS is enabled, this GIST index enables efficient geospatial queries
-- Example: SELECT * FROM jobs WHERE location <@ ST_MakeBox2D(ST_Point(115.1, -8.5), ST_Point(115.3, -8.3));
-- Note: This is a placeholder - uncomment if PostGIS extension is enabled
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_location_gist
--   ON jobs USING GIST (location);

-- ============================================================================
-- BOOKINGS TABLE INDEXES
-- ============================================================================

-- Index for: Worker dashboard - get all bookings for a worker filtered by status
-- Common query: SELECT * FROM bookings WHERE worker_id = ? AND status IN ('pending', 'accepted');
-- Performance: Composite index enables efficient filtering by both columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_worker_id_status
  ON bookings(worker_id, status);

-- Index for: Business dashboard - get all bookings for a business filtered by status
-- Common query: SELECT * FROM bookings WHERE business_id = ? AND status = 'accepted';
-- Performance: Composite index for business + status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_business_id_status
  ON bookings(business_id, status);

-- Note: idx_bookings_job_id already exists from 001_initial_schema.sql
-- Note: idx_bookings_start_date already exists from 001_initial_schema.sql
-- (The task mentioned scheduled_date, but the actual column is start_date)

-- Index for: Scheduled date queries (using start_date column)
-- If you need to query bookings by date range for scheduling
-- Example: SELECT * FROM bookings WHERE start_date BETWEEN '2026-03-01' AND '2026-03-31';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_scheduled_date
  ON bookings(start_date);

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Note: idx_users_email already exists from 001_initial_schema.sql
-- The table already has UNIQUE constraint on email, so this is covered

-- Note: idx_users_role already exists from 001_initial_schema.sql

-- Note: The 'tier' column exists in workers table, not users table
-- See idx_workers_tier in 20260227000004_add_worker_tiers.sql

-- ============================================================================
-- JOB_APPLICATIONS TABLE INDEXES
-- ============================================================================

-- Index for: Business application management - get applications for a job by status
-- Common query: SELECT * FROM job_applications WHERE job_id = ? AND status = 'pending';
-- Performance: Composite index for job + status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_job_id_status
  ON job_applications(job_id, status);

-- Index for: Worker application tracking - get all applications by worker
-- Common query: SELECT * FROM job_applications WHERE worker_id = ? ORDER BY applied_at DESC;
-- Note: idx_job_applications_worker_id already exists from 20260302000001_add_booking_flow.sql

-- ============================================================================
-- REVIEWS TABLE INDEXES
-- ============================================================================

-- Note: idx_reviews_booking_id already exists from 001_initial_schema.sql
-- Note: idx_reviews_worker_id already exists from 001_initial_schema.sql

-- Index for: Reviewee aggregation queries (worker ratings, business ratings)
-- The reviews table uses worker_id and business_id for reviewees, not a generic reviewee_id
-- This index helps with rating aggregation for workers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_worker_id_rating
  ON reviews(worker_id, rating);

-- Index for: Business rating aggregation (when worker reviews business)
-- Common query: SELECT AVG(rating) FROM reviews WHERE business_id = ? AND reviewer = 'worker';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_id_rating
  ON reviews(business_id, rating) WHERE business_id IS NOT NULL;

-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES FOR COMMON PATTERNS
-- ============================================================================

-- Index for: Job search by category and status
-- Common query: SELECT * FROM jobs WHERE category_id = ? AND status = 'open';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_category_id_status
  ON jobs(category_id, status);

-- Index for: Application status aggregation by business
-- Common query: SELECT status, COUNT(*) FROM job_applications WHERE business_id = ? GROUP BY status;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_business_id_status
  ON job_applications(business_id, status);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_jobs_status_created_at IS 'Composite index for filtering jobs by status and sorting by creation date. Used in job marketplace queries.';
COMMENT ON INDEX idx_bookings_worker_id_status IS 'Composite index for worker dashboard queries - get worker bookings filtered by status.';
COMMENT ON INDEX idx_bookings_business_id_status IS 'Composite index for business dashboard queries - get business bookings filtered by status.';
COMMENT ON INDEX idx_bookings_scheduled_date IS 'Index for date-range queries on booking start_date (scheduled date).';
COMMENT ON INDEX idx_applications_job_id_status IS 'Composite index for business application management - filter applications by job and status.';
COMMENT ON INDEX idx_reviews_worker_id_rating IS 'Composite index for worker rating aggregation queries.';
COMMENT ON INDEX idx_reviews_business_id_rating IS 'Composite index for business rating aggregation queries (partial index for non-null business_id).';
COMMENT ON INDEX idx_jobs_category_id_status IS 'Composite index for category-filtered job marketplace queries.';
COMMENT ON INDEX idx_applications_business_id_status IS 'Composite index for business application dashboard queries.';

-- ============================================================================
-- VERIFICATION QUERY (Run after migration to verify indexes)
-- ============================================================================
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
