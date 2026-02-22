import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"]
type WalletInsert = Database["public"]["Tables"]["wallets"]["Insert"]
type WalletUpdate = Database["public"]["Tables"]["wallets"]["Update"]

/**
 * Get wallet by user ID
 */
export async function getWallet(userId: string) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching wallet:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching wallet:', error)
    return { data: null, error }
  }
}

/**
 * Get wallet by wallet ID
 */
export async function getWalletById(walletId: string) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single()

    if (error) {
      console.error('Error fetching wallet by ID:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching wallet by ID:', error)
    return { data: null, error }
  }
}

/**
 * Create a new wallet for a user
 */
export async function createWallet(userId: string) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .insert({ user_id: userId })
      .select()
      .single()

    if (error) {
      console.error('Error creating wallet:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error creating wallet:', error)
    return { data: null, error }
  }
}

/**
 * Update wallet balance
 * This function should be used when adding or subtracting from the balance
 */
export async function updateBalance(
  walletId: string,
  newBalance: number
) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', walletId)
      .select()
      .single()

    if (error) {
      console.error('Error updating wallet balance:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error updating wallet balance:', error)
    return { data: null, error }
  }
}

/**
 * Calculate pending balance from pending transactions
 * Returns the sum of all pending transactions for a wallet
 */
export async function calculatePendingBalance(walletId: string) {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('wallet_id', walletId)
      .eq('type', 'pending')

    if (error) {
      console.error('Error calculating pending balance:', error)
      return { data: null, error }
    }

    const pendingBalance = data?.reduce((sum: number, transaction: any) => sum + Number(transaction.amount), 0) ?? 0

    return { data: pendingBalance, error: null }
  } catch (error) {
    console.error('Unexpected error calculating pending balance:', error)
    return { data: null, error }
  }
}

/**
 * Get total earnings from credit transactions
 * Returns the sum of all credit (income) transactions for a wallet
 */
export async function getTotalEarnings(walletId: string) {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('wallet_id', walletId)
      .eq('type', 'credit')

    if (error) {
      console.error('Error calculating total earnings:', error)
      return { data: null, error }
    }

    const totalEarnings = data?.reduce((sum: number, transaction: any) => sum + Number(transaction.amount), 0) ?? 0

    return { data: totalEarnings, error: null }
  } catch (error) {
    console.error('Unexpected error calculating total earnings:', error)
    return { data: null, error }
  }
}
