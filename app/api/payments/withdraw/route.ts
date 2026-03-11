/**
 * Withdrawal API Endpoint
 * 
 * POST /api/payments/withdraw
 * 
 * Creates a withdrawal request for a worker to receive their earnings
 * via bank transfer through Xendit Disbursement API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xenditGateway } from '@/lib/payments'
import { PAYMENT_CONSTANTS } from '@/lib/types/payment'

interface WithdrawalRequest {
  workerId: string
  amount: number
  bankAccountId: string
}

/**
 * POST /api/payments/withdraw
 * 
 * Create a withdrawal request
 * 
 * Request body:
 * - workerId: Worker ID
 * - amount: Withdrawal amount in IDR
 * - bankAccountId: Bank account ID to withdraw to
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Parse request body
    const body: WithdrawalRequest = await request.json()
    const { workerId, amount, bankAccountId } = body

    // Validate required fields
    if (!workerId || !amount || !bankAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: workerId, amount, bankAccountId' },
        { status: 400 }
      )
    }

    // Validate amount
    if (amount < PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString('id-ID')}` },
        { status: 400 }
      )
    }

    if (amount > PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT) {
      return NextResponse.json(
        { error: `Maximum withdrawal amount is Rp ${PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT.toLocaleString('id-ID')}` },
        { status: 400 }
      )
    }

    // Get worker info
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id, user_id, full_name')
      .eq('id', workerId)
      .single()

    if (workerError || !worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      )
    }

    // Get worker's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('worker_id', workerId)
      .maybeSingle()

    if (walletError) {
      console.error('[Withdraw] Error fetching wallet:', walletError)
      return NextResponse.json(
        { error: 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // Check available balance
    if (wallet.balance < amount) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          availableBalance: wallet.balance,
          requestedAmount: amount,
        },
        { status: 400 }
      )
    }

    // Get bank account details
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .eq('worker_id', workerId)
      .single()

    if (bankError || !bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found or does not belong to worker' },
        { status: 404 }
      )
    }

    // Calculate fees (1% or minimum Rp 5,000)
    const feeAmount = Math.max(amount * PAYMENT_CONSTANTS.DEFAULT_PAYOUT_FEE_PERCENTAGE, 5000)
    const netAmount = amount - feeAmount

    // Generate external ID for disbursement
    const externalId = `payout-${workerId}-${Date.now()}`

    // Create payout request record (pending)
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .insert({
        worker_id: workerId,
        amount: amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        bank_code: bankAccount.bank_code,
        bank_account_number: bankAccount.bank_account_number,
        bank_account_name: bankAccount.bank_account_name,
        status: 'pending',
        payment_provider: 'xendit',
        metadata: {
          external_id: externalId,
          bank_account_id: bankAccountId,
        },
      })
      .select()
      .single()

    if (payoutError || !payoutRequest) {
      console.error('[Withdraw] Error creating payout request:', payoutError)
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      )
    }

    // Deduct balance from wallet (hold until completed)
    const { error: updateWalletError } = await supabase
      .from('wallets')
      .update({
        balance: wallet.balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (updateWalletError) {
      console.error('[Withdraw] Error updating wallet balance:', updateWalletError)
      
      // Rollback payout request
      await supabase
        .from('payout_requests')
        .delete()
        .eq('id', payoutRequest.id)

      return NextResponse.json(
        { error: 'Failed to update wallet balance' },
        { status: 500 }
      )
    }

    // Create hold transaction record
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'payout',
        status: 'pending_review',
        amount: amount,
        description: `Withdrawal to ${bankAccount.bank_code} - ${bankAccount.bank_account_number}`,
        reference_id: payoutRequest.id,
      })

    // Create disbursement via Xendit
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://api.dailyworkerhub.com'}/api/webhooks/xendit/disbursement`
      
      const disbursement = await xenditGateway.createDisbursement({
        externalId: externalId,
        amount: netAmount,
        bankDetails: {
          bankCode: bankAccount.bank_code,
          accountNumber: bankAccount.bank_account_number,
          accountHolderName: bankAccount.bank_account_name,
        },
        description: `Worker withdrawal - ${worker.full_name}`,
        emailTo: worker.user_id, // Will be replaced with actual email if available
        callbackUrl: webhookUrl,
        metadata: {
          payout_request_id: payoutRequest.id,
          worker_id: workerId,
          fee_amount: feeAmount,
        },
      })

      // Update payout request with provider ID
      await supabase
        .from('payout_requests')
        .update({
          provider_payout_id: disbursement.id,
          status: 'processing',
          provider_response: disbursement,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payoutRequest.id)

      // Update transaction status
      await supabase
        .from('wallet_transactions')
        .update({ status: 'paid' })
        .eq('reference_id', payoutRequest.id)

      return NextResponse.json({
        success: true,
        data: {
          id: payoutRequest.id,
          externalId: externalId,
          disbursementId: disbursement.id,
          amount: amount,
          feeAmount: feeAmount,
          netAmount: netAmount,
          status: 'processing',
          estimatedArrival: disbursement.estimatedArrival,
          bankCode: bankAccount.bank_code,
          accountNumber: bankAccount.bank_account_number,
          createdAt: payoutRequest.created_at,
        },
      })

    } catch (disbursementError) {
      console.error('[Withdraw] Disbursement failed:', disbursementError)

      // Refund wallet balance
      await supabase
        .from('wallets')
        .update({
          balance: wallet.balance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)

      // Update payout request as failed
      await supabase
        .from('payout_requests')
        .update({
          status: 'failed',
          failure_reason: disbursementError instanceof Error ? disbursementError.message : 'Disbursement failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payoutRequest.id)

      // Update transaction status
      await supabase
        .from('wallet_transactions')
        .update({ status: 'refunded' })
        .eq('reference_id', payoutRequest.id)

      return NextResponse.json(
        { 
          error: 'Failed to process withdrawal',
          details: disbursementError instanceof Error ? disbursementError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[Withdraw] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payments/withdraw
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'withdraw',
    timestamp: new Date().toISOString(),
  })
}
