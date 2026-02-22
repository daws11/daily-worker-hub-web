import { supabase } from '../client'
import type { Database } from '../types'

// ============================================
// WALLET TRANSACTIONS (Internal wallet transactions)
// ============================================

type WalletTransactionRow = Database['public']['Tables']['wallet_transactions']['Row']

export type WalletTransactionWithDetails = WalletTransactionRow & {
  wallet: {
    id: string
    user_id: string
  }
  booking?: {
    id: string
    job_id: string
  } | null
}

/**
 * Get all wallet transactions for a specific wallet
 */
export async function getWalletTransactions(walletId: string) {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        wallet:wallets!inner(
          id,
          user_id
        ),
        booking:bookings(
          id,
          job_id
        )
      `)
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching wallet transactions:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching wallet transactions:', error)
    return { data: null, error }
  }
}

/**
 * Get wallet transactions for a user (via their wallet)
 */
export async function getUserWalletTransactions(userId: string) {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        wallet:wallets!inner(
          id,
          user_id
        ),
        booking:bookings(
          id,
          job_id
        )
      `)
      .eq('wallet.user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user wallet transactions:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching user wallet transactions:', error)
    return { data: null, error }
  }
}

/**
 * Get a single wallet transaction by ID
 */
export async function getWalletTransactionById(transactionId: string) {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        wallet:wallets!inner(
          id,
          user_id
        ),
        booking:bookings(
          id,
          job_id
        )
      `)
      .eq('id', transactionId)
      .single()

    if (error) {
      console.error('Error fetching wallet transaction:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching wallet transaction:', error)
    return { data: null, error }
  }
}

/**
 * Filter wallet transactions by type
 */
export async function filterWalletTransactions(
  walletId: string,
  type?: 'credit' | 'debit' | 'pending' | 'released'
) {
  try {
    let query = supabase
      .from('wallet_transactions')
      .select(`
        *,
        wallet:wallets!inner(
          id,
          user_id
        ),
        booking:bookings(
          id,
          job_id
        )
      `)
      .eq('wallet_id', walletId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error filtering wallet transactions:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error filtering wallet transactions:', error)
    return { data: null, error }
  }
}

// ============================================
// PAYMENT TRANSACTIONS (QRIS/Xendit payments)
// ============================================

type PaymentTransactionsRow = Database['public']['Tables']['payment_transactions']['Row']
type PaymentTransactionsInsert = Database['public']['Tables']['payment_transactions']['Insert']
type PaymentTransactionsUpdate = Database['public']['Tables']['payment_transactions']['Update']
type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired'
type PaymentProvider = 'xendit' | 'midtrans'

type PaymentTransactionWithRelations = PaymentTransactionsRow & {
  business?: {
    id: string
    name: string
  }
}

/**
 * Create a new payment transaction (QRIS top-up)
 */
export async function createPaymentTransaction(
  transactionData: Omit<PaymentTransactionsInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<PaymentTransactionsRow> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .insert(transactionData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create payment transaction: ${error.message}`)
  }

  return data
}

/**
 * Update an existing payment transaction
 */
export async function updatePaymentTransaction(
  transactionId: string,
  updates: PaymentTransactionsUpdate
): Promise<PaymentTransactionsRow> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update payment transaction: ${error.message}`)
  }

  return data
}

/**
 * Get a single payment transaction by ID
 */
export async function getPaymentTransactionById(
  transactionId: string
): Promise<PaymentTransactionWithRelations | null> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select(`
      *,
      business:businesses(id, name)
    `)
    .eq('id', transactionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch payment transaction: ${error.message}`)
  }

  return data
}

/**
 * Get all payment transactions for a specific business
 */
export async function getBusinessPaymentTransactions(
  businessId: string,
  status?: PaymentStatus
): Promise<PaymentTransactionsRow[]> {
  let query = supabase
    .from('payment_transactions')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch business payment transactions: ${error.message}`)
  }

  return data || []
}

/**
 * Get pending payment transactions (for webhook processing or expiry checks)
 */
export async function getPendingPaymentTransactions(): Promise<PaymentTransactionsRow[]> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch pending payment transactions: ${error.message}`)
  }

  return data || []
}

/**
 * Get expired pending transactions (QRIS expired)
 */
export async function getExpiredPaymentTransactions(): Promise<PaymentTransactionsRow[]> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('status', 'pending')
    .lt('qris_expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch expired payment transactions: ${error.message}`)
  }

  return data || []
}

/**
 * Mark transaction as paid (success) - typically called from webhook handler
 */
export async function markTransactionAsPaid(
  transactionId: string,
  providerPaymentId: string
): Promise<PaymentTransactionsRow> {
  return updatePaymentTransaction(transactionId, {
    status: 'success',
    provider_payment_id: providerPaymentId,
    paid_at: new Date().toISOString(),
  })
}

/**
 * Mark transaction as failed - typically called from webhook handler
 */
export async function markTransactionAsFailed(
  transactionId: string,
  failureReason: string
): Promise<PaymentTransactionsRow> {
  return updatePaymentTransaction(transactionId, {
    status: 'failed',
    failure_reason: failureReason,
  })
}

/**
 * Mark transaction as expired (for scheduled expiry checks)
 */
export async function markTransactionAsExpired(
  transactionId: string
): Promise<PaymentTransactionsRow> {
  return updatePaymentTransaction(transactionId, {
    status: 'expired',
  })
}

/**
 * Update payment URL and QRIS expiry for a transaction
 */
export async function updatePaymentDetails(
  transactionId: string,
  paymentUrl: string,
  qrisExpiresAt: string
): Promise<PaymentTransactionsRow> {
  return updatePaymentTransaction(transactionId, {
    payment_url: paymentUrl,
    qris_expires_at: qrisExpiresAt,
  })
}

/**
 * Get transaction by provider payment ID (for webhook lookup)
 */
export async function getTransactionByProviderPaymentId(
  providerPaymentId: string
): Promise<PaymentTransactionWithRelations | null> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select(`
      *,
      business:businesses(id, name)
    `)
    .eq('provider_payment_id', providerPaymentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch transaction by provider ID: ${error.message}`)
  }

  return data
}

/**
 * Get transaction statistics for a business
 */
export async function getBusinessPaymentStats(businessId: string): Promise<{
  total_transactions: number
  total_amount: number
  successful_amount: number
  pending_amount: number
}> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('status, amount')
    .eq('business_id', businessId)

  if (error) {
    throw new Error(`Failed to fetch business payment stats: ${error.message}`)
  }

  const transactions = data || []
  const successful = transactions.filter((t) => t.status === 'success')
  const pending = transactions.filter((t) => t.status === 'pending')

  return {
    total_transactions: transactions.length,
    total_amount: transactions.reduce((sum, t) => sum + t.amount, 0),
    successful_amount: successful.reduce((sum, t) => sum + t.amount, 0),
    pending_amount: pending.reduce((sum, t) => sum + t.amount, 0),
  }
}

// ============================================
// LEGACY ALIAS (for backward compatibility)
// ============================================

/** @deprecated Use getUserWalletTransactions instead */
export async function getUserTransactions(userId: string) {
  return getUserWalletTransactions(userId)
}

/** @deprecated Use getWalletTransactionById instead */
export async function getTransactionById(transactionId: string) {
  return getWalletTransactionById(transactionId)
}

/** @deprecated Use filterWalletTransactions instead */
export async function filterTransactions(
  walletId: string,
  type?: 'credit' | 'debit' | 'pending' | 'released'
) {
  return filterWalletTransactions(walletId, type)
}
