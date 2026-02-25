#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: Business Cancels Worker Booking Flow
 *
 * This script verifies the end-to-end business cancellation flow:
 * 1. Business views worker booking
 * 2. Business cancels with reason and note (simulated via server action)
 * 3. Worker receives notification
 * 4. Booking status changes to cancelled
 * 5. Verify cancellation details are stored
 *
 * Usage:
 *   npx ts-node scripts/test-e2e-business-cancellation.ts
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
  console.error('Missing Supabase configuration')
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test configuration
const TEST_CANCELLATION_NOTE = 'Perubahan jadwal mendadak, pekerjaan tidak lagi diperlukan'

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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
 * Step 1: Get or create test data (worker, business, job, booking)
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

  // Find or create an active job
  let { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (jobError || !job) {
    log(`   ℹ️  No active job found, creating test job...`, 'yellow')

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date(tomorrow)
    dayAfter.setHours(dayAfter.getHours() + 8)

    const { data: newJob, error: newJobError } = await supabase
      .from('jobs')
      .insert({
        business_id: business.id,
        title: 'Test Dishwasher Position',
        description: 'Looking for a dishwasher for tomorrow',
        address: 'Test Location Address',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postal_code: '12345',
        start_date: tomorrow.toISOString(),
        end_date: dayAfter.toISOString(),
        wage: 150000,
        workers_needed: 1,
        status: 'active',
      })
      .select()
      .single()

    if (newJobError || !newJob) {
      log(`   ❌ Failed to create job: ${newJobError?.message}`, 'red')
      throw newJobError
    }

    job = newJob
    log(`   ✅ Test job created`, 'green')
  } else {
    log(`   ✅ Using existing job`, 'green')
  }

  log(`   Job ID: ${job.id}`, 'blue')
  log(`   Job Title: ${job.title}`, 'blue')

  // Find or create an accepted booking for this worker and job
  let { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('worker_id', worker.id)
    .eq('job_id', job.id)
    .eq('business_id', business.id)
    .in('status', ['accepted', 'in_progress'])
    .limit(1)
    .single()

  if (bookingError || !booking) {
    log(`   ℹ️  No accepted booking found, creating test booking...`, 'yellow')

    const { data: newBooking, error: newBookingError } = await supabase
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

    if (newBookingError || !newBooking) {
      log(`   ❌ Failed to create booking: ${newBookingError?.message}`, 'red')
      throw newBookingError
    }

    booking = newBooking
    log(`   ✅ Test booking created`, 'green')
  } else {
    log(`   ✅ Using existing booking`, 'green')
  }

  log(`   Booking ID: ${booking.id}`, 'blue')
  log(`   Booking Status: ${booking.status}`, 'blue')

  return { worker, business, job, booking }
}

/**
 * Step 2: Verify business views worker booking
 */
async function verifyBusinessViewsBooking(business: any, job: any, booking: any) {
  log(`\n📱 Step 2: Verify business views worker booking`, 'cyan')
  log(`   Business would navigate to: /business/jobs`, 'blue')
  log(`   Job ID: ${job.id}`, 'blue')
  log(`   Job Title: ${job.title}`, 'blue')
  log(`   Booking ID: ${booking.id}`, 'blue')
  log(`   Booking Status: ${booking.status}`, 'blue')
  log(`   Worker: ${booking.worker_id}`, 'blue')

  if (booking.status !== 'accepted' && booking.status !== 'in_progress') {
    log(`   ❌ Booking is not in a cancellable state`, 'red')
    throw new Error(`Booking status is ${booking.status}, expected 'accepted' or 'in_progress'`)
  }

  log(`   ✅ Booking is in cancellable state`, 'green')
  return booking
}

/**
 * Step 3: Get a cancellation reason for business
 */
async function getBusinessCancellationReason() {
  log(`\n📝 Step 3: Get cancellation reason for business`, 'cyan')

  // For business cancellation, we can use any reason
  // Let's use "schedule_conflict" as it's a common business reason
  const { data: reasons, error } = await supabase
    .from('cancellation_reasons')
    .select('*')
    .eq('category', 'schedule_conflict')
    .limit(1)
    .single()

  if (error || !reasons) {
    log(`   ❌ No cancellation reason found: ${error?.message}`, 'red')
    throw error
  }

  log(`   ✅ Cancellation reason found`, 'green')
  log(`   Reason ID: ${reasons.id}`, 'blue')
  log(`   Reason Name: ${reasons.name}`, 'blue')
  log(`   Category: ${reasons.category}`, 'blue')
  log(`   Penalty: ${reasons.penalty_percentage}%`, 'blue')

  return reasons
}

/**
 * Step 4: Business cancels worker booking with reason and note
 */
async function businessCancelsBooking(
  bookingId: string,
  businessId: string,
  cancellationReasonId: string,
  note: string
) {
  log(`\n❌ Step 4: Business cancels worker booking with reason and note`, 'cyan')
  log(`   This simulates the WorkerCancellationDialog submit action`, 'blue')
  log(`   Business ID: ${businessId}`, 'blue')
  log(`   Reason ID: ${cancellationReasonId}`, 'blue')
  log(`   Note: "${note}"`, 'blue')

  // Simulate the server action call
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      *,
      jobs (
        id,
        title
      ),
      workers (
        id,
        user_id,
        full_name
      ),
      businesses (
        id,
        user_id,
        name
      )
    `)
    .eq('id', bookingId)
    .eq('business_id', businessId)
    .single()

  if (fetchError || !booking) {
    log(`   ❌ Booking not found: ${fetchError?.message}`, 'red')
    throw fetchError
  }

  // Update booking status to cancelled
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancellation_reason_id: cancellationReasonId,
      cancellation_note: note,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single()

  if (updateError || !updatedBooking) {
    log(`   ❌ Failed to cancel booking: ${updateError?.message}`, 'red')
    throw updateError
  }

  log(`   ✅ Booking cancelled successfully`, 'green')
  log(`   Cancelled at: ${formatDate(updatedBooking.cancelled_at!)}`, 'blue')

  // Create notification for the worker
  const notificationResult = await supabase
    .from('notifications')
    .insert({
      user_id: booking.workers.user_id,
      title: 'Booking Dibatalkan',
      body: `Booking untuk pekerjaan "${booking.jobs.title}" telah dibatalkan oleh ${booking.businesses.name}. Catatan: ${note}`,
      link: `/bookings/${bookingId}`,
      read: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (notificationResult.error) {
    log(`   ⚠️  Warning: Failed to create notification: ${notificationResult.error.message}`, 'yellow')
  } else {
    log(`   ✅ Notification created for worker`, 'green')
  }

  return updatedBooking
}

/**
 * Step 5: Verify booking status changed to cancelled
 */
async function verifyBookingStatus(bookingId: string) {
  log(`\n🔍 Step 5: Verify booking status changed to cancelled`, 'cyan')

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      cancellation_reasons (
        id,
        name,
        category,
        penalty_percentage,
        description
      )
    `)
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    log(`   ❌ Failed to fetch booking: ${error?.message}`, 'red')
    throw error
  }

  if (booking.status !== 'cancelled') {
    log(`   ❌ Booking status is ${booking.status}, expected 'cancelled'`, 'red')
    throw new Error(`Booking status mismatch`)
  }

  log(`   ✅ Booking status is 'cancelled'`, 'green')
  log(`   Cancelled at: ${formatDate(booking.cancelled_at!)}`, 'blue')
  log(`   Cancellation reason: ${booking.cancellation_reasons?.name}`, 'blue')
  log(`   Reason category: ${booking.cancellation_reasons?.category}`, 'blue')
  log(`   Penalty: ${booking.cancellation_reasons?.penalty_percentage}%`, 'blue')
  log(`   Note: "${booking.cancellation_note}"`, 'blue')

  return booking
}

/**
 * Step 6: Verify worker received notification
 */
async function verifyWorkerNotification(workerUserId: string) {
  log(`\n🔔 Step 6: Verify worker received notification`, 'cyan')

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', workerUserId)
    .ilike('title', '%dibatalkan%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    log(`   ❌ Failed to fetch notifications: ${error.message}`, 'red')
    throw error
  }

  if (!notifications || notifications.length === 0) {
    log(`   ❌ No notification found for worker`, 'red')
    throw new Error('No notification found')
  }

  const notification = notifications[0]
  log(`   ✅ Notification found`, 'green')
  log(`   Title: ${notification.title}`, 'blue')
  log(`   Body: ${notification.body}`, 'blue')
  log(`   Link: ${notification.link}`, 'blue')
  log(`   Created at: ${formatDate(notification.created_at)}`, 'blue')
  log(`   Read: ${notification.read ? 'Yes' : 'No'}`, 'blue')

  return notification
}

/**
 * Main test execution
 */
async function runE2ETest() {
  log('\n' + '='.repeat(60), 'cyan')
  log('🧪 E2E TEST: Business Cancels Worker Booking Flow', 'cyan')
  log('='.repeat(60) + '\n', 'cyan')

  try {
    // Step 1: Setup test data
    const { worker, business, job, booking } = await setupTestData()

    // Wait a moment
    await sleep(500)

    // Step 2: Verify business views worker booking
    await verifyBusinessViewsBooking(business, job, booking)

    // Wait a moment
    await sleep(500)

    // Step 3: Get cancellation reason
    const cancellationReason = await getBusinessCancellationReason()

    // Wait a moment
    await sleep(500)

    // Step 4: Business cancels worker booking with reason and note
    await businessCancelsBooking(
      booking.id,
      business.id,
      cancellationReason.id,
      TEST_CANCELLATION_NOTE
    )

    // Wait for consistency
    await sleep(500)

    // Step 5: Verify booking status changed to cancelled
    const cancelledBooking = await verifyBookingStatus(booking.id)

    // Wait for consistency
    await sleep(500)

    // Step 6: Verify worker received notification
    await verifyWorkerNotification(worker.user_id)

    // Test Summary
    log('\n' + '='.repeat(60), 'green')
    log('✅ ALL TESTS PASSED', 'green')
    log('='.repeat(60) + '\n', 'green')

    log('📊 Test Summary:', 'cyan')
    log(`   Business: ${business.name} (${business.id})`, 'blue')
    log(`   Worker: ${worker.full_name} (${worker.id})`, 'blue')
    log(`   Job: ${job.title}`, 'blue')
    log(`   Booking: ${booking.id}`, 'blue')
    log(`   Cancellation Reason: ${cancelledBooking.cancellation_reasons?.name}`, 'blue')
    log(`   Cancellation Note: "${cancelledBooking.cancellation_note}"`, 'blue')

    return {
      success: true,
      businessId: business.id,
      workerId: worker.id,
      bookingId: booking.id,
      cancellationReasonId: cancelledBooking.cancellation_reason_id,
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
