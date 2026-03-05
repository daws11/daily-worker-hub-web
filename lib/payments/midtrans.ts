/**
 * Midtrans Payment Gateway Client
 * 
 * Provides a unified interface for Midtrans payment operations:
 * - Transaction creation (bank transfer, e-wallet, card, QRIS)
 * - Payment status verification
 * - Webhook signature verification
 * - Payment fee calculation
 * 
 * @see https://api-docs.midtrans.com/
 */

import crypto from 'crypto'
import type { PaymentGateway, CreateInvoiceInput, InvoiceResponse, PaymentStatusResponse } from './gateway'

// Midtrans API Configuration
const MIDTRANS_API_URL = process.env.MIDTRANS_API_URL || 'https://api.midtrans.com/v2'
const MIDTRANS_SNAP_API_URL = process.env.MIDTRANS_SNAP_API_URL || 'https://app.midtrans.com/snap/v1'

/**
 * Retry configuration for API calls
 */
interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
}

/**
 * Get Midtrans server key from environment
 * @throws {Error} If MIDTRANS_SERVER_KEY is not set
 */
function getServerKey(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY environment variable is not set')
  }
  return serverKey
}

/**
 * Get Midtrans client key (for frontend use)
 */
export function getClientKey(): string {
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
  return clientKey
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  )
  // Add jitter
  return delay + Math.random() * 1000
}

/**
 * Make an authenticated request to Midtrans API with retry logic
 */
async function midtransRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  useSnapApi: boolean = false,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  const serverKey = getServerKey()
  const baseUrl = useSnapApi ? MIDTRANS_SNAP_API_URL : MIDTRANS_API_URL
  const url = `${baseUrl}${endpoint}`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
          'Accept': 'application/json',
          ...options.headers,
        },
      })

      // Success - return response
      if (response.ok) {
        return response.json() as Promise<T>
      }

      // Client errors (4xx) - don't retry
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error_messages?.join(', ') || `HTTP ${response.status}`
        throw new Error(`Midtrans API error: ${errorMessage}`)
      }

      // Server errors (5xx) - retry
      if (response.status >= 500) {
        lastError = new Error(`Midtrans API server error (${response.status})`)
        
        if (attempt < retryConfig.maxRetries) {
          const delay = calculateBackoff(attempt, retryConfig)
          console.warn(`Midtrans API retry ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`)
          await sleep(delay)
          continue
        }
      }
    } catch (error) {
      // Network errors - retry
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt < retryConfig.maxRetries) {
        const delay = calculateBackoff(attempt, retryConfig)
        console.warn(`Midtrans API retry ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`)
        await sleep(delay)
        continue
      }
    }
  }

  throw lastError || new Error('Midtrans API request failed after retries')
}

/**
 * Midtrans Transaction Response
 */
interface MidtransTransactionResponse {
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
  redirect_url?: string
  va_numbers?: Array<{
    bank: string
    va_number: string
  }>
  permata_va_number?: string
  bill_key?: string
  biller_code?: string
  qr_string?: string
  actions?: Array<{
    name: string
    method: string
    url: string
  }>
  settlement_time?: string
  expiry_time?: string
}

/**
 * Midtrans Snap Transaction Response
 */
interface MidtransSnapResponse {
  token: string
  redirect_url: string
}

/**
 * Midtrans Payment Gateway Implementation
 */
export class MidtransGateway implements PaymentGateway {
  readonly provider = 'midtrans'

  /**
   * Create a new transaction using Midtrans Snap API
   * Returns a payment token and redirect URL
   */
  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceResponse> {
    try {
      const transactionData = {
        transaction_details: {
          order_id: input.externalId,
          gross_amount: input.amount,
        },
        customer_details: {
          email: input.customerEmail,
          first_name: input.customerName,
        },
        item_details: [
          {
            id: input.externalId,
            price: input.amount,
            quantity: 1,
            name: input.description.substring(0, 50), // Midtrans limit
          },
        ],
        callbacks: {
          finish: input.successRedirectUrl,
          error: input.failureRedirectUrl,
        },
        expiry: {
          duration: input.expiryMinutes || 60,
          unit: 'minute',
        },
        metadata: input.metadata,
      }

      // Use Snap API for all payment methods
      const response = await midtransRequest<MidtransSnapResponse>(
        '/transactions',
        {
          method: 'POST',
          body: JSON.stringify(transactionData),
        },
        true // Use Snap API
      )

      return {
        id: response.token,
        externalId: input.externalId,
        provider: 'midtrans',
        amount: input.amount,
        status: 'pending',
        invoiceUrl: response.redirect_url,
        token: response.token,
        expiresAt: new Date(Date.now() + (input.expiryMinutes || 60) * 60000).toISOString(),
        createdAt: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create Midtrans transaction: ${error.message}`)
      }
      throw new Error('Failed to create Midtrans transaction: Unknown error')
    }
  }

  /**
   * Create a specific payment type transaction (bank transfer, e-wallet, etc.)
   */
  async createSpecificPayment(
    input: CreateInvoiceInput & {
      paymentType: 'bank_transfer' | 'echannel' | 'qris' | 'gopay' | 'shopeepay' | 'credit_card'
      bank?: string
    }
  ): Promise<InvoiceResponse> {
    try {
      const transactionData: Record<string, unknown> = {
        transaction_details: {
          order_id: input.externalId,
          gross_amount: input.amount,
        },
        customer_details: {
          email: input.customerEmail,
          first_name: input.customerName,
        },
      }

      // Add specific payment details
      switch (input.paymentType) {
        case 'bank_transfer':
          transactionData.bank_transfer = {
            bank: input.bank || 'bca',
            va_number: '', // Let Midtrans generate
          }
          break
        case 'echannel':
          transactionData.echannel = {
            bill_info1: input.description.substring(0, 50),
          }
          break
        case 'qris':
          transactionData.qris = {
            acquirer: 'gopay',
          }
          break
        case 'gopay':
          transactionData.gopay = {
            enable_callback: true,
            callback_url: input.callbackUrl,
          }
          break
        case 'shopeepay':
          transactionData.shopeepay = {
            callback_url: input.callbackUrl,
          }
          break
        case 'credit_card':
          transactionData.credit_card = {
            secure: true,
          }
          break
      }

      // Add expiry
      transactionData.expiry = {
        duration: input.expiryMinutes || 60,
        unit: 'minute',
      }

      const response = await midtransRequest<MidtransTransactionResponse>(
        '/charge',
        {
          method: 'POST',
          body: JSON.stringify(transactionData),
        }
      )

      return {
        id: response.transaction_id,
        externalId: response.order_id,
        provider: 'midtrans',
        amount: Number(response.gross_amount),
        status: this.mapStatus(response.transaction_status, response.fraud_status),
        invoiceUrl: response.redirect_url,
        vaNumber: response.va_numbers?.[0]?.va_number || response.permata_va_number,
        billKey: response.bill_key,
        billerCode: response.biller_code,
        qrString: response.qr_string,
        expiresAt: response.expiry_time,
        createdAt: response.transaction_time,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create Midtrans payment: ${error.message}`)
      }
      throw new Error('Failed to create Midtrans payment: Unknown error')
    }
  }

  /**
   * Verify payment status by order ID
   */
  async verifyPayment(orderId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await midtransRequest<MidtransTransactionResponse>(
        `/${orderId}/status`
      )

      return {
        id: response.transaction_id,
        externalId: response.order_id,
        provider: 'midtrans',
        amount: Number(response.gross_amount),
        status: this.mapStatus(response.transaction_status, response.fraud_status),
        paidAt: response.settlement_time,
        paymentMethod: response.payment_type,
        paymentChannel: response.va_numbers?.[0]?.bank || response.payment_type,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to verify Midtrans payment: ${error.message}`)
      }
      throw new Error('Failed to verify Midtrans payment: Unknown error')
    }
  }

  /**
   * Get payment status by order ID (alias for verifyPayment)
   */
  async getPaymentStatus(externalId: string): Promise<PaymentStatusResponse> {
    return this.verifyPayment(externalId)
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await midtransRequest<{ status: string; message: string }>(
        `/${orderId}/cancel`,
        { method: 'POST' }
      )

      return {
        success: response.status === '200',
        message: response.message,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to cancel Midtrans transaction: ${error.message}`)
      }
      throw new Error('Failed to cancel Midtrans transaction: Unknown error')
    }
  }

  /**
   * Approve a transaction with challenge status
   */
  async approveTransaction(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await midtransRequest<{ status: string; message: string }>(
        `/${orderId}/approve`,
        { method: 'POST' }
      )

      return {
        success: response.status === '200',
        message: response.message,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to approve Midtrans transaction: ${error.message}`)
      }
      throw new Error('Failed to approve Midtrans transaction: Unknown error')
    }
  }

  /**
   * Verify Midtrans webhook signature
   * Uses SHA-512 hash of orderId + statusCode + grossAmount + serverKey
   */
  verifyWebhookSignature(
    signature: string | null,
    orderId: string,
    statusCode: string,
    grossAmount: string
  ): boolean {
    if (!signature) {
      return false
    }

    const serverKey = getServerKey()
    
    // Create signature key
    const signatureKey = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex')

    return signature === signatureKey
  }

  /**
   * Calculate Midtrans payment fee based on payment method
   */
  calculateFee(amount: number, paymentMethod?: string): number {
    switch (paymentMethod?.toLowerCase()) {
      case 'credit_card':
      case 'card':
        // Credit card: 2.9% + Rp 2,000
        return Math.floor(amount * 0.029) + 2000
      
      case 'bank_transfer':
      case 'bca':
      case 'bni':
      case 'bri':
      case 'mandiri':
        // Bank transfer: Rp 4,000 flat
        return 4000
      
      case 'echannel':
      case 'mandiri_bill':
        // Mandiri bill: Rp 4,000 flat
        return 4000
      
      case 'qris':
        // QRIS: 0.7% + Rp 500
        return Math.floor(amount * 0.007) + 500
      
      case 'gopay':
      case 'shopeepay':
      case 'dana':
      case 'ovo':
        // E-wallet: 1.5%
        return Math.floor(amount * 0.015)
      
      default:
        // Default: QRIS fee
        return Math.floor(amount * 0.007) + 500
    }
  }

  /**
   * Validate API credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      // Try to get transaction status with invalid ID to check auth
      await midtransRequest<{ status_message: string }>(
        '/nonexistent-order/status'
      )
      return true
    } catch (error) {
      // If we get 401, credentials are invalid
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      // Other errors mean credentials are valid but order doesn't exist
      return true
    }
  }

  /**
   * Map Midtrans status to internal status
   */
  private mapStatus(
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
}

// Export singleton instance
export const midtransGateway = new MidtransGateway()

// Export utility functions for backward compatibility
export function calculatePaymentFee(amount: number, paymentMethod?: string): number {
  return midtransGateway.calculateFee(amount, paymentMethod)
}

export function verifySignature(
  signature: string,
  orderId: string,
  statusCode: string,
  grossAmount: string
): boolean {
  return midtransGateway.verifyWebhookSignature(signature, orderId, statusCode, grossAmount)
}

export function mapPaymentStatus(
  status: string,
  fraudStatus?: string
): 'pending' | 'success' | 'failed' | 'expired' | 'cancelled' {
  const statusMap: Record<string, 'pending' | 'success' | 'failed' | 'expired' | 'cancelled'> = {
    'pending': 'pending',
    'capture': 'success',
    'settlement': 'success',
    'deny': 'failed',
    'cancel': 'cancelled',
    'expire': 'expired',
    'failure': 'failed',
  }

  if (fraudStatus === 'deny' || fraudStatus === 'challenge') {
    return 'failed'
  }

  return statusMap[status] || 'pending'
}

/**
 * Get Midtrans client configuration for frontend
 */
export function getMidtransConfig() {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const clientKey = getClientKey()

  return {
    isProduction,
    clientKey,
    scriptUrl: isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js',
  }
}
