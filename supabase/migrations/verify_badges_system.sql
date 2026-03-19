-- ============================================================================
-- Verification Script for Badges System
-- ============================================================================
-- Run this script after applying the badges migration to verify everything
-- was created correctly.
-- ============================================================================

-- Check if badges table exists
SELECT 
  'badges table exists' as check_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'badges')
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- Check if worker_badges table exists
SELECT 
  'worker_badges table exists' as check_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'worker_badges')
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- Check if badge_type enum exists
SELECT 
  'badge_type enum exists' as check_name,
  CASE 
    WHEN EXISTS (SELECT FROM pg_type WHERE typname = 'badge_type')
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- Check if tier_requirement enum exists
SELECT 
  'tier_requirement enum exists' as check_name,
  CASE 
    WHEN EXISTS (SELECT FROM pg_type WHERE typname = 'tier_requirement')
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- Count badges by type
SELECT 
  'Badge counts by type' as check_name,
  badge_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM badges
GROUP BY badge_type;

-- Total badges created
SELECT 
  'Total badges created' as check_name,
  COUNT(*) as total_count,
  CASE 
    WHEN COUNT(*) = 15 THEN '✓ PASS (15 badges expected)'
    ELSE '⚠ WARNING (expected 15 badges)'
  END as status
FROM badges;

-- Check RLS is enabled on badges
SELECT 
  'RLS enabled on badges' as check_name,
  CASE 
    WHEN relrowsecurity = true THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM pg_class
WHERE relname = 'badges';

-- Check RLS is enabled on worker_badges
SELECT 
  'RLS enabled on worker_badges' as check_name,
  CASE 
    WHEN relrowsecurity = true THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM pg_class
WHERE relname = 'worker_badges';

-- Count RLS policies
SELECT 
  'RLS policies on badges' as check_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✓ PASS'
    ELSE '⚠ WARNING (expected at least 4 policies)'
  END as status
FROM pg_policies
WHERE tablename = 'badges';

-- Count RLS policies on worker_badges
SELECT 
  'RLS policies on worker_badges' as check_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✓ PASS'
    ELSE '⚠ WARNING (expected at least 4 policies)'
  END as status
FROM pg_policies
WHERE tablename = 'worker_badges';

-- Check if indexes exist
SELECT 
  'Index idx_badges_type exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_indexes 
      WHERE indexname = 'idx_badges_type'
    ) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

SELECT 
  'Index idx_worker_badges_worker exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_indexes 
      WHERE indexname = 'idx_worker_badges_worker'
    ) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- Check if helper functions exist
SELECT 
  'Function check_badge_eligibility exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_proc 
      WHERE proname = 'check_badge_eligibility'
    ) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

SELECT 
  'Function award_badge exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_proc 
      WHERE proname = 'award_badge'
    ) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- Check if view exists
SELECT 
  'View worker_badge_summary exists' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.views 
      WHERE table_name = 'worker_badge_summary'
    ) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status;

-- List all badges (for manual verification)
SELECT 
  'Badge list' as info,
  name,
  badge_type,
  tier_requirement,
  points,
  is_active
FROM badges
ORDER BY badge_type, points;

-- Summary
SELECT '
========================================
BADGES SYSTEM VERIFICATION SUMMARY
========================================

If all checks show ✓ PASS, the migration was successful!

Key Items Created:
- 2 tables (badges, worker_badges)
- 2 enums (badge_type, tier_requirement)
- 15 seed badges (4 tier, 6 achievement, 5 skill)
- RLS policies for security
- Indexes for performance
- Helper functions for badge management
- Summary view for easy querying

Next Steps:
1. Test badge awarding with award_badge() function
2. Verify RLS policies with different user roles
3. Add badge icons to storage
4. Integrate with application logic

========================================
' as summary;
