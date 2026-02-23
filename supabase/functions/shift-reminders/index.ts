// ============================================================================
// Shift Reminders Edge Function
// ============================================================================
// Sends push notifications to workers for upcoming shifts:
// - Queries bookings with start_date within next 2 hours
// - Filters by status (accepted or in_progress)
// - Checks worker notification preferences (shift_reminders)
// - Sends push notifications via Web Push API
// - Handles expired subscriptions gracefully
//
// POST /functions/v1/shift-reminders
// Body: {} (no parameters required, runs on schedule)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import webPush from 'https://esm.sh/web-push@3.6.6'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configure VAPID keys
function configureVapidKeys() {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@dailworkerhub.com'

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('Kunci VAPID tidak dikonfigurasi')
  }

  webPush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  )
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Metode tidak diizinkan' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Configure VAPID keys
    configureVapidKeys()

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0]

    // Get current time for window calculation
    // We want bookings starting within the next 2 hours
    const now = new Date()
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    // Query bookings starting today that are in accepted or in_progress status
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        worker_id,
        start_date,
        status,
        jobs (
          id,
          title
        )
      `)
      .in('status', ['accepted', 'in_progress'])
      .gte('start_date', today)
      .lte('start_date', twoHoursFromNow.toISOString().split('T')[0])

    if (bookingsError) {
      throw new Error(`Gagal mengambil data booking: ${bookingsError.message}`)
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tidak ada shift yang akan datang dalam 2 jam ke depan',
          total_bookings: 0,
          notifications_sent: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get unique worker IDs from bookings
    const workerIds = [...new Set(bookings.map(b => b.worker_id))]

    // Get user IDs for workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, user_id')
      .in('id', workerIds)

    if (workersError) {
      throw new Error(`Gagal mengambil data pekerja: ${workersError.message}`)
    }

    // Map worker_id to user_id
    const workerToUserMap: Record<string, string> = {}
    for (const worker of workers || []) {
      workerToUserMap[worker.id] = worker.user_id
    }

    // Get push subscriptions for these users with shift_reminders enabled
    const userIds = Object.values(workerToUserMap)

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select(`
        id,
        user_id,
        endpoint,
        keys_p256h,
        keys_auth,
        user_notification_preferences (
          push_enabled,
          shift_reminders
        )
      `)
      .in('user_id', userIds)

    if (subscriptionsError) {
      throw new Error(`Gagal mengambil data langganan: ${subscriptionsError.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tidak ada langganan push notification untuk pekerja yang terpengaruh',
          total_bookings: bookings.length,
          notifications_sent: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter subscriptions by shift_reminders preference
    const eligibleSubscriptions = subscriptions.filter(sub =>
      sub.user_notification_preferences &&
      sub.user_notification_preferences.push_enabled &&
      sub.user_notification_preferences.shift_reminders
    )

    if (eligibleSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tidak ada pekerja yang mengaktifkan pengingat shift',
          total_bookings: bookings.length,
          notifications_sent: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group bookings by worker
    const bookingsByWorker: Record<string, typeof bookings> = {}
    for (const booking of bookings) {
      if (!bookingsByWorker[booking.worker_id]) {
        bookingsByWorker[booking.worker_id] = []
      }
      bookingsByWorker[booking.worker_id].push(booking)
    }

    // Send notifications
    const results = []
    let sentCount = 0
    let failedCount = 0
    const expiredSubscriptions = []

    for (const subscription of eligibleSubscriptions) {
      try {
        // Validate subscription data
        if (!subscription.endpoint || !subscription.keys_p256h || !subscription.keys_auth) {
          failedCount++
          results.push({
            user_id: subscription.user_id,
            status: 'failed',
            error: 'Data langganan tidak lengkap'
          })
          continue
        }

        // Get bookings for this user
        const workerId = Object.keys(workerToUserMap).find(
          key => workerToUserMap[key] === subscription.user_id
        )

        if (!workerId || !bookingsByWorker[workerId]) {
          continue
        }

        const userBookings = bookingsByWorker[workerId]

        // Create notification message based on number of upcoming shifts
        let title = 'Pengingat Shift'
        let body = ''

        if (userBookings.length === 1) {
          const booking = userBookings[0]
          const jobTitle = booking.jobs?.title || 'Pekerjaan'
          body = `Anda memiliki shift "${jobTitle}" yang akan dimulai dalam 2 jam ke depan.`
        } else {
          body = `Anda memiliki ${userBookings.length} shift yang akan dimulai dalam 2 jam ke depan.`
        }

        // Prepare notification payload
        const notificationPayload = JSON.stringify({
          title,
          body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            type: 'shift_reminder',
            bookings: userBookings.map(b => ({
              id: b.id,
              job_id: b.jobs?.id,
              job_title: b.jobs?.title,
              start_date: b.start_date
            }))
          }
        })

        // Convert subscription to web-push format
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys_p256h,
            auth: subscription.keys_auth
          }
        }

        // Send push notification
        await webPush.sendNotification(pushSubscription, notificationPayload)

        // Create in-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: subscription.user_id,
            title,
            body,
            link: '/dashboard-jobs',
            is_read: false
          })

        sentCount++
        results.push({
          user_id: subscription.user_id,
          status: 'sent',
          bookings_count: userBookings.length
        })

      } catch (error) {
        failedCount++
        const result = {
          user_id: subscription.user_id,
          status: 'failed',
          error: error.message || 'Gagal mengirim notifikasi'
        }

        // Track expired subscriptions for cleanup
        if (error.statusCode === 410) {
          expiredSubscriptions.push(subscription.id)
          result.error = 'Langganan kadaluarsa'
          result.code = 'SUBSCRIPTION_EXPIRED'
        }

        results.push(result)
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptions)
    }

    // Return summary response
    return new Response(
      JSON.stringify({
        success: true,
        message: `${sentCount} notifikasi pengingat shift dikirim`,
        total_bookings: bookings.length,
        total_workers: workerIds.length,
        notifications_sent: sentCount,
        failed: failedCount,
        expired_cleaned: expiredSubscriptions.length,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Terjadi kesalahan internal',
        code: 'SHIFT_REMINDERS_FAILED'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
