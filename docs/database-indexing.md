# Database Indexing Strategy

This document explains the indexing strategy for Daily Worker Hub, when to use each index, and provides query examples.

## Overview

Proper database indexing is critical for performance, especially as the platform scales. This guide covers:

1. **Why indexes matter** - Performance benefits and trade-offs
2. **Index types used** - B-tree, composite, partial indexes
3. **When to use each index** - Query patterns
4. **Query examples** - How to write queries that utilize indexes effectively

## Index Types

### B-tree Indexes (Default)

Standard PostgreSQL indexes, ideal for:

- Equality comparisons (`=`, `IN`)
- Range queries (`<`, `>`, `BETWEEN`)
- Sorting operations (`ORDER BY`)

### Composite Indexes

Multi-column indexes that support queries filtering on multiple columns. Order matters!

**Rule**: Put equality filter columns first, range/sort columns last.

```sql
-- Good composite index for: WHERE status = 'open' ORDER BY created_at DESC
CREATE INDEX idx_jobs_status_created_at ON jobs(status, created_at DESC);
```

### Partial Indexes

Indexes on a subset of rows, reducing size and maintenance overhead:

```sql
-- Only index rows where business_id is not null
CREATE INDEX idx_reviews_business_id_rating
  ON reviews(business_id, rating) WHERE business_id IS NOT NULL;
```

### GIST Indexes (Geospatial)

For PostGIS geospatial queries. Requires PostGIS extension:

```sql
-- Uncomment when PostGIS is enabled
-- CREATE INDEX idx_jobs_location_gist ON jobs USING GIST (location);
```

## Index Reference

### Jobs Table

| Index Name                    | Columns                   | Purpose                                            |
| ----------------------------- | ------------------------- | -------------------------------------------------- |
| `idx_jobs_status_created_at`  | (status, created_at DESC) | Job marketplace - filter by status, sort by newest |
| `idx_jobs_business_id`        | (business_id)             | Business job management                            |
| `idx_jobs_category_id`        | (category_id)             | Category filtering                                 |
| `idx_jobs_category_id_status` | (category_id, status)     | Category-filtered marketplace                      |
| `idx_jobs_location`           | (lat, lng)                | Location-based queries (numeric)                   |

#### Query Examples

```sql
-- Get open jobs, newest first (uses idx_jobs_status_created_at)
SELECT * FROM jobs
WHERE status = 'open'
ORDER BY created_at DESC
LIMIT 20;

-- Get jobs by category (uses idx_jobs_category_id_status)
SELECT * FROM jobs
WHERE category_id = 'uuid-here' AND status = 'open'
ORDER BY created_at DESC;

-- Get business jobs (uses idx_jobs_business_id)
SELECT * FROM jobs
WHERE business_id = 'uuid-here'
ORDER BY created_at DESC;
```

### Bookings Table

| Index Name                        | Columns               | Purpose                                 |
| --------------------------------- | --------------------- | --------------------------------------- |
| `idx_bookings_worker_id_status`   | (worker_id, status)   | Worker dashboard - bookings by status   |
| `idx_bookings_business_id_status` | (business_id, status) | Business dashboard - bookings by status |
| `idx_bookings_job_id`             | (job_id)              | Job-related bookings                    |
| `idx_bookings_scheduled_date`     | (start_date)          | Date range queries for scheduling       |

#### Query Examples

```sql
-- Worker dashboard: Get active bookings (uses idx_bookings_worker_id_status)
SELECT * FROM bookings
WHERE worker_id = 'uuid-here'
  AND status IN ('pending', 'accepted', 'in_progress')
ORDER BY start_date;

-- Business dashboard: Get today's bookings (uses idx_bookings_business_id_status)
SELECT * FROM bookings
WHERE business_id = 'uuid-here'
  AND status = 'accepted'
  AND start_date = CURRENT_DATE;

-- Date range query (uses idx_bookings_scheduled_date)
SELECT * FROM bookings
WHERE start_date BETWEEN '2026-03-01' AND '2026-03-31'
ORDER BY start_date;
```

### Users Table

| Index Name        | Columns        | Purpose                      |
| ----------------- | -------------- | ---------------------------- |
| `idx_users_email` | (email) UNIQUE | Email lookup, authentication |
| `idx_users_role`  | (role)         | Role-based queries           |

#### Query Examples

```sql
-- Find user by email (uses idx_users_email)
SELECT * FROM users WHERE email = 'user@example.com';

-- Get all business users (uses idx_users_role)
SELECT * FROM users WHERE role = 'business';
```

**Note**: The `tier` column exists in the `workers` table, not `users`. Use `idx_workers_tier` for tier queries.

### Job Applications Table

| Index Name                            | Columns               | Purpose                              |
| ------------------------------------- | --------------------- | ------------------------------------ |
| `idx_applications_job_id_status`      | (job_id, status)      | Business: manage applications by job |
| `idx_applications_worker_id`          | (worker_id)           | Worker: track own applications       |
| `idx_applications_business_id_status` | (business_id, status) | Business dashboard aggregation       |

#### Query Examples

```sql
-- Business: Get pending applications for a job (uses idx_applications_job_id_status)
SELECT * FROM job_applications
WHERE job_id = 'uuid-here' AND status = 'pending'
ORDER BY applied_at DESC;

-- Worker: Get my applications (uses idx_job_applications_worker_id)
SELECT * FROM job_applications
WHERE worker_id = 'uuid-here'
ORDER BY applied_at DESC;

-- Business dashboard: Count applications by status
SELECT status, COUNT(*) FROM job_applications
WHERE business_id = 'uuid-here'
GROUP BY status;
```

### Reviews Table

| Index Name                       | Columns               | Purpose                     |
| -------------------------------- | --------------------- | --------------------------- |
| `idx_reviews_booking_id`         | (booking_id)          | Link reviews to bookings    |
| `idx_reviews_worker_id`          | (worker_id)           | Worker review lookup        |
| `idx_reviews_worker_id_rating`   | (worker_id, rating)   | Worker rating aggregation   |
| `idx_reviews_business_id_rating` | (business_id, rating) | Business rating aggregation |

#### Query Examples

```sql
-- Get worker's average rating (uses idx_reviews_worker_id_rating)
SELECT
  worker_id,
  AVG(rating) as avg_rating,
  COUNT(*) as review_count
FROM reviews
WHERE worker_id = 'uuid-here' AND reviewer = 'business'
GROUP BY worker_id;

-- Get business's average rating (uses idx_reviews_business_id_rating)
SELECT
  business_id,
  AVG(rating) as avg_rating,
  COUNT(*) as review_count
FROM reviews
WHERE business_id = 'uuid-here' AND reviewer = 'worker'
GROUP BY business_id;

-- Get reviews for a booking (uses idx_reviews_booking_id)
SELECT * FROM reviews WHERE booking_id = 'uuid-here';
```

## Performance Best Practices

### 1. Use Indexes for Filtering and Sorting

```sql
-- GOOD: Uses index for both filter and sort
SELECT * FROM jobs
WHERE status = 'open'
ORDER BY created_at DESC;

-- BAD: Sorts without index (filesort)
SELECT * FROM jobs
ORDER BY created_at DESC;
```

### 2. Avoid Functions on Indexed Columns

```sql
-- BAD: Function prevents index usage
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- GOOD: Index can be used
SELECT * FROM users WHERE email = 'user@example.com';
```

### 3. Use LIMIT with ORDER BY

```sql
-- GOOD: Index scan with limit
SELECT * FROM jobs
WHERE status = 'open'
ORDER BY created_at DESC
LIMIT 20;

-- BAD: Might scan entire table
SELECT * FROM jobs
WHERE status = 'open';
```

### 4. Composite Index Column Order

```sql
-- Index: (status, created_at DESC)

-- GOOD: Uses full index
WHERE status = 'open' ORDER BY created_at DESC

-- GOOD: Uses index for status
WHERE status = 'open'

-- BAD: Cannot use index (created_at is second in index)
WHERE created_at > '2026-01-01'

-- BAD: Cannot use index efficiently
WHERE status = 'open' AND created_at > '2026-01-01' ORDER BY rating
```

## Index Maintenance

### Check Index Usage

```sql
-- Find unused indexes
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
  idx_scan as index_scans
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique
  AND idx_scan < 50
  AND pg_relation_size(relid) > 5 * 8192
ORDER BY pg_relation_size(i.indexrelid) DESC;

-- Check index bloat
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Rebuild Indexes (if needed)

```sql
-- Rebuild specific index concurrently (production-safe)
REINDEX INDEX CONCURRENTLY idx_jobs_status_created_at;

-- Rebuild all indexes on a table concurrently
REINDEX TABLE CONCURRENTLY jobs;
```

## Migration Strategy

### Creating Indexes in Production

1. **Always use CONCURRENTLY** - Prevents table locks
2. **Monitor disk space** - Indexes take storage
3. **Run during low traffic** - CONCURRENTLY still uses resources
4. **Verify after creation** - Check query plans

```sql
-- Safe production index creation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_new_index
  ON table_name(column_name);
```

### Dropping Indexes

```sql
-- Safe index removal
DROP INDEX CONCURRENTLY IF EXISTS idx_old_index;
```

## Query Plan Analysis

Always verify index usage with EXPLAIN ANALYZE:

```sql
-- Check if query uses expected index
EXPLAIN ANALYZE
SELECT * FROM jobs
WHERE status = 'open'
ORDER BY created_at DESC
LIMIT 20;

-- Look for "Index Scan" or "Index Only Scan"
-- "Seq Scan" means table scan (bad for large tables)
```

## Related Documentation

- [Architecture.md](./Architecture.md) - System architecture overview
- [SUPABASE-LOCAL-GUIDE.md](./SUPABASE-LOCAL-GUIDE.md) - Local Supabase setup
- [OPERATIONS.md](./OPERATIONS.md) - Production operations

---

**Last Updated**: 2026-03-19
**Migration**: `20260319000000_performance_indexes.sql`
