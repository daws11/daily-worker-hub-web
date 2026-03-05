/**
 * Xendit Webhook Handler
 * 
 * Handles payment callbacks from Xendit payment gateway.
 * Updates payment transaction status and wallet balance upon successful payment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xenditGateway, type WebhookPayload } from '@/lib/payments'

/**
 * POST /api/webhooks/xendit
 * 
 * Handle Xendit payment callback
 * 
 * Headers:
 * - X-Callback-Token: Webhook verification token
 * 
 * Body:
 * - id: Payment ID
 * - external_id: External transaction ID
 * - status: Payment status (PENDING, PAID, EXPIRED, FAILED)
 * - amount: Payment amount
 * - paid_at: Payment timestamp (if paid)
 * - payment_method: Payment method used
 * - payment_channel: Payment channel used
 */
export async function POST(request: NextRequest) {
  try {
    // Get callback token from header
    const callbackToken = request.headers.get('X-Callback-Token')

    // Verify webhook signature
    if (!xenditGateway.verifyWebhookSignature(callbackToken)) {
      console.error('[Xendit Webhook] Invalid callback token')
      return NextResponse.json(
        { error: 'Invalid callback token' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    const payload = await request.json()
    
    console.log('[Xendit Webhook] Received callback:', {
      id: payload.id,
      external_id: payload.external_id,
      status: payload.status,
      amount: payload.amount,
    })

    // Extract relevant data
    const {
      id: paymentId,
      external_id: transactionId,
      status,
      amount,
      paid_at: paidAt,
      payment_method: paymentMethod,
      payment_channel: paymentChannel,
      failure_reason: failureReason,
    } = payload

    // Map Xendit status to internal status
    const internalStatus = mapXenditStatus(status)

    // Create standardized webhook payload
    const webhookPayload: WebhookPayload = {
      id: paymentId,
      externalId: transactionId,
      provider: 'xendit',
      amount,
      status: internalStatus,
      paidAt,
      paymentMethod,
      paymentChannel,
      rawData: payload,
    }

    // Process the webhook
    const result = await processWebhook(webhookPayload, failureReason)

    if (!result.success) {
      console.error('[Xendit Webhook] Processing failed:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    console.log('[Xendit Webhook] Processed successfully:', {
      transactionId,
      status: internalStatus,
    })

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
    })

  } catch (error) {
    console.error('[Xendit Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process the webhook payload
 */
async function processWebhook(
  payload: WebhookPayload,
  failureReason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Find the payment transaction
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', payload.externalId)
      .single()

    if (txError || !transaction) {
      console.error('[Xendit Webhook] Transaction not found:', payload.externalId)
      return { success: false, error: 'Transaction not found' }
    }

    // Skip if already processed
    if (transaction.status === payload.status) {
      console.log('[Xendit Webhook] Transaction already processed:', payload.externalId)
      return { success: true }
    }

    // Update transaction status
    const updateData: Record<string, unknown> = {
      status: payload.status,
      provider_payment_id: payload.id,
      updated_at: new Date().toISOString(),
    }

    if (payload.paidAt) {
      updateData.paid_at = payload.paidAt
    }

    if (failureReason) {
      updateData.failure_reason = failureReason
    }

    if (payload.paymentMethod) {
      updateData.metadata = {
        ...(transaction.metadata || {}),
        payment_method: payload.paymentMethod,
        payment_channel: payload.paymentChannel,
      }
    }

    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update(updateData)
      .eq('id', transaction.id)

    if (updateError) {
      console.error('[Xendit Webhook] Failed to update transaction:', updateError)
      return { success: false, error: 'Failed to update transaction' }
    }

    // If payment is successful, credit the wallet
    if (payload.status === 'success') {
      const creditResult = await creditWallet(
        supabase,
        transaction.business_id,
        transaction.amount - (transaction.fee_amount || 0),
        transaction.id
      )

      if (!creditResult.success) {
        console.error('[Xendit Webhook] Failed to credit wallet:', creditResult.error)
        return { success: false, error: 'Failed to credit wallet' }
      }
    }

    return { success: true }

  } catch (error) {
    console.error('[Xendit Webhook] Processing error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Credit the business wallet
 */
async function creditWallet(
  supabase: any,
  businessId: string,
  amount: number,
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle()

    if (walletError) {
      return { success: false, error: 'Failed to get wallet' }
    }

    if (!wallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          business_id: businessId,
          balance: amount,
          currency: 'IDR',
          is_active: true,
        })
        .select()
        .single()

      if (createError) {
        return { success: false, error: 'Failed to create wallet' }
      }

      // Record transaction
      await recordWalletTransaction(supabase, newWallet.id, amount, transactionId, 'top_up')
      
      return { success: true }
    }

    // Update existing wallet balance
    const newBalance = wallet.balance + amount

    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (updateError) {
      return { success: false, error: 'Failed to update wallet balance' }
    }

    // Record transaction
    await recordWalletTransaction(supabase, wallet.id, amount, transactionId, 'top_up')

    return { success: true }

  } catch (error) {
    console.error('[Xendit Webhook] Credit wallet error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Record wallet transaction
 */
async function recordWalletTransaction(
  supabase: any,
  walletId: string,
  amount: number,
  referenceId: string,
  type: 'top_up' | 'payment' | 'refund' | 'payout'
): Promise<void> {
  try {
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        type,
        amount,
        reference_id: referenceId,
        description: `Payment via Xendit - ${type}`,
        created_at: new Date().toISOString(),
      })
  } catch (error) {
    // Log but don't fail - transaction is already complete
    console.error('[Xendit Webhook] Failed to record wallet transaction:', error)
  }
}

/**
 * Map Xendit status to internal status
 */
function mapXenditStatus(status: string): 'pending' | 'success' | 'failed' | 'expired' | 'cancelled' {
  const statusMap: Record<string, 'pending' | 'success' | 'failed' | 'expired' | 'cancelled'> = {
    'PENDING': 'pending',
    'PAID': 'success',
    'COMPLETED': 'success',
    'EXPIRED': 'expired',
    'CANCELLED': 'cancelled',
    'FAILED': 'failed',
  }

  return statusMap[status] || 'pending'
}

/**
 * GET /api/webhooks/xendit
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    provider: 'xendit',
    timestamp: new Date().toISOString(),
  })
}
