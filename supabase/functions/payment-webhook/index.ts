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
      .select('id, business_id, amount, status, wallet_id')
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
    if (newStatus === 'success' && transaction.wallet_id) {
      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('id', transaction.wallet_id)
        .single()

      if (walletError || !wallet) {
        throw new Error('Wallet not found')
      }

      // Credit the wallet with the payment amount
      const newBalance = wallet.balance + transaction.amount

      const { error: creditError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.wallet_id)

      if (creditError) {
        throw new Error(`Failed to credit wallet: ${creditError.message}`)
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
