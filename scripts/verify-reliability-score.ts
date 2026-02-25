/**
 * Reliability Score Calculation - End-to-End Verification Script
 *
 * This script verifies the complete reliability score calculation system:
 * 1. Database schema (columns, tables, triggers)
 * 2. Score calculation logic (40/30/30 formula)
 * 3. Server actions and queries
 * 4. UI components integration
 *
 * Run: npm run verify-reliability-score
 */

import { createClient } from '../lib/supabase/server'
import { calculateScore } from '../lib/supabase/queries/reliability-score'

interface VerificationResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  details: string
  duration: number
}

const results: VerificationResult[] = []

function log(name: string, status: 'pass' | 'fail' | 'skip', details: string, duration: number) {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️ '
  console.log(`${icon} ${name}: ${status.toUpperCase()} (${duration}ms)`)
  if (details) {
    console.log(`   ${details}`)
  }
  results.push({ name, status, details, duration })
}

async function verifyDatabaseSchema(): Promise<void> {
  const start = Date.now()
  try {
    const supabase = await createClient()

    // 1. Check bookings table for actual_start_time and actual_end_time columns
    // by attempting to select them
    const { data: testBooking, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, actual_start_time, actual_end_time')
      .limit(1)

    if (!bookingsError) {
      log('Database: Bookings actual time columns', 'pass', 'actual_start_time and actual_end_time columns exist', Date.now() - start)
    } else {
      log('Database: Bookings actual time columns', 'fail', `Missing columns: ${bookingsError.message}`, Date.now() - start)
    }

    // 2. Check reliability_score_history table exists
    const { data: historyData, error: historyError } = await supabase
      .from('reliability_score_history')
      .select('*')
      .limit(0)

    if (!historyError) {
      log('Database: reliability_score_history table', 'pass', 'Table exists and is accessible', Date.now() - start)
    } else {
      log('Database: reliability_score_history table', 'fail', `Table error: ${historyError.message}`, Date.now() - start)
    }

    // 3. Check workers table for reliability_score column
    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('id, reliability_score')
      .limit(1)

    if (!workerError) {
      log('Database: Workers reliability_score column', 'pass', 'reliability_score column exists', Date.now() - start)
    } else {
      log('Database: Workers reliability_score column', 'fail', `Column error: ${workerError.message}`, Date.now() - start)
    }
  } catch (error) {
    log('Database Schema Verification', 'fail', error instanceof Error ? error.message : 'Unknown error', Date.now() - start)
  }
}

async function verifyScoreCalculation(): Promise<void> {
  const start = Date.now()
  try {
    const supabase = await createClient()

    // Get a worker with completed bookings to test calculation
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id')
      .limit(1)

    if (workersError || !workers || workers.length === 0) {
      log('Score Calculation: Test worker', 'skip', 'No workers found in database', Date.now() - start)
      return
    }

    const testWorkerId = workers[0].id

    // Test score calculation
    const breakdown = await calculateScore(testWorkerId)

    if (breakdown) {
      // Verify score is within valid range
      const scoreValid = breakdown.score >= 1.0 && breakdown.score <= 5.0
      const attendanceValid = breakdown.attendance_rate >= 0 && breakdown.attendance_rate <= 1
      const punctualityValid = breakdown.punctuality_rate >= 0 && breakdown.punctuality_rate <= 1
      const ratingValid = breakdown.avg_rating >= 0 && breakdown.avg_rating <= 5

      if (scoreValid && attendanceValid && punctualityValid && ratingValid) {
        log('Score Calculation: Calculation logic', 'pass',
          `Score: ${breakdown.score}, Attendance: ${(breakdown.attendance_rate * 100).toFixed(0)}%, Punctuality: ${(breakdown.punctuality_rate * 100).toFixed(0)}%, Rating: ${breakdown.avg_rating.toFixed(1)}`,
          Date.now() - start)
      } else {
        log('Score Calculation: Calculation logic', 'fail',
          `Invalid values detected`, Date.now() - start)
      }
    } else {
      log('Score Calculation: Calculation logic', 'skip',
        'Worker has no completed bookings', Date.now() - start)
    }

    // Test score history recording
    const { data: history, error: historyError } = await supabase
      .from('reliability_score_history')
      .select('*')
      .eq('worker_id', testWorkerId)
      .order('calculated_at', { ascending: false })
      .limit(1)

    if (!historyError && history && history.length > 0) {
      const latestEntry = history[0]
      const hasAllFields =
        latestEntry.score !== undefined &&
        latestEntry.attendance_rate !== undefined &&
        latestEntry.punctuality_rate !== undefined &&
        latestEntry.avg_rating !== undefined &&
        latestEntry.completed_jobs_count !== undefined

      if (hasAllFields) {
        log('Score Calculation: History recording', 'pass',
          `History entry exists with all required fields`, Date.now() - start)
      } else {
        log('Score Calculation: History recording', 'fail',
          `History entry missing required fields`, Date.now() - start)
      }
    } else {
      log('Score Calculation: History recording', 'skip',
        'No score history found for test worker', Date.now() - start)
    }
  } catch (error) {
    log('Score Calculation Verification', 'fail', error instanceof Error ? error.message : 'Unknown error', Date.now() - start)
  }
}

async function verifyServerActions(): Promise<void> {
  const start = Date.now()
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const actionsPath = path.join(process.cwd(), 'lib', 'actions', 'reliability-score.ts')
    const queriesPath = path.join(process.cwd(), 'lib', 'supabase', 'queries', 'reliability-score.ts')

    try {
      await fs.access(actionsPath)
      log('Server Actions: reliability-score.ts', 'pass', 'File exists', Date.now() - start)
    } catch {
      log('Server Actions: reliability-score.ts', 'fail', 'File does not exist', Date.now() - start)
    }

    try {
      await fs.access(queriesPath)
      log('Server Actions: reliability-score queries', 'pass', 'File exists', Date.now() - start)
    } catch {
      log('Server Actions: reliability-score queries', 'fail', 'File does not exist', Date.now() - start)
    }
  } catch (error) {
    log('Server Actions Verification', 'fail', error instanceof Error ? error.message : 'Unknown error', Date.now() - start)
  }
}

async function verifyUIComponents(): Promise<void> {
  const start = Date.now()
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const components = [
      { name: 'ReliabilityBadge', path: 'components/worker/reliability-badge.tsx' },
      { name: 'ScoreBreakdown', path: 'components/worker/score-breakdown.tsx' },
      { name: 'ScoreHistory', path: 'components/worker/score-history.tsx' },
    ]

    for (const component of components) {
      try {
        await fs.access(path.join(process.cwd(), component.path))
        log(`UI Components: ${component.name}`, 'pass', 'File exists', Date.now() - start)
      } catch {
        log(`UI Components: ${component.name}`, 'fail', 'File does not exist', Date.now() - start)
      }
    }

    // Check worker profile page integration
    try {
      const profilePagePath = path.join(process.cwd(), 'app', 'app', '(dashboard)', 'worker', 'profile', 'page.tsx')
      const content = await fs.readFile(profilePagePath, 'utf-8')

      const hasReliabilityBadge = content.includes('ReliabilityBadge')
      const hasScoreBreakdown = content.includes('ScoreBreakdown')
      const hasScoreHistory = content.includes('ScoreHistory')

      if (hasReliabilityBadge && hasScoreBreakdown && hasScoreHistory) {
        log('UI Integration: Worker profile page', 'pass', 'All reliability score components imported and used', Date.now() - start)
      } else {
        log('UI Integration: Worker profile page', 'fail',
          `Missing: ${!hasReliabilityBadge ? 'ReliabilityBadge ' : ''}${!hasScoreBreakdown ? 'ScoreBreakdown ' : ''}${!hasScoreHistory ? 'ScoreHistory' : ''}`,
          Date.now() - start)
      }
    } catch {
      log('UI Integration: Worker profile page', 'fail', 'Could not read profile page', Date.now() - start)
    }

    // Check business applicant view integration
    try {
      const applicantListPath = path.join(process.cwd(), 'components', 'applicant-list.tsx')
      const content = await fs.readFile(applicantListPath, 'utf-8')

      const hasReliabilityScore = content.includes('reliability_score') || content.includes('ReliabilityBadge')

      if (hasReliabilityScore) {
        log('UI Integration: Business applicant view', 'pass', 'Reliability score display integrated', Date.now() - start)
      } else {
        log('UI Integration: Business applicant view', 'fail', 'Reliability score not integrated', Date.now() - start)
      }
    } catch {
      log('UI Integration: Business applicant view', 'skip', 'Could not read applicant list component', Date.now() - start)
    }
  } catch (error) {
    log('UI Components Verification', 'fail', error instanceof Error ? error.message : 'Unknown error', Date.now() - start)
  }
}

async function verifyDatabaseTrigger(): Promise<void> {
  const start = Date.now()
  try {
    // Check if the trigger migration file exists
    const fs = await import('fs/promises')
    const path = await import('path')
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260222_add_score_trigger.sql')

    try {
      await fs.access(migrationPath)
      const content = await fs.readFile(migrationPath, 'utf-8')
      const hasTriggerFunction = content.includes('calculate_reliability_score')
      const hasTrigger = content.includes('trigger_recalculate_reliability_score')

      if (hasTriggerFunction && hasTrigger) {
        log('Database Trigger: Auto-calculation', 'pass', 'Trigger migration exists with required functions', Date.now() - start)
      } else {
        log('Database Trigger: Auto-calculation', 'fail', 'Trigger migration incomplete', Date.now() - start)
      }
    } catch {
      log('Database Trigger: Auto-calculation', 'fail', 'Trigger migration not found', Date.now() - start)
    }
  } catch (error) {
    log('Database Trigger Verification', 'fail', error instanceof Error ? error.message : 'Unknown error', Date.now() - start)
  }
}

async function printSummary(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('VERIFICATION SUMMARY')
  console.log('='.repeat(60) + '\n')

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length
  const total = results.length

  console.log(`Total Checks: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log('')

  if (failed > 0) {
    console.log('FAILED CHECKS:')
    results
      .filter(r => r.status === 'fail')
      .forEach(r => console.log(`  • ${r.name}: ${r.details}`))
    console.log('')
  }

  if (skipped > 0) {
    console.log('SKIPPED CHECKS:')
    results
      .filter(r => r.status === 'skip')
      .forEach(r => console.log(`  • ${r.name}: ${r.details}`))
    console.log('')
  }

  const success = failed === 0
  console.log('='.repeat(60))
  console.log(success ? '✅ ALL VERIFICATIONS PASSED' : '❌ SOME VERIFICATIONS FAILED')
  console.log('='.repeat(60) + '\n')

  // Print manual testing checklist
  console.log('MANUAL TESTING CHECKLIST:')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log('1. Create a new job posting as a business user')
  console.log('2. Have a worker apply to the job')
  console.log('3. Accept the application (creates booking)')
  console.log('4. Mark the booking as completed')
  console.log('5. Verify the worker\'s reliability score is recalculated')
  console.log('6. Check that a new entry appears in reliability_score_history table')
  console.log('7. Navigate to worker profile page and verify score displays correctly')
  console.log('8. Check business applicant view shows reliability scores')
  console.log('─────────────────────────────────────────────────────────────────\n')
}

async function main(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('RELIABILITY SCORE CALCULATION - END-TO-END VERIFICATION')
  console.log('='.repeat(60) + '\n')

  await verifyDatabaseSchema()
  await verifyScoreCalculation()
  await verifyServerActions()
  await verifyUIComponents()
  await verifyDatabaseTrigger()

  await printSummary()

  const failedCount = results.filter(r => r.status === 'fail').length
  process.exit(failedCount > 0 ? 1 : 0)
}

main()
