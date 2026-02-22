/**
 * Xendit API Client
 *
 * Provides functions for interacting with Xendit payment gateway:
 * - Creating QRIS payments for business wallet top-ups
 * - Creating payouts/discharges for worker withdrawals
 * - Verifying webhook signatures for secure callback handling
 *
 * @see https://developers.xendit.co/
 */

// Xendit API Configuration
const XENDIT_API_URL = 'https://api.xendit.co'
const XENDIT_API_VERSION = 'v2'

/**
 * Get Xendit secret API key from environment
 * @throws {Error} If XENDIT_SECRET_KEY is not set
 */
function getApiKey(): string {
  const apiKey = process.env.XENDIT_SECRET_KEY
  if (!apiKey) {
    throw new Error('XENDIT_SECRET_KEY environment variable is not set')
  }
  return apiKey
}

/**
 * Get Xendit webhook token for signature verification
 * @throws {Error} If XENDIT_WEBHOOK_TOKEN is not set
 */
function getWebhookToken(): string {
  const token = process.env.XENDIT_WEBHOOK_TOKEN
  if (!token) {
    throw new Error('XENDIT_WEBHOOK_TOKEN environment variable is not set')
  }
  return token
}

/**
 * Make an authenticated request to Xendit API
 *
 * @param endpoint - API endpoint path
 * @param options - Request options (method, body, etc.)
 * @returns Response data from Xendit API
 * @throws {Error} If the request fails or returns an error
 */
async function xenditRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()
  const url = `${XENDIT_API_URL}/${XENDIT_API_VERSION}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(apiKey + ':')}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Xendit API error (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T>
}

/**
 * QRIS Payment Creation Request
 */
export interface CreateQrisPaymentInput {
  /** Unique identifier for the payment (e.g., transaction ID) */
  external_id: string
  /** Payment amount in IDR */
  amount: number
  /** Payment description */
  description: string
  /** QRIS expiry time in minutes (default: 60) */
  expiry_minutes?: number
}

/**
 * QRIS Payment Response from Xendit
 */
export interface QrisPaymentResponse {
  /** Xendit payment ID */
  id: string
  /** External ID provided in request */
  external_id: string
  /** Payment amount in IDR */
  amount: number
  /** Payment status */
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'FAILED'
  /** QRIS payment URL (contains QR code) */
  payment_url: string
  /** QR code string for display */
  qr_string: string
  /** Payment expiry timestamp */
  expires_at: string
  /** Payment creation timestamp */
  created: string
}

/**
 * Create a QRIS payment for business wallet top-up
 *
 * @param input - QRIS payment creation parameters
 * @returns QRIS payment response with payment URL and QR code
 * @throws {Error} If payment creation fails
 *
 * @example
 * ```ts
 * const payment = await createQrisPayment({
 *   external_id: 'txn_12345',
 *   amount: 500000,
 *   description: 'Wallet top-up for business ACME Corp',
 *   expiry_minutes: 60,
 * })
 * console.log(payment.payment_url) // Show QR code to user
 * ```
 */
export async function createQrisPayment(
  input: CreateQrisPaymentInput
): Promise<QrisPaymentResponse> {
  try {
    const response = await xenditRequest<QrisPaymentResponse>(
      '/payments/create',
      {
        method: 'POST',
        body: JSON.stringify({
          'payment_method': {
            'type': 'QRIS',
            'reusability': 'ONE_TIME_USE',
            'qr_string': `DM-${input.external_id}`,
            'amount': input.amount,
            'currency': 'IDR',
            'expires_at': new Date(
              Date.now() + (input.expiry_minutes || 60) * 60000
            ).toISOString(),
          },
          'customer': {
            'given_names': input.description,
          },
          'description': input.description,
          'external_id': input.external_id,
          'amount': input.amount,
          'invoice_duration': (input.expiry_minutes || 60) * 60, // Convert to seconds
        }),
      }
    )

    return response
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create QRIS payment: ${error.message}`)
    }
    throw new Error('Failed to create QRIS payment: Unknown error')
  }
}

/**
 * Payout/Disbursement Creation Request
 */
export interface CreatePayoutInput {
  /** Unique identifier for the payout (e.g., payout request ID) */
  external_id: string
  /** Payout amount in IDR */
  amount: number
  /** Bank code (BCA, BRI, MANDIRI, BNI) */
  bank_code: string
  /** Bank account number */
  account_number: string
  /** Bank account holder name */
  account_holder_name: string
  /** Description for the payout */
  description?: string
  /** Email for notification */
  email_to?: string
}

/**
 * Payout/Disbursement Response from Xendit
 */
export interface PayoutResponse {
  /** Xendit payout ID */
  id: string
  /** External ID provided in request */
  external_id: string
  /** Payout amount in IDR */
  amount: number
  /** Bank code */
  bank_code: string
  /** Bank account number (masked) */
  account_number: string
  /** Payout status */
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REJECTED'
  /** Payout creation timestamp */
  created: string
  /** Estimated arrival date */
  estimated_arrival_date?: string
  /** Failure reason (if failed) */
  failure_reason?: string
}

/**
 * Create a payout/disbursement for worker withdrawal
 *
 * @param input - Payout creation parameters
 * @returns Payout response with status and details
 * @throws {Error} If payout creation fails
 *
 * @example
 * ```ts
 * const payout = await createPayout({
 *   external_id: 'payout_12345',
 *   amount: 500000,
 *   bank_code: 'BCA',
 *   account_number: '1234567890',
 *   account_holder_name: 'John Doe',
 *   description: 'Weekly withdrawal',
 * })
 * console.log(payout.status) // Track payout progress
 * ```
 */
export async function createPayout(
  input: CreatePayoutInput
): Promise<PayoutResponse> {
  try {
    const response = await xenditRequest<PayoutResponse>(
      '/disbursements',
      {
        method: 'POST',
        body: JSON.stringify({
          external_id: input.external_id,
          amount: input.amount,
          bank_code: input.bank_code,
          account_number: input.account_number,
          account_holder_name: input.account_holder_name,
          description: input.description || 'Worker withdrawal',
          email_to: input.email_to,
        }),
      }
    )

    return response
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create payout: ${error.message}`)
    }
    throw new Error('Failed to create payout: Unknown error')
  }
}

/**
 * Get payout status by Xendit payout ID
 *
 * @param payoutId - Xendit payout ID
 * @returns Payout status and details
 * @throws {Error} If request fails
 *
 * @example
 * ```ts
 * const payout = await getPayoutStatus('disb_12345')
 * console.log(payout.status) // Check if payout is completed
 * ```
 */
export async function getPayoutStatus(
  payoutId: string
): Promise<PayoutResponse> {
  try {
    const response = await xenditRequest<PayoutResponse>(
      `/disbursements/${payoutId}`
    )
    return response
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get payout status: ${error.message}`)
    }
    throw new Error('Failed to get payout status: Unknown error')
  }
}

/**
 * Verify Xendit webhook signature
 *
 * Xendit sends a signature in the `X-Callback-Token` header
 * that should be verified to ensure the webhook is authentic.
 *
 * @param signature - Signature from X-Callback-Token header
 * @param token - Webhook verification token (defaults to XENDIT_WEBHOOK_TOKEN env)
 * @returns True if signature is valid, false otherwise
 *
 * @example
 * ```ts
 * // In Edge Function handler
 * const signature = request.headers.get('X-Callback-Token')
 * if (!verifyWebhookSignature(signature)) {
 *   return new Response('Invalid signature', { status: 401 })
 * }
 * ```
 */
export function verifyWebhookSignature(
  signature: string | null,
  token?: string
): boolean {
  if (!signature) {
    return false
  }

  const webhookToken = token || getWebhookToken()

  // Xendit webhook token verification is a direct string comparison
  // The webhook token should match the callback token header
  return signature === webhookToken
}

/**
 * Calculate Xendit payment fee
 *
 * QRIS payment fees are typically a percentage of the transaction amount
 * plus a fixed fee.
 *
 * @param amount - Transaction amount in IDR
 * @param feePercentage - Fee percentage (default: 0.7% for QRIS)
 * @param fixedFee - Fixed fee in IDR (default: Rp 500)
 * @returns Total fee amount in IDR
 *
 * @example
 * ```ts
 * const fee = calculatePaymentFee(500000)
 * console.log(fee) // 4000 (0.7% of 500000 + 500)
 * ```
 */
export function calculatePaymentFee(
  amount: number,
  feePercentage: number = 0.007,
  fixedFee: number = 500
): number {
  const variableFee = Math.floor(amount * feePercentage)
  return variableFee + fixedFee
}

/**
 * Calculate Xendit payout fee
 *
 * Payout fees vary by bank and transfer amount.
 *
 * @param amount - Payout amount in IDR
 * @param bankCode - Bank code for fee calculation
 * @returns Total fee amount in IDR
 *
 * @example
 * ```ts
 * const fee = calculatePayoutFee(500000, 'BCA')
 * console.log(fee) // Fee amount varies by bank
 * ```
 */
export function calculatePayoutFee(
  amount: number,
  bankCode: string
): number {
  // Xendit payout fees (as of 2024):
  // - BCA, BNI, BRI: Rp 4.000 for amounts <= Rp 250.000, Rp 6.000 for larger amounts
  // - Mandiri: Rp 5.000 for amounts <= Rp 250.000, Rp 7.500 for larger amounts

  const isLargeAmount = amount > 250000

  switch (bankCode.toUpperCase()) {
    case 'BCA':
    case 'BNI':
    case 'BRI':
      return isLargeAmount ? 6000 : 4000
    case 'MANDIRI':
      return isLargeAmount ? 7500 : 5000
    default:
      // Default to higher fee for unknown banks
      return isLargeAmount ? 7500 : 5000
  }
}

/**
 * Validate Xendit API credentials
 *
 * Tests if the provided API key is valid by making a simple API call.
 *
 * @returns True if API credentials are valid, false otherwise
 *
 * @example
 * ```ts
 * const isValid = await validateCredentials()
 * if (!isValid) {
 *   console.error('Invalid Xendit credentials')
 * }
 * ```
 */
export async function validateCredentials(): Promise<boolean> {
  try {
    // Try to get balance as a simple validation check
    await xenditRequest<{ balance: number }>('/balances')
    return true
  } catch {
    return false
  }
}

/**
 * Convert Xendit payment status to application status
 *
 * Maps Xendit payment statuses to internal application statuses.
 *
 * @param xenditStatus - Xendit payment status
 * @returns Internal application status
 *
 * @example
 * ```ts
 * const appStatus = mapPaymentStatus('COMPLETED') // 'success'
 * ```
 */
export function mapPaymentStatus(
  xenditStatus: string
): 'pending' | 'success' | 'failed' | 'expired' {
  const statusMap: Record<string, 'pending' | 'success' | 'failed' | 'expired'> =
    {
      'PENDING': 'pending',
      'COMPLETED': 'success',
      'FAILED': 'failed',
      'EXPIRED': 'expired',
    }

  return statusMap[xenditStatus] || 'pending'
}

/**
 * Convert Xendit payout status to application status
 *
 * Maps Xendit payout statuses to internal application statuses.
 *
 * @param xenditStatus - Xendit payout status
 * @returns Internal application status
 *
 * @example
 * ```ts
 * const appStatus = mapPayoutStatus('COMPLETED') // 'completed'
 * ```
 */
export function mapPayoutStatus(
  xenditStatus: string
): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const statusMap: Record<
    string,
    'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  > = {
    'PENDING': 'processing',
    'COMPLETED': 'completed',
    'FAILED': 'failed',
    'REJECTED': 'failed',
  }

  return statusMap[xenditStatus] || 'pending'
}
