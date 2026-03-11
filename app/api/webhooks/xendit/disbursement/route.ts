/**
 * Xendit Disbursement Webhook Handler
 * 
 * Handles disbursement callbacks from Xendit payment gateway.
 * Updates payout request status and handles refunds on failure.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xenditGateway } from '@/lib/payments'

/**
 * POST /api/webhooks/xendit/disbursement
 * 
 * Handle Xendit disbursement callback
 * 
 * Headers:
 * - X-Callback-Token: Webhook verification token
 * 
 * Body:
 * - id: Disbursement ID
 * - external_id: External payout request ID
 * - status: Disbursement status (PENDING, PROCESSING, COMPLETED, FAILED)
 * - amount: Disbursement amount
 * - bank_code: Bank code
 * - account_holder_name: Account holder name
 * - completed_at: Completion timestamp (if completed)
 * - failure_reason: Failure reason (if failed)
 */
export async function POST(request: NextRequest) {
  try {
    // Get callback token from header
    const callbackToken = request.headers.get('X-Callback-Token')

    // Verify webhook signature
    if (!xenditGateway.verifyWebhookSignature(callbackToken)) {
      console.error('[Disbursement Webhook] Invalid callback token')
      return NextResponse.json(
        { error: 'Invalid callback token' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    const payload = await request.json()
    
    console.log('[Disbursement Webhook] Received callback:', {
      id: payload.id,
      external_id: payload.external_id,
      status: payload.status,
      amount: payload.amount,
    })

    // Extract relevant data
    const {
      id: disbursementId,
      external_id: externalId,
      status,
      amount,
      completed_at: completedAt,
      failure_reason: failureReason,
    } = payload

    // Map Xendit status to internal status
    const internalStatus = mapDisbursementStatus(status)

    // Process the webhook
    const result = await processDisbursementWebhook({
      disbursementId,
      externalId,
      status: internalStatus,
      amount,
      completedAt,
      failureReason,
      rawData: payload,
    })

    if (!result.success) {
      console.error('[Disbursement Webhook] Processing failed:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    console.log('[Disbursement Webhook] Processed successfully:', {
      externalId,
      status: internalStatus,
    })

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
    })

  } catch (error) {
    console.error('[Disbursement Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process the disbursement webhook payload
 */
async function processDisbursementWebhook(payload: {
  disbursementId: string
  externalId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  amount: number
  completedAt?: string
  failureReason?: string
  rawData: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Find the payout request by external ID in metadata
    const { data: payoutRequests, error: searchError } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('payment_provider', 'xendit')
      .contains('metadata', { external_id: payload.externalId })
      .limit(1)

    if (searchError) {
      console.error('[Disbursement Webhook] Search error:', searchError)
      return { success: false, error: 'Failed to search payout request' }
    }

    if (!payoutRequests || payoutRequests.length === 0) {
      console.error('[Disbursement Webhook] Payout request not found:', payload.externalId)
      return { success: false, error: 'Payout request not found' }
    }

    const payoutRequest = payoutRequests[0]

    // Skip if already completed or failed
    if (payoutRequest.status === 'completed' || payoutRequest.status === 'failed') {
      console.log('[Disbursement Webhook] Payout already processed:', payload.externalId)
      return { success: true }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: payload.status,
      provider_payout_id: payload.disbursementId,
      provider_response: payload.rawData,
      updated_at: new Date().toISOString(),
    }

    if (payload.status === 'completed' && payload.completedAt) {
      updateData.completed_at = payload.completedAt
    }

    if (payload.status === 'failed' && payload.failureReason) {
      updateData.failed_at = new Date().toISOString()
      updateData.failure_reason = payload.failureReason
    }

    // Update payout request status
    const { error: updateError } = await supabase
      .from('payout_requests')
      .update(updateData)
      .eq('id', payoutRequest.id)

    if (updateError) {
      console.error('[Disbursement Webhook] Failed to update payout request:', updateError)
      return { success: false, error: 'Failed to update payout request' }
    }

    // Handle status-specific actions
    if (payload.status === 'completed') {
      // Finalize the transaction
      await finalizeSuccessfulPayout(supabase, payoutRequest)
    } else if (payload.status === 'failed' || payload.status === 'cancelled') {
      // Refund the wallet balance
      await refundFailedPayout(supabase, payoutRequest, payload.failureReason)
    }

    return { success: true }

  } catch (error) {
    console.error('[Disbursement Webhook] Processing error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Finalize a successful payout
 */
async function finalizeSuccessfulPayout(
  supabase: any,
  payoutRequest: any
): Promise<void> {
  try {
    // Update wallet transaction status
    await supabase
      .from('wallet_transactions')
      .update({ status: 'paid' })
      .eq('reference_id', payoutRequest.id)

    console.log('[Disbursement Webhook] Payout finalized:', payoutRequest.id)
  } catch (error) {
    console.error('[Disbursement Webhook] Error finalizing payout:', error)
  }
}

/**
 * Refund a failed payout
 */
async function refundFailedPayout(
  supabase: any,
  payoutRequest: any,
  failureReason?: string
): Promise<void> {
  try {
    // Get worker's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('worker_id', payoutRequest.worker_id)
      .single()

    if (walletError || !wallet) {
      console.error('[Disbursement Webhook] Wallet not found for refund')
      return
    }

    // Refund the full amount (including fee)
    const { error: refundError } = await supabase
      .from('wallets')
      .update({
        balance: wallet.balance + payoutRequest.amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (refundError) {
      console.error('[Disbursement Webhook] Failed to refund wallet:', refundError)
      return
    }

    // Create refund transaction record
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'refund',
        status: 'paid',
        amount: payoutRequest.amount,
        description: `Refund for failed withdrawal - ${failureReason || 'Disbursement failed'}`,
        reference_id: payoutRequest.id,
      })

    // Update original transaction as refunded
    await supabase
      .from('wallet_transactions')
      .update({ status: 'refunded' })
      .eq('reference_id', payoutRequest.id)
      .eq('type', 'payout')

    console.log('[Disbursement Webhook] Payout refunded:', payoutRequest.id)
  } catch (error) {
    console.error('[Disbursement Webhook] Error refunding payout:', error)
  }
}

/**
 * Map Xendit disbursement status to internal status
 */
function mapDisbursementStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'> = {
    'PENDING': 'pending',
    'PROCESSING': 'processing',
    'COMPLETED': 'completed',
    'FAILED': 'failed',
    'CANCELLED': 'cancelled',
  }

  return statusMap[status] || 'pending'
}

/**
 * GET /api/webhooks/xendit/disbursement
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    provider: 'xendit',
    endpoint: 'disbursement',
    timestamp: new Date().toISOString(),
  })
}
