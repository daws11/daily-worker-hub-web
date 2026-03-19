/**
 * Payment Creation API Route
 * 
 * Creates a new payment transaction using the specified payment gateway.
 * Supports both Xendit and Midtrans payment providers.
 * 
 * Rate limited: 10 requests per minute (payment endpoints)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  createInvoice, 
  calculateFee,
  isProviderEnabled,
  type PaymentProvider,
  type CreateInvoiceInput,
} from '@/lib/payments'
import { PAYMENT_CONSTANTS } from '@/lib/types/payment'
import { logger } from '@/lib/logger'
import { parseRequest } from '@/lib/validations'
import { createPaymentSchema } from '@/lib/validations/payment'
import { withRateLimit } from '@/lib/rate-limit'

const routeLogger = logger.createApiLogger('payments/create')

/**
 * POST /api/payments/create
 * 
 * Create a new payment transaction
 * 
 * Request body:
 * - business_id: Business ID (required)
 * - amount: Payment amount in IDR (required)
 * - provider: Payment provider 'xendit' | 'midtrans' (optional, defaults to 'xendit')
 * - payment_method: Payment method (optional, e.g., 'qris', 'bank_transfer')
 * - customer_email: Customer email (optional)
 * - customer_name: Customer name (optional)
 * - metadata: Additional metadata (optional)
 */
async function handlePOST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, { route: 'payments/create' })
  
  try {
    const supabase = await createClient()

    // Validate request body with Zod schema
    const parseResult = await parseRequest(request, createPaymentSchema)
    
    if (!parseResult.success) {
      routeLogger.warn('Validation failed', { requestId, errors: parseResult.error })
      return parseResult.error
    }

    const { 
      business_id, 
      amount, 
      provider = 'xendit', 
      payment_method, 
      customer_email, 
      customer_name, 
      metadata 
    } = parseResult.data

    // Audit log for all payment creation requests
    logger.audit('payment_create_request', {
      requestId,
      businessId: business_id,
      amount,
      provider,
      paymentMethod: payment_method,
    })

    // Validate provider
    const paymentProvider = provider as PaymentProvider
    if (!isProviderEnabled(paymentProvider)) {
      routeLogger.warn('Payment provider not enabled', { requestId, provider })
      logger.requestError(request, new Error(`Payment provider '${provider}' is not enabled`), 400, startTime, { requestId })
      
      return NextResponse.json(
        { error: `Payment provider '${provider}' is not enabled` },
        { status: 400 }
      )
    }

    // Get business info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, user_id')
      .eq('id', business_id)
      .single()

    if (businessError || !business) {
      routeLogger.error('Business not found', businessError || new Error('Not found'), { requestId, businessId: business_id })
      logger.requestError(request, new Error('Business not found'), 404, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Calculate fee
    const feeAmount = calculateFee(amount, payment_method)
    const totalAmount = amount + feeAmount

    // Generate unique transaction ID
    const transactionId = `payment_${business_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`

    routeLogger.info('Creating payment transaction', { requestId, transactionId, businessId: business_id, amount: totalAmount, provider })

    // Create pending transaction in database
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        id: transactionId,
        business_id,
        amount: totalAmount,
        status: 'pending',
        payment_provider: paymentProvider,
        provider_payment_id: null,
        payment_url: null,
        qris_expires_at: new Date(Date.now() + PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES * 60000).toISOString(),
        fee_amount: feeAmount,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (txError || !transaction) {
      routeLogger.error('Failed to create transaction', txError || new Error('Unknown error'), { requestId, businessId: business_id })
      logger.requestError(request, new Error('Failed to create payment transaction'), 500, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Failed to create payment transaction' },
        { status: 500 }
      )
    }

    // Audit log for transaction creation
    logger.audit('payment_transaction_created', {
      requestId,
      transactionId,
      businessId: business_id,
      amount: totalAmount,
      feeAmount,
      provider,
    })

    // Create invoice with payment gateway
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000'

      const invoiceInput: CreateInvoiceInput = {
        externalId: transactionId,
        amount: totalAmount,
        description: `Top-up wallet untuk ${business.name}`,
        customerEmail: customer_email,
        customerName: customer_name || business.name,
        expiryMinutes: PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES,
        paymentMethod: payment_method,
        successRedirectUrl: `${baseUrl}/business/wallet?payment=success`,
        failureRedirectUrl: `${baseUrl}/business/wallet?payment=failed`,
        callbackUrl: `${baseUrl}/api/webhooks/${paymentProvider}`,
        metadata: {
          business_id,
          business_name: business.name,
          original_amount: amount,
          fee_amount: feeAmount,
        },
      }

      const invoice = await createInvoice(invoiceInput, paymentProvider)

      // Update transaction with payment details
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          payment_url: invoice.invoiceUrl,
          provider_payment_id: invoice.id,
          metadata: {
            ...metadata,
            invoice_id: invoice.id,
            invoice_url: invoice.invoiceUrl,
            qr_string: invoice.qrString,
            token: invoice.token,
            va_number: invoice.vaNumber,
          },
        })
        .eq('id', transactionId)

      if (updateError) {
        routeLogger.warn('Failed to update transaction with payment details', { requestId, transactionId, error: updateError.message })
        // Don't fail - payment URL is still valid
      }

      routeLogger.info('Payment invoice created successfully', { requestId, transactionId, invoiceId: invoice.id, provider })
      logger.requestSuccess(request, { status: 200 }, startTime, { requestId, transactionId })

      // Audit log for successful invoice creation
      logger.audit('payment_invoice_created', {
        requestId,
        transactionId,
        invoiceId: invoice.id,
        provider,
        amount: totalAmount,
      })

      // Return success response
      return NextResponse.json({
        success: true,
        data: {
          transaction: {
            id: transactionId,
            amount: totalAmount,
            original_amount: amount,
            fee_amount: feeAmount,
            status: 'pending',
            provider: paymentProvider,
            created_at: transaction.created_at,
            expires_at: transaction.qris_expires_at,
          },
          payment: {
            id: invoice.id,
            invoice_url: invoice.invoiceUrl,
            qr_string: invoice.qrString,
            token: invoice.token,
            va_number: invoice.vaNumber,
            bill_key: invoice.billKey,
            biller_code: invoice.billerCode,
          },
        },
      })

    } catch (invoiceError) {
      // Mark transaction as failed
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          failure_reason: invoiceError instanceof Error ? invoiceError.message : 'Failed to create invoice',
        })
        .eq('id', transactionId)

      routeLogger.error('Failed to create invoice', invoiceError, { requestId, transactionId, provider })
      
      // Audit log for failed invoice creation
      logger.audit('payment_invoice_failed', {
        requestId,
        transactionId,
        provider,
        error: invoiceError instanceof Error ? invoiceError.message : 'Unknown error',
      })
      
      logger.requestError(request, invoiceError, 500, startTime, { requestId, transactionId })
      
      return NextResponse.json(
        { 
          error: 'Failed to create payment invoice',
          details: invoiceError instanceof Error ? invoiceError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

  } catch (error) {
    routeLogger.error('Unexpected error in POST /api/payments/create', error, { requestId: (request as any).requestId })
    logger.requestError(request, error, 500, startTime, {})
    
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
 * GET /api/payments/create
 * 
 * Get payment creation info and fee calculation
 * 
 * Query params:
 * - amount: Payment amount (required)
 * - provider: Payment provider (optional)
 * - payment_method: Payment method (optional)
 */
async function handleGET(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, { route: 'payments/create' })
  
  try {
    const { searchParams } = new URL(request.url)
    const amount = parseInt(searchParams.get('amount') || '0')
    const provider = (searchParams.get('provider') || 'xendit') as PaymentProvider
    const paymentMethod = searchParams.get('payment_method') || undefined

    if (!amount || amount <= 0) {
      routeLogger.warn('Invalid amount in GET request', { requestId, amount })
      logger.requestError(request, new Error('Valid amount is required'), 400, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    // Validate amount limits
    if (amount < PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT) {
      routeLogger.info('Amount validation: below minimum', { requestId, amount, minAmount: PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT })
      
      return NextResponse.json({
        valid: false,
        error: `Minimum top-up amount is Rp ${PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT.toLocaleString('id-ID')}`,
        min_amount: PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT,
      })
    }

    if (amount > PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT) {
      routeLogger.info('Amount validation: above maximum', { requestId, amount, maxAmount: PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT })
      
      return NextResponse.json({
        valid: false,
        error: `Maximum top-up amount is Rp ${PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT.toLocaleString('id-ID')}`,
        max_amount: PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT,
      })
    }

    // Calculate fee
    const feeAmount = calculateFee(amount, paymentMethod)
    const totalAmount = amount + feeAmount

    routeLogger.info('Payment fee calculated', { requestId, amount, feeAmount, totalAmount, provider })
    logger.requestSuccess(request, { status: 200 }, startTime, { requestId })

    return NextResponse.json({
      valid: true,
      data: {
        amount,
        fee_amount: feeAmount,
        total_amount: totalAmount,
        provider,
        payment_method: paymentMethod,
        min_amount: PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT,
        max_amount: PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT,
        expiry_minutes: PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES,
      },
    })

  } catch (error) {
    routeLogger.error('Unexpected error in GET /api/payments/create', error, { requestId })
    logger.requestError(request, error, 500, startTime, { requestId })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export handlers with rate limiting
export const POST = withRateLimit(handlePOST, { type: 'payment', userBased: true })
export const GET = withRateLimit(handleGET, { type: 'api-public', userBased: false })
