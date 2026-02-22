import { supabase } from '../client'
import type { Database } from '../types'

type WalletsRow = Database['public']['Tables']['wallets']['Row']

/**
 * Create a new wallet
 */
export async function createWallet(
  walletData: Omit<WalletsRow, 'id' | 'created_at' | 'updated_at'>
): Promise<WalletsRow> {
  const { data, error } = await supabase
    .from('wallets')
    .insert(walletData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create wallet: ${error.message}`)
  }

  return data
}

/**
 * Update an existing wallet
 */
export async function updateWallet(
  walletId: string,
  updates: Partial<Pick<WalletsRow, 'balance' | 'currency' | 'is_active'>>
): Promise<WalletsRow> {
  const { data, error } = await supabase
    .from('wallets')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update wallet: ${error.message}`)
  }

  return data
}

/**
 * Get a single wallet by ID
 */
export async function getWalletById(walletId: string): Promise<WalletsRow | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('id', walletId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch wallet: ${error.message}`)
  }

  return data
}

/**
 * Get wallet by business ID
 */
export async function getBusinessWallet(businessId: string): Promise<WalletsRow | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch business wallet: ${error.message}`)
  }

  return data
}

/**
 * Get wallet by worker ID
 */
export async function getWorkerWallet(workerId: string): Promise<WalletsRow | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('worker_id', workerId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch worker wallet: ${error.message}`)
  }

  return data
}

/**
 * Get or create business wallet
 * Creates a new wallet if one doesn't exist
 */
export async function getOrCreateBusinessWallet(
  businessId: string,
  currency: string = 'IDR'
): Promise<WalletsRow> {
  const existingWallet = await getBusinessWallet(businessId)

  if (existingWallet) {
    return existingWallet
  }

  return createWallet({
    business_id: businessId,
    worker_id: null,
    balance: 0,
    currency,
    is_active: true,
  })
}

/**
 * Get or create worker wallet
 * Creates a new wallet if one doesn't exist
 */
export async function getOrCreateWorkerWallet(
  workerId: string,
  currency: string = 'IDR'
): Promise<WalletsRow> {
  const existingWallet = await getWorkerWallet(workerId)

  if (existingWallet) {
    return existingWallet
  }

  return createWallet({
    business_id: null,
    worker_id: workerId,
    balance: 0,
    currency,
    is_active: true,
  })
}

/**
 * Add funds to a wallet (credit)
 */
export async function creditWallet(
  walletId: string,
  amount: number
): Promise<WalletsRow> {
  // First get current balance
  const wallet = await getWalletById(walletId)
  if (!wallet) {
    throw new Error('Wallet not found')
  }

  const newBalance = wallet.balance + amount

  return updateWallet(walletId, { balance: newBalance })
}

/**
 * Deduct funds from a wallet (debit)
 */
export async function debitWallet(
  walletId: string,
  amount: number
): Promise<WalletsRow> {
  // First get current balance
  const wallet = await getWalletById(walletId)
  if (!wallet) {
    throw new Error('Wallet not found')
  }

  if (wallet.balance < amount) {
    throw new Error('Insufficient wallet balance')
  }

  const newBalance = wallet.balance - amount

  return updateWallet(walletId, { balance: newBalance })
}

/**
 * Deactivate a wallet
 */
export async function deactivateWallet(walletId: string): Promise<WalletsRow> {
  return updateWallet(walletId, { is_active: false })
}

/**
 * Activate a wallet
 */
export async function activateWallet(walletId: string): Promise<WalletsRow> {
  return updateWallet(walletId, { is_active: true })
}

/**
 * Delete a wallet
 */
export async function deleteWallet(walletId: string): Promise<void> {
  const { error } = await supabase
    .from('wallets')
    .delete()
    .eq('id', walletId)

  if (error) {
    throw new Error(`Failed to delete wallet: ${error.message}`)
  }
}
