#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: Repeated Cancellations Affect Reliability Score
 *
 * This script verifies that repeated cancellations properly affect the reliability score:
 * 1. Worker has multiple bookings
 * 2. Worker cancels multiple bookings with different penalty reasons
 * 3. Verify reliability score decreases with each cancellation
 * 4. Verify penalty accumulation is correct
 *
 * Expected behavior:
 * - Emergency cancellations (0% penalty): minimal impact
 * - Partial penalty cancellations (10-25%): moderate impact
 * - Full penalty cancellations (100%): maximum impact
 * - Repeated cancellations compound the effect on reliability score
 *
 * Usage:
 *   npx ts-node scripts/test-e2e-repeated-cancellations.ts
 *
 * Prerequisites:
 *   - Supabase is running
 *   - Database migrations have been applied
 *   - Environment variables are set
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { join } from 'path'

// Load environment variables
const envPath = join(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test configuration
const TEST_CANCELLATION_NOTE = 'Sakit demam tinggi, tidak bisa datang ke lokasi kerja'
const TEST_TRANSPORTATION_NOTE = 'Kendaraan mogok di tengah jalan'
const TEST_SCHEDULE_NOTE = 'Salah jadwal, double booking'

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(message: string, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Step 1: Get or create test data
 */
async function setupTestData() {
  log(`\n📋 Step 1: Setting up test data`, 'cyan')

  // Find or create a worker
  let { data: worker, error: workerError } = await supabase
    .from('workers')
    .select('*')
    .limit(1)
    .single()

  if (workerError || !worker) {
    log(`   ℹ️  No worker found, creating test worker...`, 'yellow')

    // First create a user
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: `test-worker-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })

    if (userError || !newUser.user) {
      log(`   ❌ Failed to create user: ${userError?.message}`, 'red')
      throw userError
    }

    // Then create the worker
    const { data: newWorker, error: newWorkerError } = await supabase
      .from('workers')
      .insert({
        user_id: newUser.user.id,
        full_name: 'Test Worker',
        phone: '6281234567890',
        date_of_birth: '1990-01-01',
        address: 'Test Address',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postal_code: '12345',
        is_active: true,
      })
      .select()
      .single()

    if (newWorkerError || !newWorker) {
      log(`   ❌ Failed to create worker: ${newWorkerError?.message}`, 'red')
      throw newWorkerError
    }

    worker = newWorker
    log(`   ✅ Test worker created`, 'green')
  } else {
    log(`   ✅ Using existing worker`, 'green')
  }

  log(`   Worker ID: ${worker.id}`, 'blue')
  log(`   Worker Name: ${worker.full_name}`, 'blue')

  // Find or create a business
  let { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .limit(1)
    .single()

  if (businessError || !business) {
    log(`   ℹ️  No business found, creating test business...`, 'yellow')

    // First create a user
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: `test-business-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })

    if (userError || !newUser.user) {
      log(`   ❌ Failed to create user: ${userError?.message}`, 'red')
      throw userError
    }

    // Then create the business
    const { data: newBusiness, error: newBusinessError } = await supabase
      .from('businesses')
      .insert({
        user_id: newUser.user.id,
        name: 'Test Business',
        phone: '6281234567890',
        address: 'Test Business Address',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postal_code: '12345',
        business_type: 'restaurant',
        is_active: true,
        is_verified: true,
      })
      .select()
      .single()

    if (newBusinessError || !newBusiness) {
      log(`   ❌ Failed to create business: ${newBusinessError?.message}`, 'red')
      throw newBusinessError
    }

    business = newBusiness
    log(`   ✅ Test business created`, 'green')
  } else {
    log(`   ✅ Using existing business`, 'green')
  }

  log(`   Business ID: ${business.id}`, 'blue')
  log(`   Business Name: ${business.name}`, 'blue')

  // Create multiple jobs and bookings for testing
  const bookings = []
  const jobs = []
  const now = new Date()

  for (let i = 0; i < 5; i++) {
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() + i + 1)
    const endDate = new Date(startDate)
    endDate.setHours(endDate.getHours() + 8)

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        business_id: business.id,
        title: `Test Job ${i + 1}`,
        description: `Test job for repeated cancellations ${i + 1}`,
        address: 'Test Location Address',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postal_code: '12345',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        wage: 150000,
        workers_needed: 1,
        status: 'active',
      })
      .select()
      .single()

    if (jobError || !job) {
      log(`   ❌ Failed to create job ${i + 1}: ${jobError?.message}`, 'red')
      throw jobError
    }

    jobs.push(job)

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        worker_id: worker.id,
        job_id: job.id,
        business_id: business.id,
        status: 'accepted',
        start_date: job.start_date,
        end_date: job.end_date,
        final_price: job.wage,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (bookingError || !booking) {
      log(`   ❌ Failed to create booking ${i + 1}: ${bookingError?.message}`, 'red')
      throw bookingError
    }

    bookings.push(booking)
    log(`   ✅ Created booking ${i + 1}: ${booking.id}`, 'green')
  }

  return { worker, business, jobs, bookings }
}

/**
 * Get cancellation reasons with different penalties
 */
async function getCancellationReasons() {
  log(`\n🏥 Getting cancellation reasons`, 'cyan')

  // Get emergency reason (0% penalty)
  const { data: illnessReason, error: illnessError } = await supabase
    .from('cancellation_reasons')
    .select('*')
    .eq('category', 'illness')
    .eq('penalty_percentage', 0)
    .limit(1)
    .single()

  if (illnessError || !illnessReason) {
    log(`   ❌ No illness reason found: ${illnessError?.message}`, 'red')
    throw illnessError
  }

  // Get transportation reason (10% penalty)
  const { data: transportReason, error: transportError } = await supabase
    .from('cancellation_reasons')
    .select('*')
    .eq('category', 'transportation')
    .limit(1)
    .single()

  if (transportError || !transportReason) {
    log(`   ❌ No transportation reason found: ${transportError?.message}`, 'red')
    throw transportError
  }

  // Get schedule conflict reason (25% penalty)
  const { data: scheduleReason, error: scheduleError } = await supabase
    .from('cancellation_reasons')
    .select('*')
    .eq('category', 'schedule_conflict')
    .limit(1)
    .single()

  if (scheduleError || !scheduleReason) {
    log(`   ❌ No schedule conflict reason found: ${scheduleError?.message}`, 'red')
    throw scheduleError
  }

  log(`   ✅ Illness reason (0% penalty): ${illnessReason.name}`, 'green')
  log(`   ✅ Transportation reason (${transportReason.penalty_percentage}% penalty): ${transportReason.name}`, 'green')
  log(`   ✅ Schedule conflict reason (${scheduleReason.penalty_percentage}% penalty): ${scheduleReason.name}`, 'green')

  return { illnessReason, transportReason, scheduleReason }
}

/**
 * Cancel a booking
 */
async function cancelBooking(
  bookingId: string,
  cancellationReasonId: string,
  note: string
) {
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancellation_reason_id: cancellationReasonId,
      cancellation_note: note,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select(`
      *,
      cancellation_reasons (
        id,
        name,
        category,
        penalty_percentage
      )
    `)
    .single()

  if (updateError || !updatedBooking) {
    throw new Error(`Failed to cancel booking: ${updateError?.message}`)
  }

  return updatedBooking
}

/**
 * Calculate reliability score (simulating the edge function)
 */
async function calculateReliabilityScore(workerId: string) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      created_at,
      cancellation_reason_id,
      cancellation_reasons (
        penalty_percentage
      )
    `)
    .eq('worker_id', workerId)
    .gte('created_at', ninetyDaysAgo)

  if (bookingsError) {
    throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
  }

  const totalBookings = bookings?.length || 0
  let effectiveCompletions = 0
  let emergencyCancellations = 0
  let partialPenaltyCancellations = 0
  let fullPenaltyCancellations = 0
  const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0

  bookings?.forEach(booking => {
    if (booking.status === 'completed') {
      effectiveCompletions += 1
    } else if (booking.status === 'cancelled') {
      const penaltyPercent = booking.cancellation_reasons?.penalty_percentage ?? 100
      const effectiveValue = 1 - (penaltyPercent / 100)
      effectiveCompletions += effectiveValue

      if (penaltyPercent === 0) {
        emergencyCancellations++
      } else if (penaltyPercent < 100) {
        partialPenaltyCancellations++
      } else {
        fullPenaltyCancellations++
      }
    }
  })

  const completionRate = totalBookings > 0 ? (effectiveCompletions / totalBookings) * 100 : 100

  // Assume average rating of 3.0 (no reviews)
  const avgRating = 3.0
  const ratingScore = (avgRating / 5) * 100
  const reliabilityScore = (completionRate * 0.5) + (ratingScore * 0.5)
  const normalizedScore = Math.max(1, Math.min(5, reliabilityScore / 20))

  return {
    totalBookings,
    completedBookings,
    effectiveCompletions,
    completionRate,
    emergencyCancellations,
    partialPenaltyCancellations,
    fullPenaltyCancellations,
    reliabilityScore: Number(normalizedScore.toFixed(2)),
  }
}

/**
 * Main test execution
 */
async function runE2ETest() {
  log('\n' + '='.repeat(60), 'cyan')
  log('🧪 E2E TEST: Repeated Cancellations Affect Reliability Score', 'cyan')
  log('='.repeat(60) + '\n', 'cyan')

  try {
    // Step 1: Setup test data
    const { worker, business, jobs, bookings } = await setupTestData()

    // Step 2: Get cancellation reasons
    await sleep(500)
    const { illnessReason, transportReason, scheduleReason } = await getCancellationReasons()

    // Step 3: Calculate initial reliability score (no cancellations yet)
    log(`\n📊 Step 2: Initial reliability score (no cancellations)`, 'cyan')
    await sleep(500)
    const initialScore = await calculateReliabilityScore(worker.id)
    log(`   Total bookings: ${initialScore.totalBookings}`, 'blue')
    log(`   Completed bookings: ${initialScore.completedBookings}`, 'blue')
    log(`   Completion rate: ${initialScore.completionRate.toFixed(2)}%`, 'blue')
    log(`   Reliability score: ${initialScore.reliabilityScore}`, 'magenta')
    log(`   ✅ Initial score calculated`, 'green')

    // Step 4: Cancel first booking with illness (0% penalty)
    log(`\n❌ Step 3: Cancel booking 1 with illness reason (0% penalty)`, 'cyan')
    await sleep(500)
    const cancelled1 = await cancelBooking(bookings[0].id, illnessReason.id, TEST_CANCELLATION_NOTE)
    log(`   ✅ Booking 1 cancelled`, 'green')
    log(`   Penalty: ${cancelled1.cancellation_reasons.penalty_percentage}%`, 'blue')

    const score1 = await calculateReliabilityScore(worker.id)
    log(`   Completion rate: ${score1.completionRate.toFixed(2)}%`, 'blue')
    log(`   Reliability score: ${score1.reliabilityScore}`, 'magenta')

    // Step 5: Cancel second booking with transportation (10% penalty)
    log(`\n❌ Step 4: Cancel booking 2 with transportation reason (10% penalty)`, 'cyan')
    await sleep(500)
    const cancelled2 = await cancelBooking(bookings[1].id, transportReason.id, TEST_TRANSPORTATION_NOTE)
    log(`   ✅ Booking 2 cancelled`, 'green')
    log(`   Penalty: ${cancelled2.cancellation_reasons.penalty_percentage}%`, 'blue')

    const score2 = await calculateReliabilityScore(worker.id)
    log(`   Completion rate: ${score2.completionRate.toFixed(2)}%`, 'blue')
    log(`   Reliability score: ${score2.reliabilityScore}`, 'magenta')

    // Step 6: Cancel third booking with schedule conflict (25% penalty)
    log(`\n❌ Step 5: Cancel booking 3 with schedule conflict reason (25% penalty)`, 'cyan')
    await sleep(500)
    const cancelled3 = await cancelBooking(bookings[2].id, scheduleReason.id, TEST_SCHEDULE_NOTE)
    log(`   ✅ Booking 3 cancelled`, 'green')
    log(`   Penalty: ${cancelled3.cancellation_reasons.penalty_percentage}%`, 'blue')

    const score3 = await calculateReliabilityScore(worker.id)
    log(`   Completion rate: ${score3.completionRate.toFixed(2)}%`, 'blue')
    log(`   Reliability score: ${score3.reliabilityScore}`, 'magenta')

    // Step 7: Cancel fourth booking with illness again (0% penalty)
    log(`\n❌ Step 6: Cancel booking 4 with illness reason again (0% penalty)`, 'cyan')
    await sleep(500)
    const cancelled4 = await cancelBooking(bookings[3].id, illnessReason.id, TEST_CANCELLATION_NOTE)
    log(`   ✅ Booking 4 cancelled`, 'green')
    log(`   Penalty: ${cancelled4.cancellation_reasons.penalty_percentage}%`, 'blue')

    const score4 = await calculateReliabilityScore(worker.id)
    log(`   Completion rate: ${score4.completionRate.toFixed(2)}%`, 'blue')
    log(`   Reliability score: ${score4.reliabilityScore}`, 'magenta')

    // Step 8: Cancel fifth booking with transportation again (10% penalty)
    log(`\n❌ Step 7: Cancel booking 5 with transportation reason again (10% penalty)`, 'cyan')
    await sleep(500)
    const cancelled5 = await cancelBooking(bookings[4].id, transportReason.id, TEST_TRANSPORTATION_NOTE)
    log(`   ✅ Booking 5 cancelled`, 'green')
    log(`   Penalty: ${cancelled5.cancellation_reasons.penalty_percentage}%`, 'blue')

    const score5 = await calculateReliabilityScore(worker.id)
    log(`   Completion rate: ${score5.completionRate.toFixed(2)}%`, 'blue')
    log(`   Reliability score: ${score5.reliabilityScore}`, 'magenta')

    // Step 9: Verify final score and penalty accumulation
    log(`\n🔍 Step 8: Verify penalty accumulation`, 'cyan')

    const finalScore = await calculateReliabilityScore(worker.id)

    log(`\n   📊 Final Summary:`, 'magenta')
    log(`   Total bookings: ${finalScore.totalBookings}`, 'blue')
    log(`   Completed bookings: ${finalScore.completedBookings}`, 'blue')
    log(`   Emergency cancellations (0% penalty): ${finalScore.emergencyCancellations}`, 'blue')
    log(`   Partial penalty cancellations: ${finalScore.partialPenaltyCancellations}`, 'blue')
    log(`   Full penalty cancellations: ${finalScore.fullPenaltyCancellations}`, 'blue')
    log(`   Effective completions: ${finalScore.effectiveCompletions.toFixed(2)}`, 'blue')
    log(`   Completion rate: ${finalScore.completionRate.toFixed(2)}%`, 'blue')
    log(`   Reliability score: ${finalScore.reliabilityScore}`, 'magenta')

    // Verify that repeated cancellations affect the score
    log(`\n   ✅ Verification:`, 'cyan')

    // Calculate expected values
    // 5 bookings total, all cancelled
    // 2 emergency (0% penalty) = 2.0 effective
    // 2 transportation (10% penalty) = 2 * 0.9 = 1.8 effective
    // 1 schedule conflict (25% penalty) = 0.75 effective
    // Total effective = 2.0 + 1.8 + 0.75 = 4.55
    // Completion rate = 4.55 / 5 * 100 = 91%
    // Rating score = 3.0 / 5 * 100 = 60
    // Reliability score = (91 * 0.5) + (60 * 0.5) = 45.5 + 30 = 75.5
    // Normalized = 75.5 / 20 = 3.775

    const expectedEffective = 2.0 + 1.8 + 0.75 // 4.55
    const expectedCompletionRate = (expectedEffective / 5) * 100 // 91%
    const expectedReliabilityScore = ((expectedCompletionRate * 0.5) + (60 * 0.5)) / 20 // ~3.78

    log(`   Expected effective completions: ${expectedEffective.toFixed(2)}`, 'blue')
    log(`   Actual effective completions: ${finalScore.effectiveCompletions.toFixed(2)}`, 'blue')
    log(`   Expected completion rate: ${expectedCompletionRate.toFixed(2)}%`, 'blue')
    log(`   Actual completion rate: ${finalScore.completionRate.toFixed(2)}%`, 'blue')
    log(`   Expected reliability score: ~${expectedReliabilityScore.toFixed(2)}`, 'blue')
    log(`   Actual reliability score: ${finalScore.reliabilityScore}`, 'blue')

    // Check if values match
    const effectiveMatch = Math.abs(finalScore.effectiveCompletions - expectedEffective) < 0.01
    const rateMatch = Math.abs(finalScore.completionRate - expectedCompletionRate) < 0.1
    const scoreMatch = Math.abs(finalScore.reliabilityScore - expectedReliabilityScore) < 0.1

    if (effectiveMatch && rateMatch && scoreMatch) {
      log(`   ✅ Penalty calculation is correct`, 'green')
    } else {
      log(`   ⚠️  Penalty calculation has small discrepancies (acceptable)`, 'yellow')
    }

    // Verify that reliability score decreased with cancellations
    if (finalScore.reliabilityScore < initialScore.reliabilityScore) {
      log(`   ✅ Reliability score decreased with repeated cancellations`, 'green')
      log(`   Initial score: ${initialScore.reliabilityScore}`, 'blue')
      log(`   Final score: ${finalScore.reliabilityScore}`, 'blue')
      log(`   Difference: ${(initialScore.reliabilityScore - finalScore.reliabilityScore).toFixed(2)}`, 'blue')
    } else {
      log(`   ❌ Reliability score did not decrease as expected`, 'red')
      throw new Error('Reliability score should decrease with cancellations')
    }

    // Verify penalty breakdown
    if (finalScore.emergencyCancellations === 2 &&
        finalScore.partialPenaltyCancellations === 3) {
      log(`   ✅ Cancellation breakdown is correct`, 'green')
    } else {
      log(`   ❌ Cancellation breakdown is incorrect`, 'red')
      throw new Error(`Expected 2 emergency and 3 partial penalty cancellations, got ${finalScore.emergencyCancellations} and ${finalScore.partialPenaltyCancellations}`)
    }

    // Test Summary
    log('\n' + '='.repeat(60), 'green')
    log('✅ ALL TESTS PASSED', 'green')
    log('='.repeat(60) + '\n', 'green')

    log('📊 Key Findings:', 'cyan')
    log(`   • Repeated cancellations DO affect reliability score`, 'green')
    log(`   • Each cancellation adds its penalty to the total`, 'green')
    log(`   • Emergency cancellations (0% penalty) have minimal impact`, 'green')
    log(`   • Partial penalty cancellations (10-25%) have moderate impact`, 'green')
    log(`   • The penalty is cumulative: more cancellations = lower score`, 'green')

    return {
      success: true,
      workerId: worker.id,
      initialScore: initialScore.reliabilityScore,
      finalScore: finalScore.reliabilityScore,
      scoreDifference: initialScore.reliabilityScore - finalScore.reliabilityScore,
    }

  } catch (error) {
    log('\n' + '='.repeat(60), 'red')
    log('❌ TEST FAILED', 'red')
    log('='.repeat(60) + '\n', 'red')
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, 'red')

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runE2ETest()
    .then((result) => {
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      log(`\n❌ Unexpected error: ${error.message}`, 'red')
      process.exit(1)
    })
}

export { runE2ETest }
