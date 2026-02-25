// ============================================================================
// Broadcast Push Notification Edge Function
// ============================================================================
// Sends push notifications to all eligible users based on notification type:
// - Queries push_subscriptions table
// - Filters by user notification preferences
// - Sends push notifications to all matching users
// - Handles invalid/expired subscriptions gracefully
// - Returns detailed summary of results
//
// POST /functions/v1/broadcast-push-notification
// Headers: authorization (Bearer token for service role)
// Body: {
//   notification: {
//     title: string,
//     body: string,
//     icon?: string,
//     badge?: string,
//     image?: string,
//     data?: any
//   },
//   notification_type?: 'new_applications' | 'booking_status' | 'payment_confirmation' | 'new_job_matches' | 'shift_reminders'
// }
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
    throw new Error('VAPID keys not configured')
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

    // Parse request payload
    const payload = await req.json()

    // Validate required fields
    if (!payload.notification) {
      return new Response(
        JSON.stringify({ error: 'Bidang wajib tidak ada: notification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { notification, notification_type } = payload

    // Validate notification object
    if (!notification.title || !notification.body) {
      return new Response(
        JSON.stringify({ error: 'Notifikasi tidak valid: judul atau isi tidak ada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Configure VAPID keys
    configureVapidKeys()

    // Build query to fetch push subscriptions with notification preferences
    let query = supabase
      .from('push_subscriptions')
      .select(`
        id,
        user_id,
        endpoint,
        keys_p256h,
        keys_auth,
        user_notification_preferences (
          push_enabled,
          new_applications,
          booking_status,
          payment_confirmation,
          new_job_matches,
          shift_reminders
        )
      `)

    // Filter by notification type if specified
    if (notification_type) {
      const preferenceMap = {
        new_applications: 'new_applications',
        booking_status: 'booking_status',
        payment_confirmation: 'payment_confirmation',
        new_job_matches: 'new_job_matches',
        shift_reminders: 'shift_reminders'
      }

      const preferenceColumn = preferenceMap[notification_type]
      if (preferenceColumn) {
        // Filter to only include users who have this notification type enabled
        query = query.filter('user_notification_preferences.push_enabled', 'eq', true)
          .filter(`user_notification_preferences.${preferenceColumn}`, 'eq', true)
      }
    }

    const { data: subscriptions, error: subscriptionsError } = await query

    if (subscriptionsError) {
      throw new Error(`Gagal mengambil data langganan: ${subscriptionsError.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tidak ada langganan yang memenuhi syarat',
          total_subscriptions: 0,
          sent: 0,
          failed: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/badge-72x72.png',
      image: notification.image,
      data: notification.data || {}
    })

    // Send push notifications to all eligible subscriptions
    const results = []
    let sentCount = 0
    let failedCount = 0
    const expiredSubscriptions = []

    for (const subscription of subscriptions) {
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

        sentCount++
        results.push({
          user_id: subscription.user_id,
          status: 'sent'
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
        message: `Notifikasi dikirim ke ${sentCount} pengguna`,
        total_subscriptions: subscriptions.length,
        sent: sentCount,
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
        code: 'BROADCAST_FAILED'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
