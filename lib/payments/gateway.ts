/**
 * Payment Gateway Interface
 * 
 * Unified interface for payment gateway operations.
 * All payment providers (Xendit, Midtrans, etc.) must implement this interface.
 */

import type { PaymentProvider } from '../types/payment'

/**
 * Payment status enum
 */
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired' | 'cancelled'

/**
 * Payment fee breakdown
 */
export interface PaymentFee {
  type: string
  amount: number
}

/**
 * Input for creating a payment invoice
 */
export interface CreateInvoiceInput {
  /** Unique identifier for the payment (e.g., transaction ID) */
  externalId: string
  /** Payment amount in IDR */
  amount: number
  /** Payment description */
  description: string
  /** Customer email */
  customerEmail?: string
  /** Customer name */
  customerName?: string
  /** Invoice expiry time in minutes (default: 60) */
  expiryMinutes?: number
  /** Payment method (provider-specific) */
  paymentMethod?: string
  /** Success redirect URL */
  successRedirectUrl?: string
  /** Failure redirect URL */
  failureRedirectUrl?: string
  /** Webhook callback URL */
  callbackUrl?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Invoice response from payment gateway
 */
export interface InvoiceResponse {
  /** Gateway invoice/transaction ID */
  id: string
  /** External ID provided in request */
  externalId: string
  /** Payment provider name */
  provider: PaymentProvider
  /** Payment amount */
  amount: number
  /** Current payment status */
  status: PaymentStatus
  /** Payment/invoice URL for user redirect */
  invoiceUrl?: string
  /** QR code string (for QRIS payments) */
  qrString?: string
  /** Payment token (for frontend integration) */
  token?: string
  /** Virtual account number (for bank transfers) */
  vaNumber?: string
  /** Bill key (for bill payments) */
  billKey?: string
  /** Biller code (for bill payments) */
  billerCode?: string
  /** Payment expiry timestamp */
  expiresAt?: string
  /** Payment creation timestamp */
  createdAt: string
  /** Payment completion timestamp */
  paidAt?: string
  /** Payment method used */
  paymentMethod?: string
  /** Payment channel/bank used */
  paymentChannel?: string
}

/**
 * Payment status response
 */
export interface PaymentStatusResponse {
  /** Gateway transaction ID */
  id: string
  /** External ID / Order ID */
  externalId: string
  /** Payment provider name */
  provider: PaymentProvider
  /** Payment amount */
  amount: number
  /** Current payment status */
  status: PaymentStatus
  /** Payment completion timestamp */
  paidAt?: string
  /** Payment method used */
  paymentMethod?: string
  /** Payment channel/bank used */
  paymentChannel?: string
  /** Fee breakdown */
  fees?: PaymentFee[]
}

/**
 * Webhook payload for payment callbacks
 */
export interface WebhookPayload {
  /** Gateway transaction ID */
  id: string
  /** External ID / Order ID */
  externalId: string
  /** Payment provider name */
  provider: PaymentProvider
  /** Payment amount */
  amount: number
  /** Current payment status */
  status: PaymentStatus
  /** Payment completion timestamp */
  paidAt?: string
  /** Payment method used */
  paymentMethod?: string
  /** Payment channel/bank used */
  paymentChannel?: string
  /** Raw webhook data from provider */
  rawData: Record<string, unknown>
}

/**
 * Payment Gateway Interface
 * 
 * All payment gateways must implement this interface to be used
 * with the unified payment system.
 */
export interface PaymentGateway {
  /** Gateway provider identifier */
  readonly provider: PaymentProvider

  /**
   * Create a new payment invoice
   * 
   * @param input - Invoice creation parameters
   * @returns Invoice response with payment URL and details
   */
  createInvoice(input: CreateInvoiceInput): Promise<InvoiceResponse>

  /**
   * Verify payment status by transaction ID
   * 
   * @param transactionId - Gateway transaction ID
   * @returns Payment status response
   */
  verifyPayment(transactionId: string): Promise<PaymentStatusResponse>

  /**
   * Get payment status by external ID
   * 
   * @param externalId - External ID / Order ID
   * @returns Payment status response
   */
  getPaymentStatus(externalId: string): Promise<PaymentStatusResponse>

  /**
   * Verify webhook signature
   * 
   * @param signature - Signature from webhook headers
   * @param payload - Additional payload data for verification
   * @returns True if signature is valid
   */
  verifyWebhookSignature(signature: string | null, ...payload: unknown[]): boolean

  /**
   * Calculate payment fee for a given amount and method
   * 
   * @param amount - Payment amount
   * @param paymentMethod - Payment method (optional)
   * @returns Fee amount in IDR
   */
  calculateFee(amount: number, paymentMethod?: string): number

  /**
   * Validate API credentials
   * 
   * @returns True if credentials are valid
   */
  validateCredentials(): Promise<boolean>
}

/**
 * Gateway factory configuration
 */
export interface GatewayConfig {
  /** Default gateway provider */
  defaultProvider: PaymentProvider
  /** Enable specific providers */
  enabledProviders: PaymentProvider[]
  /** Gateway-specific configurations */
  providerConfigs?: Record<string, unknown>
}

/**
 * Payment gateway factory for creating gateway instances
 */
export class PaymentGatewayFactory {
  private static instance: PaymentGatewayFactory
  private gateways: Map<PaymentProvider, PaymentGateway> = new Map()
  private config: GatewayConfig

  private constructor(config?: GatewayConfig) {
    this.config = config || {
      defaultProvider: 'xendit',
      enabledProviders: ['xendit', 'midtrans'],
    }
  }

  /**
   * Get singleton instance of the factory
   */
  static getInstance(config?: GatewayConfig): PaymentGatewayFactory {
    if (!PaymentGatewayFactory.instance) {
      PaymentGatewayFactory.instance = new PaymentGatewayFactory(config)
    }
    return PaymentGatewayFactory.instance
  }

  /**
   * Register a gateway instance
   */
  registerGateway(gateway: PaymentGateway): void {
    this.gateways.set(gateway.provider, gateway)
  }

  /**
   * Get a gateway by provider name
   */
  getGateway(provider?: PaymentProvider): PaymentGateway {
    const targetProvider = provider || this.config.defaultProvider

    if (!this.gateways.has(targetProvider)) {
      throw new Error(`Payment gateway not registered: ${targetProvider}`)
    }

    return this.gateways.get(targetProvider)!
  }

  /**
   * Get all registered gateways
   */
  getGateways(): Map<PaymentProvider, PaymentGateway> {
    return this.gateways
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(provider: PaymentProvider): boolean {
    return this.config.enabledProviders.includes(provider)
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders(): PaymentProvider[] {
    return this.config.enabledProviders
  }
}

/**
 * Utility function to format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Utility function to parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and thousand separators
  const cleaned = value.replace(/[^\d.-]/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Calculate total amount including fees
 */
export function calculateTotalWithFee(amount: number, fee: number): number {
  return amount + fee
}

/**
 * Check if payment is successful
 */
export function isPaymentSuccessful(status: PaymentStatus): boolean {
  return status === 'success'
}

/**
 * Check if payment is pending
 */
export function isPaymentPending(status: PaymentStatus): boolean {
  return status === 'pending'
}

/**
 * Check if payment is failed
 */
export function isPaymentFailed(status: PaymentStatus): boolean {
  return status === 'failed' || status === 'cancelled' || status === 'expired'
}

/**
 * Check if payment is still active (can be paid)
 */
export function isPaymentActive(status: PaymentStatus): boolean {
  return status === 'pending'
}
