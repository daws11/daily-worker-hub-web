import { supabase } from "../client"
import type { Database } from "../types"

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"]
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
