-- ============================================================================
-- Database Migration Verification Script
-- ============================================================================
-- This script verifies that all migrations have been applied correctly.
-- Run this in Supabase Studio > SQL Editor or via psql.
-- ============================================================================

-- Set output format (for psql)
\echo '==========================================================================='
\echo 'DATABASE MIGRATION VERIFICATION REPORT'
\echo '==========================================================================='
\echo ''

-- ============================================================================
-- 1. TABLES VERIFICATION
-- ============================================================================
\echo '1. TABLES VERIFICATION'
\echo '---------------------------------------------------------------------------'

SELECT
  'Tables Found' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 14 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 14 tables'
  END as status
FROM pg_tables
WHERE schemaname = 'public';

\echo ''

-- List all tables
SELECT
  tablename as table_name,
  CASE
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 2. ENUMS VERIFICATION
-- ============================================================================
\echo '2. ENUMS VERIFICATION'
\echo '---------------------------------------------------------------------------'

SELECT
  'Enum Types Found' as check_type,
  COUNT(DISTINCT typname) as count,
  CASE
    WHEN COUNT(DISTINCT typname) = 7 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 7 enum types'
  END as status
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid;

\echo ''

-- List all enums with values
SELECT
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
GROUP BY t.typname
ORDER BY t.typname;

\echo ''

-- ============================================================================
-- 3. RLS POLICIES VERIFICATION
-- ============================================================================
\echo '3. RLS POLICIES VERIFICATION'
\echo '---------------------------------------------------------------------------'

SELECT
  'Total RLS Policies' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 50 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 50+ policies'
  END as status
FROM pg_policies
WHERE schemaname = 'public';

\echo ''

-- Policies by table
SELECT
  tablename as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 4. SECURITY HELPER FUNCTIONS VERIFICATION
-- ============================================================================
\echo '4. SECURITY HELPER FUNCTIONS VERIFICATION'
\echo '---------------------------------------------------------------------------'

SELECT
  routine_name as function_name,
  CASE
    WHEN routine_name LIKE 'is_%' THEN 'Security Check'
    WHEN routine_name LIKE 'get_user%' THEN 'Helper'
    ELSE 'Other'
  END as function_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin',
    'get_user_role',
    'is_business_owner',
    'is_worker_owner'
  )
ORDER BY routine_name;

\echo ''

-- ============================================================================
-- 5. INDEXES VERIFICATION
-- ============================================================================
\echo '5. INDEXES VERIFICATION'
\echo '---------------------------------------------------------------------------'

SELECT
  'Total Indexes' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 40 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 40+ indexes'
  END as status
FROM pg_indexes
WHERE schemaname = 'public';

\echo ''

-- Key indexes by table
SELECT
  tablename as table_name,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 6. TRIGGERS VERIFICATION
-- ============================================================================
\echo '6. TRIGGERS VERIFICATION'
\echo '---------------------------------------------------------------------------'

SELECT
  'Total Triggers' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 5 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 5+ triggers'
  END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public';

\echo ''

-- List all triggers
SELECT
  trigger_name,
  event_object_table as table_name,
  action_timing as timing,
  event_manipulation as event,
  CASE
    WHEN action_statement LIKE '%update_updated_at_column%' THEN 'Auto update timestamp'
    WHEN action_statement LIKE '%handle_new_avatar%' THEN 'Auto update avatar_url'
    ELSE 'Other'
  END as purpose
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

\echo ''

-- ============================================================================
-- 7. SEED DATA VERIFICATION
-- ============================================================================
\echo '7. SEED DATA VERIFICATION'
\echo '---------------------------------------------------------------------------'

-- Create a temporary table for results
DROP TABLE IF EXISTS _verification_results;
CREATE TEMP TABLE _verification_results (
  table_name TEXT,
  count BIGINT,
  expected_count INT,
  status TEXT
);

-- Check each table
INSERT INTO _verification_results (table_name, count, expected_count, status)
SELECT 'categories', COUNT(*), 10,
  CASE WHEN COUNT(*) = 10 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM categories
UNION ALL
SELECT 'skills', COUNT(*), 15,
  CASE WHEN COUNT(*) = 15 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM skills
UNION ALL
SELECT 'users', COUNT(*), 15,
  CASE WHEN COUNT(*) >= 15 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM users
UNION ALL
SELECT 'businesses', COUNT(*), 5,
  CASE WHEN COUNT(*) = 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM businesses
UNION ALL
SELECT 'workers', COUNT(*), 10,
  CASE WHEN COUNT(*) = 10 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM workers
UNION ALL
SELECT 'jobs', COUNT(*), 10,
  CASE WHEN COUNT(*) = 10 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM jobs
UNION ALL
SELECT 'bookings', COUNT(*), 8,
  CASE WHEN COUNT(*) = 8 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM bookings
UNION ALL
SELECT 'transactions', COUNT(*), 2,
  CASE WHEN COUNT(*) >= 2 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM transactions
UNION ALL
SELECT 'messages', COUNT(*), 7,
  CASE WHEN COUNT(*) = 7 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM messages
UNION ALL
SELECT 'reviews', COUNT(*), 2,
  CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM reviews
UNION ALL
SELECT 'notifications', COUNT(*), 6,
  CASE WHEN COUNT(*) = 6 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM notifications
UNION ALL
SELECT 'reports', COUNT(*), 3,
  CASE WHEN COUNT(*) = 3 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM reports
UNION ALL
SELECT 'webhooks', COUNT(*), 2,
  CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM webhooks;

-- Display results
SELECT
  table_name,
  count as actual_count,
  expected_count,
  status
FROM _verification_results
ORDER BY table_name;

\echo ''

-- Overall seed data status
SELECT
  CASE
    WHEN COUNT(CASE WHEN status = '✅ PASS' THEN 1 END) = 13 THEN '✅ ALL SEED DATA VERIFIED'
    ELSE '❌ SOME SEED DATA MISSING'
  END as overall_status,
  COUNT(CASE WHEN status = '✅ PASS' THEN 1 END) as passed,
  13 as total_checks
FROM _verification_results;

\echo ''

-- ============================================================================
-- 8. STORAGE BUCKETS VERIFICATION
-- ============================================================================
\echo '8. STORAGE BUCKETS VERIFICATION'
\echo '---------------------------------------------------------------------------'

SELECT
  'Storage Buckets' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 3 buckets'
  END as status
FROM storage.buckets;

\echo ''

-- List all buckets
SELECT
  id as bucket_id,
  name,
  CASE
    WHEN public THEN '✅ Public'
    ELSE '🔒 Private'
  END as access,
  file_size_limit as size_limit_bytes,
  ROUND(file_size_limit / 1024.0 / 1024.0, 2) as size_limit_mb,
  array_to_string(allowed_mime_types, ', ') as allowed_types
FROM storage.buckets
ORDER BY id;

\echo ''

-- Storage RLS policies
SELECT
  bucket_id,
  COUNT(*) as policy_count
FROM storage.policies
GROUP BY bucket_id
ORDER BY bucket_id;

\echo ''

-- ============================================================================
-- 9. FOREIGN KEY CONSTRAINTS VERIFICATION
-- ============================================================================
\echo '9. FOREIGN KEY CONSTRAINTS VERIFICATION'
\echo '---------------------------------------------------------------------------'

SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as references_table,
  '✅ OK' as status
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

\echo ''

-- ============================================================================
-- 10. SUMMARY
-- ============================================================================
\echo '==========================================================================='
\echo 'VERIFICATION SUMMARY'
\echo '==========================================================================='

SELECT
  '✅ Verification Complete' as status,
  'Review results above for any failures' as notes;

\echo ''
\echo 'To fix any issues:'
\echo '  1. Review the failed checks above'
\echo '  2. Run: supabase db reset'
\echo '  3. Re-run this verification script'
\echo ''
