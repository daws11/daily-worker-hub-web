import { supabase } from "../client"
import type { Database } from "../types"

type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"]

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
 * Get all transactions for a specific wallet
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
 * Get transactions for a user (via their wallet)
 */
export async function getUserTransactions(userId: string) {
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
      console.error('Error fetching user transactions:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching user transactions:', error)
    return { data: null, error }
  }
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(transactionId: string) {
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
      console.error('Error fetching transaction:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching transaction:', error)
    return { data: null, error }
  }
}

/**
 * Filter transactions by type
 */
export async function filterTransactions(
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
      console.error('Error filtering transactions:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error filtering transactions:', error)
    return { data: null, error }
  }
}
