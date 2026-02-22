// ============================================================================
// Payout Webhook Edge Function
// ============================================================================
// Handles payout webhooks from Xendit for disbursement transactions:
// - Verifies webhook signature for security
// - Updates payout request status
// - Refunds worker wallet when payout fails
// - Handles failed and cancelled payouts
//
// POST /functions/v1/payout-webhook
// Headers: X-Callback-Token (for webhook verification)
// Body: Xendit payout callback payload
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Xendit webhook status to internal status mapping
function mapPayoutStatus(xenditStatus: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'> = {
    'PENDING': 'pending',
    'PROCESSING': 'processing',
    'COMPLETED': 'completed',
    'SUCCEEDED': 'completed',
    'FAILED': 'failed',
    'REJECTED': 'failed',
    'CANCELLED': 'cancelled',
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

    // Find the payout request by external_id (payout request ID)
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .select('id, worker_id, amount, status, fee_amount, net_amount')
      .eq('id', payload.external_id)
      .single()

    if (payoutError || !payoutRequest) {
      return new Response(
        JSON.stringify({ error: 'Payout request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map Xendit status to internal status
    const newStatus = mapPayoutStatus(payload.status)

    // Check if status has changed
    if (payoutRequest.status === newStatus) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Status already updated',
          payout_request_id: payoutRequest.id,
          status: newStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      provider_payout_id: payload.id || payoutRequest.provider_payout_id,
      updated_at: new Date().toISOString(),
    }

    // Add status-specific fields and timestamps
    if (newStatus === 'processing') {
      updateData.processed_at = payload.started_at || new Date().toISOString()
    } else if (newStatus === 'completed') {
      updateData.completed_at = payload.completed_at || new Date().toISOString()
    } else if (newStatus === 'failed' || newStatus === 'cancelled') {
      updateData.failed_at = payload.failed_at || new Date().toISOString()
      updateData.failure_reason = payload.failure_reason || payload.errors?.[0]?.message || 'Payout failed'
    }

    // Update payout request status
    const { error: updateError } = await supabase
      .from('payout_requests')
      .update(updateData)
      .eq('id', payoutRequest.id)

    if (updateError) {
      throw new Error(`Failed to update payout request: ${updateError.message}`)
    }

    // If payout failed or was cancelled, refund the worker wallet
    // The wallet was debited when the payout request was created
    if ((newStatus === 'failed' || newStatus === 'cancelled') && payoutRequest.status !== 'failed' && payoutRequest.status !== 'cancelled') {
      // Get the worker's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('worker_id', payoutRequest.worker_id)
        .single()

      if (walletError || !wallet) {
        throw new Error('Worker wallet not found')
      }

      // Refund the full amount (amount, not net_amount, to refund the fee too)
      const refundAmount = payoutRequest.amount

      // Credit the wallet with the refund amount
      const newBalance = wallet.balance + refundAmount

      const { error: refundError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)

      if (refundError) {
        throw new Error(`Failed to refund wallet: ${refundError.message}`)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout webhook processed successfully',
        payout_request_id: payoutRequest.id,
        worker_id: payoutRequest.worker_id,
        amount: payoutRequest.amount,
        net_amount: payoutRequest.net_amount,
        status: newStatus,
        previous_status: payoutRequest.status,
        refunded: (newStatus === 'failed' || newStatus === 'cancelled') ? payoutRequest.amount : 0,
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
