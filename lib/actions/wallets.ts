"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"

type Wallet = Database["public"]["Tables"]["wallets"]["Row"]
type WalletTransaction = Database["public"]["Tables"]["wallet_transactions"]["Row"]

// Type for inserting a new wallet
type WalletInsert = Pick<Wallet, 'user_id' | 'pending_balance' | 'available_balance'>

// Type for inserting a new wallet transaction
type WalletTransactionInsert = Pick<WalletTransaction, 'wallet_id' | 'booking_id' | 'amount' | 'type' | 'status' | 'description' | 'metadata'>

export type WalletResult = {
  success: boolean
  error?: string
  data?: Wallet
}

export type WalletBalanceResult = {
  success: boolean
  error?: string
  data?: {
    pending_balance: number
    available_balance: number
  }
}

export type WalletTransactionResult = {
  success: boolean
  error?: string
  data?: WalletTransaction
}

export type WalletTransactionsListResult = {
  success: boolean
  error?: string
  data?: WalletTransaction[]
  count?: number
}

/**
 * Create a new wallet for a user
 * Should be called when a new user registers
 */
export async function createWalletAction(userId: string): Promise<WalletResult> {
  try {
    const supabase = await createClient()

    // Check if wallet already exists
    const { data: existingWallet, error: checkError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      return { success: false, error: "Gagal mengecek status dompet" }
    }

    if (existingWallet) {
      return { success: false, error: "Dompet sudah ada" }
    }

    // Create the new wallet
    const newWallet: WalletInsert = {
      user_id: userId,
      pending_balance: 0,
      available_balance: 0,
    }

    const { data, error } = await supabase
      .from("wallets")
      .insert(newWallet)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membuat dompet: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat dompet" }
  }
}

/**
 * Get wallet balance for a user
 * Returns both pending and available balance
 */
export async function getWalletBalanceAction(userId: string): Promise<WalletBalanceResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("wallets")
      .select("pending_balance, available_balance")
      .eq("user_id", userId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Dompet tidak ditemukan" }
      }
      return { success: false, error: `Gagal mengambil saldo dompet: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil saldo dompet" }
  }
}

/**
 * Get or create wallet for a user
 * Returns existing wallet or creates a new one if it doesn't exist
 */
export async function getOrCreateWalletAction(userId: string): Promise<WalletResult> {
  try {
    const supabase = await createClient()

    // First try to get existing wallet
    const { data: existingWallet, error: fetchError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      return { success: false, error: "Gagal mengambil data dompet" }
    }

    // If wallet exists, return it
    if (existingWallet) {
      return { success: true, data: existingWallet }
    }

    // Create new wallet
    const newWallet: WalletInsert = {
      user_id: userId,
      pending_balance: 0,
      available_balance: 0,
    }

    const { data, error } = await supabase
      .from("wallets")
      .insert(newWallet)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membuat dompet: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil atau membuat dompet" }
  }
}

/**
 * Add funds to pending balance
 * Called when a worker completes a job
 */
export async function addPendingFundsAction(
  userId: string,
  amount: number,
  bookingId: string,
  description?: string
): Promise<WalletResult> {
  try {
    const supabase = await createClient()

    // Get the user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (walletError || !wallet) {
      return { success: false, error: "Dompet tidak ditemukan" }
    }

    // Calculate new pending balance
    const newPendingBalance = Number(wallet.pending_balance) + amount

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await supabase
      .from("wallets")
      .update({
        pending_balance: newPendingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal menambahkan dana: ${updateError.message}` }
    }

    // Create transaction record
    const transaction: WalletTransactionInsert = {
      wallet_id: wallet.id,
      booking_id: bookingId,
      amount,
      type: "hold",
      status: "pending_review",
      description: description || "Pembayaran pekerjaan selesai",
      metadata: {},
    }

    const { error: transactionError } = await supabase
      .from("wallet_transactions")
      .insert(transaction)

    if (transactionError) {
      // Log but don't fail - wallet was updated successfully
      console.error("Gagal membuat catatan transaksi:", transactionError)
    }

    return { success: true, data: updatedWallet }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menambahkan dana" }
  }
}

/**
 * Release funds from pending to available balance
 * Called after the review period expires
 */
export async function releaseFundsAction(
  userId: string,
  amount: number,
  bookingId: string,
  description?: string
): Promise<WalletResult> {
  try {
    const supabase = await createClient()

    // Get the user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (walletError || !wallet) {
      return { success: false, error: "Dompet tidak ditemukan" }
    }

    // Check if sufficient pending balance
    if (Number(wallet.pending_balance) < amount) {
      return { success: false, error: "Saldo pending tidak mencukupi" }
    }

    // Calculate new balances
    const newPendingBalance = Number(wallet.pending_balance) - amount
    const newAvailableBalance = Number(wallet.available_balance) + amount

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await supabase
      .from("wallets")
      .update({
        pending_balance: newPendingBalance,
        available_balance: newAvailableBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal melepaskan dana: ${updateError.message}` }
    }

    // Update transaction status to released
    const { error: transactionUpdateError } = await supabase
      .from("wallet_transactions")
      .update({ status: "released" })
      .eq("booking_id", bookingId)
      .eq("wallet_id", wallet.id)
      .eq("status", "pending_review")

    if (transactionUpdateError) {
      // Log but don't fail - wallet was updated successfully
      console.error("Gagal memperbarui status transaksi:", transactionUpdateError)
    }

    // Create release transaction record
    const releaseTransaction: WalletTransactionInsert = {
      wallet_id: wallet.id,
      booking_id: bookingId,
      amount,
      type: "release",
      status: "released",
      description: description || "Dana tersedia untuk penarikan",
      metadata: {},
    }

    const { error: transactionError } = await supabase
      .from("wallet_transactions")
      .insert(releaseTransaction)

    if (transactionError) {
      // Log but don't fail - wallet was updated successfully
      console.error("Gagal membuat catatan transaksi:", transactionError)
    }

    return { success: true, data: updatedWallet }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat melepaskan dana" }
  }
}

/**
 * Deduct funds from available balance
 * Called when a worker withdraws funds
 */
export async function deductAvailableFundsAction(
  userId: string,
  amount: number,
  description?: string
): Promise<WalletResult> {
  try {
    const supabase = await createClient()

    // Get the user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (walletError || !wallet) {
      return { success: false, error: "Dompet tidak ditemukan" }
    }

    // Check if sufficient available balance
    if (Number(wallet.available_balance) < amount) {
      return { success: false, error: "Saldo tersedia tidak mencukupi" }
    }

    // Calculate new available balance
    const newAvailableBalance = Number(wallet.available_balance) - amount

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await supabase
      .from("wallets")
      .update({
        available_balance: newAvailableBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal mengurangi dana: ${updateError.message}` }
    }

    // Create transaction record
    const transaction: WalletTransactionInsert = {
      wallet_id: wallet.id,
      booking_id: null,
      amount,
      type: "payout",
      status: "released",
      description: description || "Penarikan dana",
      metadata: {},
    }

    const { error: transactionError } = await supabase
      .from("wallet_transactions")
      .insert(transaction)

    if (transactionError) {
      // Log but don't fail - wallet was updated successfully
      console.error("Gagal membuat catatan transaksi:", transactionError)
    }

    return { success: true, data: updatedWallet }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengurangi dana" }
  }
}

/**
 * Get wallet transactions for a user
 */
export async function getWalletTransactionsAction(
  userId: string,
  limit: number = 50
): Promise<WalletTransactionsListResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("wallet_transactions")
      .select(`
        *,
        wallet:wallets!inner(
          id,
          user_id
        ),
        booking:bookings(
          id,
          job:jobs(
            id,
            title
          )
        )
      `)
      .eq("wallets.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: `Gagal mengambil riwayat transaksi: ${error.message}` }
    }

    return { success: true, data, count: data?.length || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil riwayat transaksi" }
  }
}

/**
 * Get wallet details for a user
 */
export async function getWalletDetailsAction(userId: string): Promise<WalletResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Dompet tidak ditemukan" }
      }
      return { success: false, error: `Gagal mengambil data dompet: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil data dompet" }
  }
}
