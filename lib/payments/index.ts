/**
 * Payment Gateway Module
 * 
 * Unified payment integration for Daily Worker Hub.
 * Supports multiple payment providers (Xendit, Midtrans) with a consistent interface.
 * 
 * @example
 * ```ts
 * import { getPaymentGateway, createInvoice } from '@/lib/payments'
 * 
 * // Create an invoice using default gateway
 * const invoice = await createInvoice({
 *   externalId: 'txn_12345',
 *   amount: 500000,
 *   description: 'Wallet top-up',
 *   customerEmail: 'user@example.com',
 * })
 * 
 * // Or use a specific gateway
 * const gateway = getPaymentGateway('xendit')
 * const invoice = await gateway.createInvoice({ ... })
 * ```
 */

// Re-export types
export type {
  PaymentStatus,
  PaymentFee,
  CreateInvoiceInput,
  InvoiceResponse,
  PaymentStatusResponse,
  WebhookPayload,
  PaymentGateway,
  GatewayConfig,
  PaymentProvider,
  // Disbursement types
  DisbursementStatus,
  BankDetails,
  DisbursementInput,
  DisbursementResponse,
  DisbursementWebhookPayload,
} from './gateway'

// Re-export utility functions
export {
  PaymentGatewayFactory,
  formatCurrency,
  parseCurrency,
  calculateTotalWithFee,
  isPaymentSuccessful,
  isPaymentPending,
  isPaymentFailed,
  isPaymentActive,
} from './gateway'

// Re-export gateway classes
export { XenditGateway, xenditGateway } from './xendit'
export { MidtransGateway, midtransGateway, getClientKey, getMidtransConfig } from './midtrans'

// Import for initialization
import { PaymentGatewayFactory, type PaymentGateway, type PaymentProvider } from './gateway'
import { xenditGateway } from './xendit'
import { midtransGateway } from './midtrans'

/**
 * Initialize the payment gateway factory with available gateways
 */
function initializeGateways(): PaymentGatewayFactory {
  const factory = PaymentGatewayFactory.getInstance({
    defaultProvider: 'xendit',
    enabledProviders: ['xendit', 'midtrans'],
  })

  // Register Xendit gateway if credentials are available
  if (process.env.XENDIT_SECRET_KEY) {
    factory.registerGateway(xenditGateway)
  }

  // Register Midtrans gateway if credentials are available
  // Note: Midtrans does not support disbursements, only use for payments
  // if (process.env.MIDTRANS_SERVER_KEY) {
  //   factory.registerGateway(midtransGateway)
  // }

  return factory
}

// Initialize gateways
const factory = initializeGateways()

/**
 * Get a payment gateway instance
 * 
 * @param provider - Optional provider name, defaults to configured default
 * @returns PaymentGateway instance
 */
export function getPaymentGateway(provider?: PaymentProvider): PaymentGateway {
  return factory.getGateway(provider)
}

/**
 * Get all registered payment gateways
 */
export function getPaymentGateways(): Map<PaymentProvider, PaymentGateway> {
  return factory.getGateways()
}

/**
 * Check if a payment provider is enabled
 */
export function isProviderEnabled(provider: PaymentProvider): boolean {
  return factory.isProviderEnabled(provider)
}

/**
 * Get list of enabled payment providers
 */
export function getEnabledProviders(): PaymentProvider[] {
  return factory.getEnabledProviders()
}

/**
 * Create an invoice using the default payment gateway
 * 
 * @param input - Invoice creation parameters
 * @param provider - Optional provider override
 * @returns Invoice response
 */
export async function createInvoice(
  input: import('./gateway').CreateInvoiceInput,
  provider?: PaymentProvider
): Promise<import('./gateway').InvoiceResponse> {
  const gateway = getPaymentGateway(provider)
  return gateway.createInvoice(input)
}

/**
 * Verify payment status using the appropriate gateway
 * 
 * @param transactionId - Transaction ID from the gateway
 * @param provider - Payment provider name
 * @returns Payment status response
 */
export async function verifyPayment(
  transactionId: string,
  provider: PaymentProvider
): Promise<import('./gateway').PaymentStatusResponse> {
  const gateway = getPaymentGateway(provider)
  return gateway.verifyPayment(transactionId)
}

/**
 * Get payment status by external ID
 * 
 * @param externalId - External ID / Order ID
 * @param provider - Payment provider name
 * @returns Payment status response
 */
export async function getPaymentStatus(
  externalId: string,
  provider: PaymentProvider
): Promise<import('./gateway').PaymentStatusResponse> {
  const gateway = getPaymentGateway(provider)
  return gateway.getPaymentStatus(externalId)
}

/**
 * Calculate payment fee for a given amount and method
 * 
 * @param amount - Payment amount
 * @param paymentMethod - Payment method (optional)
 * @param provider - Optional provider override
 * @returns Fee amount in IDR
 */
export function calculateFee(
  amount: number,
  paymentMethod?: string,
  provider?: PaymentProvider
): number {
  const gateway = getPaymentGateway(provider)
  return gateway.calculateFee(amount, paymentMethod)
}

/**
 * Verify webhook signature
 * 
 * @param provider - Payment provider name
 * @param signature - Signature from webhook headers
 * @param payload - Additional payload data
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  provider: PaymentProvider,
  signature: string | null,
  ...payload: unknown[]
): boolean {
  const gateway = getPaymentGateway(provider)
  return gateway.verifyWebhookSignature(signature, ...payload)
}

/**
 * Validate credentials for a payment provider
 * 
 * @param provider - Payment provider name
 * @returns True if credentials are valid
 */
export async function validateCredentials(provider: PaymentProvider): Promise<boolean> {
  const gateway = getPaymentGateway(provider)
  return gateway.validateCredentials()
}

/**
 * Create a disbursement (withdrawal) using the default payment gateway
 * 
 * @param input - Disbursement creation parameters
 * @param provider - Optional provider override
 * @returns Disbursement response
 */
export async function createDisbursement(
  input: import('./gateway').DisbursementInput,
  provider?: PaymentProvider
): Promise<import('./gateway').DisbursementResponse> {
  const gateway = getPaymentGateway(provider)
  return gateway.createDisbursement(input)
}

/**
 * Get disbursement status
 * 
 * @param disbursementId - Disbursement ID from the gateway
 * @param provider - Optional provider override
 * @returns Disbursement status response
 */
export async function getDisbursementStatus(
  disbursementId: string,
  provider?: PaymentProvider
): Promise<import('./gateway').DisbursementResponse> {
  const gateway = getPaymentGateway(provider)
  return gateway.getDisbursementStatus(disbursementId)
}

/**
 * Environment variables documentation for payment integration
 * 
 * Required environment variables:
 * 
 * # Xendit Configuration
 * XENDIT_SECRET_KEY=your_xendit_secret_key
 * XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token
 * XENDIT_API_URL=https://api.xendit.co (optional, defaults to production)
 * 
 * # Midtrans Configuration
 * MIDTRANS_SERVER_KEY=your_midtrans_server_key
 * NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your_midtrans_client_key
 * MIDTRANS_IS_PRODUCTION=false (set to true for production)
 * MIDTRANS_API_URL=https://api.midtrans.com/v2 (optional)
 * MIDTRANS_SNAP_API_URL=https://app.midtrans.com/snap/v1 (optional)
 */

// Export environment variable documentation
export const PAYMENT_ENV_DOCS = {
  XENDIT_SECRET_KEY: 'Xendit API secret key (required for Xendit)',
  XENDIT_WEBHOOK_TOKEN: 'Xendit webhook verification token (required for webhook verification)',
  MIDTRANS_SERVER_KEY: 'Midtrans server key (required for Midtrans)',
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: 'Midtrans client key for frontend (required for Midtrans Snap)',
  MIDTRANS_IS_PRODUCTION: 'Set to "true" for production mode (default: false)',
}
