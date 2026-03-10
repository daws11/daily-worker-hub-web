/**
 * Payment Verification API Route
 * 
 * Verifies payment status by checking with the payment gateway.
 * Returns the current status of a payment transaction.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPayment, getPaymentStatus, type PaymentProvider } from '@/lib/payments'

/**
 * GET /api/payments/verify
 * 
 * Verify payment status
 * 
 * Query params:
 * - transaction_id: Transaction ID (required)
 * - provider: Payment provider 'xendit' | 'midtrans' (required)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transaction_id')
    const provider = searchParams.get('provider') as PaymentProvider

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    if (!provider || !['xendit', 'midtrans'].includes(provider)) {
      return NextResponse.json(
        { error: 'Valid payment provider is required (xendit or midtrans)' },
        { status: 400 }
      )
    }

    // Get transaction from database
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (txError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // If transaction is already in a final state, return from database
    if (['success', 'failed', 'expired', 'cancelled'].includes(transaction.status)) {
      return NextResponse.json({
        success: true,
        data: {
          id: transaction.id,
          external_id: transaction.id,
          provider: transaction.payment_provider,
          amount: transaction.amount,
          status: transaction.status,
          paid_at: transaction.paid_at,
          payment_method: transaction.metadata?.payment_method,
          payment_channel: transaction.metadata?.payment_channel,
          created_at: transaction.created_at,
          updated_at: transaction.updated_at,
        },
        source: 'database',
      })
    }

    // Verify with payment gateway
    try {
      let paymentStatus

      // Use provider payment ID if available, otherwise use external ID
      if (transaction.provider_payment_id) {
        paymentStatus = await verifyPayment(transaction.provider_payment_id, provider)
      } else {
        paymentStatus = await getPaymentStatus(transactionId, provider)
      }

      // Check if status has changed
      if (paymentStatus.status !== transaction.status) {
        // Update transaction in database
        const updateData: Record<string, unknown> = {
          status: paymentStatus.status,
          updated_at: new Date().toISOString(),
        }

        if (paymentStatus.paidAt) {
          updateData.paid_at = paymentStatus.paidAt
        }

        if (paymentStatus.paymentMethod) {
          updateData.metadata = {
            ...(transaction.metadata || {}),
            payment_method: paymentStatus.paymentMethod,
            payment_channel: paymentStatus.paymentChannel,
          }
        }

        const { error: updateError } = await supabase
          .from('payment_transactions')
          .update(updateData)
          .eq('id', transactionId)

        if (updateError) {
          console.error('[Payment Verify] Failed to update transaction:', updateError)
        }

        // If payment is now successful, credit the wallet
        if (paymentStatus.status === 'success' && transaction.status !== ('success' as any)) {
          await creditWallet(
            supabase,
            transaction.business_id,
            transaction.amount - (transaction.fee_amount || 0),
            transactionId
          )
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          id: paymentStatus.id,
          external_id: paymentStatus.externalId,
          provider: paymentStatus.provider,
          amount: paymentStatus.amount,
          status: paymentStatus.status,
          paid_at: paymentStatus.paidAt,
          payment_method: paymentStatus.paymentMethod,
          payment_channel: paymentStatus.paymentChannel,
          fees: paymentStatus.fees,
          created_at: transaction.created_at,
          updated_at: new Date().toISOString(),
        },
        source: 'gateway',
      })

    } catch (gatewayError) {
      console.error('[Payment Verify] Gateway error:', gatewayError)
      
      // Return database status if gateway fails
      return NextResponse.json({
        success: true,
        data: {
          id: transaction.id,
          external_id: transaction.id,
          provider: transaction.payment_provider,
          amount: transaction.amount,
          status: transaction.status,
          created_at: transaction.created_at,
          updated_at: transaction.updated_at,
        },
        source: 'database',
        warning: 'Could not verify with payment gateway',
        error: gatewayError instanceof Error ? gatewayError.message : 'Unknown error',
      })
    }

  } catch (error) {
    console.error('[Payment Verify] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payments/verify
 * 
 * Batch verify multiple payments
 * 
 * Request body:
 * - transactions: Array of { transaction_id, provider }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactions } = body

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Transactions array is required' },
        { status: 400 }
      )
    }

    // Limit batch size
    if (transactions.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 transactions per batch' },
        { status: 400 }
      )
    }

    const results = []

    for (const tx of transactions) {
      const { transaction_id, provider } = tx

      if (!transaction_id || !provider) {
        results.push({
          transaction_id,
          success: false,
          error: 'Missing transaction_id or provider',
        })
        continue
      }

      try {
        const paymentStatus = await getPaymentStatus(transaction_id, provider as PaymentProvider)
        
        results.push({
          transaction_id,
          success: true,
          data: paymentStatus,
        })
      } catch (error) {
        results.push({
          transaction_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total: transactions.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    })

  } catch (error) {
    console.error('[Payment Verify] Batch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
): Promise<void> {
  try {
    // Get current wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle()

    if (walletError) {
      console.error('[Payment Verify] Failed to get wallet:', walletError)
      return
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
        console.error('[Payment Verify] Failed to create wallet:', createError)
        return
      }

      // Record transaction
      await recordWalletTransaction(supabase, newWallet.id, amount, transactionId, 'top_up')
      return
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
      console.error('[Payment Verify] Failed to update wallet balance:', updateError)
      return
    }

    // Record transaction
    await recordWalletTransaction(supabase, wallet.id, amount, transactionId, 'top_up')

  } catch (error) {
    console.error('[Payment Verify] Credit wallet error:', error)
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
        description: `Payment verified - ${type}`,
        created_at: new Date().toISOString(),
      })
  } catch (error) {
    console.error('[Payment Verify] Failed to record wallet transaction:', error)
  }
}
