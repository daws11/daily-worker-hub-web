import { Database } from '../supabase/types'

// Payment Provider Types
export type PaymentProvider = 'xendit' | 'midtrans'

export type PaymentTransactionStatus = 'pending' | 'success' | 'failed' | 'expired'

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type BankCode = 'BCA' | 'BRI' | 'Mandiri' | 'BNI'

export type WalletType = 'business' | 'worker'

// Payment Transaction Types (QRIS for business top-ups)
export interface PaymentTransaction {
  id: string
  business_id: string
  amount: number
  status: PaymentTransactionStatus
  payment_provider: PaymentProvider
  provider_payment_id: string | null
  payment_url: string | null
  qris_expires_at: string | null
  paid_at: string | null
  failure_reason: string | null
  fee_amount: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreatePaymentInput {
  business_id: string
  amount: number
  payment_provider: PaymentProvider
  metadata?: Record<string, unknown>
}

export interface PaymentTransactionResponse {
  payment_transaction: PaymentTransaction
  payment_url: string
  expires_at: string
}

// Bank Account Types
export interface BankAccount {
  id: string
  worker_id: string
  bank_code: BankCode
  bank_account_number: string
  bank_account_name: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface CreateBankAccountInput {
  bank_code: BankCode
  bank_account_number: string
  bank_account_name: string
  is_primary?: boolean
}

export interface UpdateBankAccountInput {
  bank_account_number?: string
  bank_account_name?: string
  is_primary?: boolean
}

// Payout Request Types (Worker withdrawals)
export interface PayoutRequest {
  id: string
  worker_id: string
  amount: number
  fee_amount: number
  net_amount: number
  status: PayoutStatus
  bank_code: BankCode
  bank_account_number: string
  bank_account_name: string
  payment_provider: string
  provider_payout_id: string | null
  provider_response: Record<string, unknown>
  requested_at: string
  processed_at: string | null
  completed_at: string | null
  failed_at: string | null
  failure_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreatePayoutInput {
  worker_id: string
  amount: number
  bank_account_id?: string
}

export interface PayoutRequestResponse {
  payout_request: PayoutRequest
  estimated_arrival: string
}

// Wallet Types
export interface Wallet {
  id: string
  business_id: string | null
  worker_id: string | null
  balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WalletWithRelations extends Wallet {
  business?: {
    id: string
    name: string
  }
  worker?: {
    id: string
    full_name: string
  }
}

// Transaction History Types
export interface TransactionHistory {
  id: string
  type: 'top_up' | 'payment' | 'refund' | 'payout' | 'payout_failure'
  amount: number
  status: PaymentTransactionStatus | PayoutStatus
  description: string
  created_at: string
}

export interface WalletTransactionListParams {
  wallet_id: string
  type?: 'top_up' | 'payment' | 'refund' | 'payout' | 'all'
  page?: number
  limit?: number
}

export interface WalletTransactionListResponse {
  transactions: TransactionHistory[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Fee Calculation Types
export interface PayoutFeeCalculation {
  amount: number
  fee_amount: number
  net_amount: number
  weekly_free_payout_used: boolean
  fee_percentage: number
}

export interface PaymentFeeCalculation {
  amount: number
  fee_amount: number
  total_amount: number
  fee_percentage: number
}

// Validation Types
export interface PaymentValidationResult {
  valid: boolean
  error?: string
  min_amount?: number
  max_amount?: number
}

export interface PayoutValidationResult {
  valid: boolean
  error?: string
  available_balance?: number
  min_amount?: number
  max_amount?: number
  weekly_free_payout_remaining?: boolean
}

// Webhook Types
export interface PaymentWebhookPayload {
  id: string
  status: PaymentTransactionStatus
  provider_payment_id: string
  amount: number
  paid_at?: string
  failure_reason?: string
}

export interface PayoutWebhookPayload {
  id: string
  status: PayoutStatus
  provider_payout_id: string
  amount: number
  completed_at?: string
  failure_reason?: string
}

// Constants
export const PAYMENT_CONSTANTS = {
  MIN_TOP_UP_AMOUNT: 500000,
  MAX_TOP_UP_AMOUNT: 100000000,
  MIN_PAYOUT_AMOUNT: 100000,
  MAX_PAYOUT_AMOUNT: 100000000,
  QRIS_EXPIRY_MINUTES: 60,
  DEFAULT_PAYOUT_FEE_PERCENTAGE: 0.01, // 1%
  FREE_WEEKLY_PAYOUTS: 1,
} as const
