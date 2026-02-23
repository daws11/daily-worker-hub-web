// ============================================================================
// Send Push Notification Edge Function
// ============================================================================
// Sends push notifications to a single subscription using Web Push API:
// - Validates subscription data
// - Sends push notification with VAPID authentication
// - Handles invalid/expired subscriptions
// - Returns detailed success/error response
//
// POST /functions/v1/send-push-notification
// Headers: authorization (Bearer token for service role)
// Body: {
//   subscription: {
//     endpoint: string,
//     keys: { p256dh: string, auth: string }
//   },
//   notification: {
//     title: string,
//     body: string,
//     icon?: string,
//     badge?: string,
//     image?: string,
//     data?: any
//   }
// }
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request payload
    const payload = await req.json()

    // Validate required fields
    if (!payload.subscription || !payload.notification) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subscription, notification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { subscription, notification } = payload

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription: missing endpoint or keys' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription keys: missing p256dh or auth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate notification object
    if (!notification.title || !notification.body) {
      return new Response(
        JSON.stringify({ error: 'Invalid notification: missing title or body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configure VAPID keys
    configureVapidKeys()

    // Convert subscription to web-push format
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
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

    // Send push notification
    await webPush.sendNotification(pushSubscription, notificationPayload)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Push notification sent successfully',
        endpoint: subscription.endpoint
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Handle specific web-push errors
    if (error.statusCode === 410) {
      // Subscription is no longer valid (expired or unsubscribed)
      return new Response(
        JSON.stringify({
          error: 'Subscription expired or invalid',
          code: 'SUBSCRIPTION_EXPIRED',
          endpoint: error.endpoint
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (error.statusCode === 403 || error.statusCode === 401) {
      // Authentication/authorization error
      return new Response(
        JSON.stringify({
          error: 'VAPID authentication failed',
          code: 'AUTH_FAILED'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (error.statusCode === 400) {
      // Bad request - invalid payload
      return new Response(
        JSON.stringify({
          error: 'Invalid notification payload',
          code: 'INVALID_PAYLOAD'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generic error response
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send push notification',
        code: 'SEND_FAILED'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
