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
import { logger } from '@/lib/logger'

const routeLogger = logger.createApiLogger('payments/withdraw')

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
  const { startTime, requestId } = logger.requestStart(request, { route: 'payments/withdraw' })
  
  try {
    const supabase = await createClient()
    
    // Parse request body
    const body: WithdrawalRequest = await request.json()
    const { workerId, amount, bankAccountId } = body

    // Audit log for all withdrawal requests
    logger.audit('withdrawal_request', {
      requestId,
      workerId,
      amount,
      bankAccountId,
    })

    // Validate required fields
    if (!workerId || !amount || !bankAccountId) {
      routeLogger.warn('Missing required fields', { requestId })
      logger.requestError(request, new Error('Missing required fields: workerId, amount, bankAccountId'), 400, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Missing required fields: workerId, amount, bankAccountId' },
        { status: 400 }
      )
    }

    // Validate amount
    if (amount < PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT) {
      routeLogger.warn('Amount below minimum', { requestId, amount, minAmount: PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT })
      logger.requestError(request, new Error(`Minimum withdrawal amount is Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT}`), 400, startTime, { requestId })
      
      return NextResponse.json(
        { error: `Minimum withdrawal amount is Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString('id-ID')}` },
        { status: 400 }
      )
    }

    if (amount > PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT) {
      routeLogger.warn('Amount above maximum', { requestId, amount, maxAmount: PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT })
      logger.requestError(request, new Error(`Maximum withdrawal amount is Rp ${PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT}`), 400, startTime, { requestId })
      
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
      routeLogger.error('Worker not found', workerError || new Error('Not found'), { requestId, workerId })
      logger.requestError(request, new Error('Worker not found'), 404, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      )
    }

    // Get worker's wallet
    const { data: wallet, error: walletError } = await (supabase as any)
      .from('wallets')
      .select('*')
      .eq('worker_id', workerId)
      .maybeSingle()

    if (walletError) {
      routeLogger.error('Error fetching wallet', walletError, { requestId, workerId })
      logger.requestError(request, new Error('Failed to fetch wallet'), 500, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    if (!wallet) {
      routeLogger.warn('Wallet not found', { requestId, workerId })
      logger.requestError(request, new Error('Wallet not found'), 404, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // Check available balance
    if (wallet.balance < amount) {
      routeLogger.warn('Insufficient balance', { requestId, workerId, availableBalance: wallet.balance, requestedAmount: amount })
      logger.requestError(request, new Error('Insufficient balance'), 400, startTime, { requestId })
      
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
    const { data: bankAccount, error: bankError } = await (supabase as any)
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .eq('worker_id', workerId)
      .single()

    if (bankError || !bankAccount) {
      routeLogger.error('Bank account not found', bankError || new Error('Not found'), { requestId, bankAccountId, workerId })
      logger.requestError(request, new Error('Bank account not found or does not belong to worker'), 404, startTime, { requestId })
      
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

    routeLogger.info('Creating withdrawal request', { requestId, workerId, amount, netAmount, bankAccountId })

    // Create payout request record (pending)
    const { data: payoutRequest, error: payoutError } = await (supabase as any)
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
      routeLogger.error('Error creating payout request', payoutError || new Error('Unknown error'), { requestId, workerId })
      logger.requestError(request, new Error('Failed to create payout request'), 500, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      )
    }

    // Audit log for payout request creation
    logger.audit('payout_request_created', {
      requestId,
      payoutRequestId: payoutRequest.id,
      workerId,
      amount,
      feeAmount,
      netAmount,
      externalId,
    })

    // Deduct balance from wallet (hold until completed)
    const { error: updateWalletError } = await (supabase as any)
      .from('wallets')
      .update({
        balance: wallet.balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (updateWalletError) {
      routeLogger.error('Error updating wallet balance', updateWalletError, { requestId, walletId: wallet.id })
      
      // Rollback payout request
      await (supabase as any)
        .from('payout_requests')
        .delete()
        .eq('id', payoutRequest.id)

      logger.requestError(request, new Error('Failed to update wallet balance'), 500, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Failed to update wallet balance' },
        { status: 500 }
      )
    }

    // Create hold transaction record
    await (supabase as any)
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'payout',
        status: 'pending_review',
        amount: amount,
        description: `Withdrawal to ${bankAccount.bank_code} - ${bankAccount.bank_account_number}`,
        reference_id: payoutRequest.id,
      })

    routeLogger.info('Wallet balance held for payout', { requestId, walletId: wallet.id, amount, payoutRequestId: payoutRequest.id })

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
      await (supabase as any)
        .from('payout_requests')
        .update({
          provider_payout_id: disbursement.id,
          status: 'processing',
          provider_response: disbursement,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payoutRequest.id)

      // Update transaction status
      await (supabase as any)
        .from('wallet_transactions')
        .update({ status: 'paid' })
        .eq('reference_id', payoutRequest.id)

      routeLogger.info('Disbursement created successfully', { requestId, payoutRequestId: payoutRequest.id, disbursementId: disbursement.id })
      logger.requestSuccess(request, { status: 200 }, startTime, { requestId, payoutRequestId: payoutRequest.id })

      // Audit log for successful disbursement creation
      logger.audit('disbursement_created', {
        requestId,
        payoutRequestId: payoutRequest.id,
        disbursementId: disbursement.id,
        workerId,
        netAmount,
      })

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
      routeLogger.error('Disbursement failed', disbursementError, { requestId, payoutRequestId: payoutRequest.id })
      
      // Refund wallet balance
      await (supabase as any)
        .from('wallets')
        .update({
          balance: wallet.balance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)

      // Update payout request as failed
      await (supabase as any)
        .from('payout_requests')
        .update({
          status: 'failed',
          failure_reason: disbursementError instanceof Error ? disbursementError.message : 'Disbursement failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payoutRequest.id)

      // Update transaction status
      await (supabase as any)
        .from('wallet_transactions')
        .update({ status: 'refunded' })
        .eq('reference_id', payoutRequest.id)

      // Audit log for failed disbursement
      logger.audit('disbursement_failed', {
        requestId,
        payoutRequestId: payoutRequest.id,
        workerId,
        amount,
        error: disbursementError instanceof Error ? disbursementError.message : 'Unknown error',
      })
      
      logger.requestError(request, disbursementError, 500, startTime, { requestId, payoutRequestId: payoutRequest.id })
      
      return NextResponse.json(
        { 
          error: 'Failed to process withdrawal',
          details: disbursementError instanceof Error ? disbursementError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

  } catch (error) {
    routeLogger.error('Unexpected error in POST /api/payments/withdraw', error, { requestId })
    logger.requestError(request, error, 500, startTime, { requestId })
    
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
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, { route: 'payments/withdraw' })
  
  routeLogger.info('Health check for withdraw endpoint', { requestId })
  logger.requestSuccess(request, { status: 200 }, startTime, { requestId })
  
  return NextResponse.json({
    status: 'ok',
    endpoint: 'withdraw',
    timestamp: new Date().toISOString(),
  })
}
