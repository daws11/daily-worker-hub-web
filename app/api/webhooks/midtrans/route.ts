/**
 * Midtrans Webhook Handler
 * 
 * Handles payment callbacks from Midtrans payment gateway.
 * Updates payment transaction status and wallet balance upon successful payment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { midtransGateway, type WebhookPayload } from '@/lib/payments'

/**
 * Midtrans webhook notification payload
 */
interface MidtransNotification {
  transaction_id: string
  order_id: string
  gross_amount: string
  currency: string
  payment_type: string
  transaction_time: string
  transaction_status: 'pending' | 'capture' | 'settlement' | 'deny' | 'cancel' | 'expire' | 'failure'
  fraud_status?: 'accept' | 'challenge' | 'deny'
  status_code: string
  status_message: string
  va_numbers?: Array<{
    bank: string
    va_number: string
  }>
  permata_va_number?: string
  bill_key?: string
  biller_code?: string
  qr_string?: string
  settlement_time?: string
  expiry_time?: string
  signature_key: string
}

/**
 * POST /api/webhooks/midtrans
 * 
 * Handle Midtrans payment notification
 * 
 * Headers:
 * - Content-Type: application/json
 * 
 * Body:
 * - transaction_id: Midtrans transaction ID
 * - order_id: External order ID
 * - gross_amount: Payment amount
 * - transaction_status: Payment status
 * - fraud_status: Fraud check status (for card payments)
 * - signature_key: SHA-512 signature for verification
 */
export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload
    const payload: MidtransNotification = await request.json()
    
    console.log('[Midtrans Webhook] Received notification:', {
      transaction_id: payload.transaction_id,
      order_id: payload.order_id,
      transaction_status: payload.transaction_status,
      fraud_status: payload.fraud_status,
      gross_amount: payload.gross_amount,
    })

    // Verify webhook signature
    const isValidSignature = midtransGateway.verifyWebhookSignature(
      payload.signature_key,
      payload.order_id,
      payload.status_code,
      payload.gross_amount
    )

    if (!isValidSignature) {
      console.error('[Midtrans Webhook] Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Map Midtrans status to internal status
    const internalStatus = mapMidtransStatus(
      payload.transaction_status,
      payload.fraud_status
    )

    // Create standardized webhook payload
    const webhookPayload: WebhookPayload = {
      id: payload.transaction_id,
      externalId: payload.order_id,
      provider: 'midtrans',
      amount: Number(payload.gross_amount),
      status: internalStatus,
      paidAt: payload.settlement_time,
      paymentMethod: payload.payment_type,
      paymentChannel: payload.va_numbers?.[0]?.bank || payload.payment_type,
      rawData: payload,
    }

    // Process the webhook
    const result = await processWebhook(webhookPayload, payload)

    if (!result.success) {
      console.error('[Midtrans Webhook] Processing failed:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    console.log('[Midtrans Webhook] Processed successfully:', {
      orderId: payload.order_id,
      status: internalStatus,
    })

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
    })

  } catch (error) {
    console.error('[Midtrans Webhook] Error:', error)
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
  rawPayload: MidtransNotification
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
      console.error('[Midtrans Webhook] Transaction not found:', payload.externalId)
      return { success: false, error: 'Transaction not found' }
    }

    // Skip if already processed to this status
    if (transaction.status === payload.status) {
      console.log('[Midtrans Webhook] Transaction already processed:', payload.externalId)
      return { success: true }
    }

    // For fraud challenge, we may want to handle differently
    if (rawPayload.fraud_status === 'challenge') {
      console.log('[Midtrans Webhook] Transaction in challenge status:', payload.externalId)
      // Could implement manual review notification here
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

    if (payload.status === 'failed') {
      updateData.failure_reason = getFailureReason(rawPayload)
    }

    if (payload.paymentMethod) {
      updateData.metadata = {
        ...(transaction.metadata || {}),
        payment_method: payload.paymentMethod,
        payment_channel: payload.paymentChannel,
        va_number: rawPayload.va_numbers?.[0]?.va_number || rawPayload.permata_va_number,
        bill_key: rawPayload.bill_key,
        biller_code: rawPayload.biller_code,
        fraud_status: rawPayload.fraud_status,
      }
    }

    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update(updateData)
      .eq('id', transaction.id)

    if (updateError) {
      console.error('[Midtrans Webhook] Failed to update transaction:', updateError)
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
        console.error('[Midtrans Webhook] Failed to credit wallet:', creditResult.error)
        return { success: false, error: 'Failed to credit wallet' }
      }
    }

    return { success: true }

  } catch (error) {
    console.error('[Midtrans Webhook] Processing error:', error)
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
    console.error('[Midtrans Webhook] Credit wallet error:', error)
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
        description: `Payment via Midtrans - ${type}`,
        created_at: new Date().toISOString(),
      })
  } catch (error) {
    // Log but don't fail - transaction is already complete
    console.error('[Midtrans Webhook] Failed to record wallet transaction:', error)
  }
}

/**
 * Map Midtrans status to internal status
 */
function mapMidtransStatus(
  status: string,
  fraudStatus?: string
): 'pending' | 'success' | 'failed' | 'expired' | 'cancelled' {
  // Handle fraud status first for card transactions
  if (fraudStatus === 'deny' || fraudStatus === 'challenge') {
    return 'failed'
  }

  const statusMap: Record<string, 'pending' | 'success' | 'failed' | 'expired' | 'cancelled'> = {
    'pending': 'pending',
    'capture': 'success',
    'settlement': 'success',
    'deny': 'failed',
    'cancel': 'cancelled',
    'expire': 'expired',
    'failure': 'failed',
  }

  return statusMap[status] || 'pending'
}

/**
 * Get human-readable failure reason
 */
function getFailureReason(payload: MidtransNotification): string {
  if (payload.fraud_status === 'deny') {
    return 'Payment denied due to fraud detection'
  }
  if (payload.fraud_status === 'challenge') {
    return 'Payment requires manual verification'
  }
  if (payload.transaction_status === 'deny') {
    return 'Payment denied by payment provider'
  }
  if (payload.transaction_status === 'cancel') {
    return 'Payment was cancelled'
  }
  if (payload.transaction_status === 'expire') {
    return 'Payment expired'
  }
  if (payload.transaction_status === 'failure') {
    return 'Payment failed'
  }
  return payload.status_message || 'Unknown error'
}

/**
 * GET /api/webhooks/midtrans
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    provider: 'midtrans',
    timestamp: new Date().toISOString(),
  })
}
