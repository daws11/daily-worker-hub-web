// ============================================================================
// Payment Webhook Edge Function
// ============================================================================
// Handles payment webhooks from Xendit for QRIS transactions:
// - Verifies webhook signature for security
// - Updates payment transaction status
// - Credits business wallet when payment succeeds
// - Handles failed and expired payments
//
// POST /functions/v1/payment-webhook
// Headers: X-Callback-Token (for webhook verification)
// Body: Xendit payment callback payload
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import webPush from 'https://esm.sh/web-push@3.6.6'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Xendit webhook status to internal status mapping
function mapPaymentStatus(xenditStatus: string): 'pending' | 'success' | 'failed' | 'expired' {
  const statusMap: Record<string, 'pending' | 'success' | 'failed' | 'expired'> = {
    'PENDING': 'pending',
    'COMPLETED': 'success',
    'SUCCEEDED': 'success',
    'FAILED': 'failed',
    'EXPIRED': 'expired',
  }

  return statusMap[xenditStatus.toUpperCase()] || 'pending'
}

// Configure VAPID keys for push notifications
function configureVapidKeys() {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@dailworkerhub.com'

  if (vapidPublicKey && vapidPrivateKey) {
    webPush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    )
  }
}

/**
 * Send push notification to a user if they have payment_confirmation enabled
 */
async function sendPaymentNotification(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  try {
    // Get user's notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_notification_preferences')
      .select('push_enabled, payment_confirmation')
      .eq('user_id', userId)
      .maybeSingle()

    if (prefError || !preferences || !preferences.push_enabled || !preferences.payment_confirmation) {
      // User doesn't have payment notifications enabled, skip
      return
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, keys_p256h, keys_auth')
      .eq('user_id', userId)

    if (subsError || !subscriptions || subscriptions.length === 0) {
      // No push subscriptions found
      return
    }

    // Create in-app notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        link: link || null,
        is_read: false,
      })

    // Configure VAPID
    configureVapidKeys()

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: { link }
    })

    // Send to all subscriptions
    for (const subscription of subscriptions) {
      try {
        if (!subscription.endpoint || !subscription.keys_p256h || !subscription.keys_auth) {
          continue
        }

        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys_p256h,
            auth: subscription.keys_auth
          }
        }

        await webPush.sendNotification(pushSubscription, notificationPayload)
      } catch (pushError) {
        // If subscription is expired (410), clean it up
        if (pushError.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id)
        }
        // Continue with other subscriptions
      }
    }
  } catch (error) {
    // Log error but don't fail the webhook
    console.error('Error sending payment notification:', error)
  }
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

    // Verify webhook signature
    const callbackToken = req.headers.get('X-Callback-Token')
    const webhookToken = Deno.env.get('XENDIT_WEBHOOK_TOKEN')

    if (!callbackToken || callbackToken !== webhookToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse webhook payload
    const payload = await req.json()

    // Validate required fields
    if (!payload.external_id || !payload.status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: external_id, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the payment transaction by external_id (transaction ID)
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('id, business_id, amount, status, metadata')
      .eq('id', payload.external_id)
      .single()

    if (transactionError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map Xendit status to internal status
    const newStatus = mapPaymentStatus(payload.status)

    // Check if status has changed
    if (transaction.status === newStatus) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Status already updated',
          transaction_id: transaction.id,
          status: newStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      provider_payment_id: payload.id || transaction.provider_payment_id,
      updated_at: new Date().toISOString(),
    }

    // Add status-specific fields
    if (newStatus === 'success') {
      updateData.paid_at = payload.payment_time || new Date().toISOString()
    } else if (newStatus === 'failed') {
      updateData.failure_reason = payload.failure_reason || 'Payment failed'
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update(updateData)
      .eq('id', transaction.id)

    if (updateError) {
      throw new Error(`Failed to update transaction: ${updateError.message}`)
    }

    // If payment succeeded, credit the business wallet
    if (newStatus === 'success') {
      // Get the business wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('business_id', transaction.business_id)
        .single()

      if (walletError || !wallet) {
        throw new Error('Wallet not found for business')
      }

      // Credit the wallet with the payment amount
      const newBalance = Number(wallet.balance) + Number(transaction.amount)

      const { error: creditError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)

      if (creditError) {
        throw new Error(`Failed to credit wallet: ${creditError.message}`)
      }

      // Send payment confirmation notifications
      // Get business owner's user_id
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('user_id, name')
        .eq('id', transaction.business_id)
        .single()

      if (!businessError && business) {
        const amount = Number(transaction.amount).toLocaleString('id-ID')
        const businessTitle = 'Pembayaran Berhasil'
        const businessBody = `Top-up wallet sebesar Rp ${amount} telah berhasil. Saldo Anda telah ditambahkan.`
        const businessLink = '/dashboard-business-wallet'

        // Send notification to business
        await sendPaymentNotification(
          supabase,
          business.user_id,
          businessTitle,
          businessBody,
          businessLink
        )

        // Check if this payment is related to a booking (notify worker too)
        if (transaction.metadata && transaction.metadata.booking_id) {
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('worker_id, jobs!inner(title)')
            .eq('id', transaction.metadata.booking_id)
            .single()

          if (!bookingError && booking) {
            // Get worker's user_id
            const { data: worker, error: workerError } = await supabase
              .from('workers')
              .select('user_id')
              .eq('id', booking.worker_id)
              .single()

            if (!workerError && worker) {
              const workerTitle = 'Pembayaran Diterima'
              const workerBody = `Pembayaran sebesar Rp ${amount} untuk pekerjaan "${booking.jobs.title}" telah berhasil.`
              const workerLink = '/dashboard-jobs'

              // Send notification to worker
              await sendPaymentNotification(
                supabase,
                worker.user_id,
                workerTitle,
                workerBody,
                workerLink
              )
            }
          }
        }
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment webhook processed successfully',
        transaction_id: transaction.id,
        business_id: transaction.business_id,
        amount: transaction.amount,
        status: newStatus,
        previous_status: transaction.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
