"use server"

import { createClient } from "../supabase/server"
import type { Database, Tables } from "../supabase/types"

// Custom types for wallet tables not in generated types
type Wallet = {
  id: string
  user_id: string
  balance: number
  pending_balance: number
  available_balance: number
  created_at: string
  updated_at: string
}

type WalletTransaction = {
  id: string
  wallet_id: string
  amount: number
  type: 'hold' | 'release' | 'earn' | 'payout' | 'refund'
  status: 'pending_review' | 'paid' | 'refunded' | 'disputed' | 'cancelled'
  booking_id: string | null
  description: string | null
  created_at: string
}

export type WalletResult = {
  success: boolean
  error?: string
  data?: Wallet | null
}

export type TransactionsResult = {
  success: boolean
  error?: string
  data?: WalletTransaction[]
  count?: number
}

export type WithdrawalResult = {
  success: boolean
  error?: string
  data?: {
    id: string
    amount: number
    status: string
    created_at: string
  }
}

/**
 * Get worker wallet data
 */
export async function getWorkerWallet(workerId: string): Promise<WalletResult> {
  try {
    const supabase = await createClient()

    // First get the worker's user_id
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("user_id")
      .eq("id", workerId)
      .single()

    if (workerError || !worker) {
      return { success: false, error: "Worker tidak ditemukan" }
    }

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", worker.user_id)
      .maybeSingle()

    if (error) {
      return { success: false, error: `Gagal mengambil data dompet: ${error.message}` }
    }

    // Create wallet if it doesn't exist
    if (!data) {
      const { data: newWallet, error: createError } = await supabase
        .from("wallets")
        .insert({
          user_id: worker.user_id,
          balance: 0,
          pending_balance: 0,
          available_balance: 0,
        })
        .select()
        .single()

      if (createError) {
        return { success: false, error: `Gagal membuat dompet: ${createError.message}` }
      }

      return { success: true, data: newWallet }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil data dompet" }
  }
}

/**
 * Get wallet transactions with filters
 */
export async function getTransactions(
  walletId: string,
  filters?: {
    type?: string
    status?: string
    limit?: number
    offset?: number
  }
): Promise<TransactionsResult> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("wallet_transactions" as any)
      .select("*", { count: "exact" })
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })

    if (filters?.type) {
      query = query.eq("type", filters.type)
    }

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      return { success: false, error: `Gagal mengambil transaksi: ${error.message}` }
    }

    return { success: true, data: data || [], count: count || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil transaksi" }
  }
}

/**
 * Request a withdrawal from wallet
 */
export async function requestWithdrawal(
  workerId: string,
  data: {
    amount: number
    bankAccountId: string
  }
): Promise<WithdrawalResult> {
  try {
    const supabase = await createClient()

    // Get worker's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets" as any)
      .select("*")
      .eq("worker_id", workerId)
      .single()

    if (walletError || !wallet) {
      return { success: false, error: "Dompet tidak ditemukan" }
    }

    // Check if sufficient balance
    if (wallet.balance < data.amount) {
      return { success: false, error: "Saldo tidak mencukupi" }
    }

    // Check minimum withdrawal amount
    if (data.amount < 100000) {
      return { success: false, error: "Minimal penarikan adalah Rp 100.000" }
    }

    // Calculate fee (1% or Rp 5.000, whichever is higher)
    const feeAmount = Math.max(data.amount * 0.01, 5000)
    const netAmount = data.amount - feeAmount

    // Create payout request
    const { data: payoutRequest, error: payoutError } = await supabase
      .from("payout_requests" as any)
      .insert({
        worker_id: workerId,
        amount: data.amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        bank_account_id: data.bankAccountId,
        status: "pending",
      })
      .select()
      .single()

    if (payoutError) {
      return { success: false, error: `Gagal membuat permintaan penarikan: ${payoutError.message}` }
    }

    // Deduct balance from wallet
    const { error: updateError } = await supabase
      .from("wallets" as any)
      .update({
        balance: wallet.balance - data.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)

    if (updateError) {
      // Rollback payout request
      await supabase
        .from("payout_requests" as any)
        .delete()
        .eq("id", payoutRequest.id)

      return { success: false, error: `Gagal mengupdate saldo: ${updateError.message}` }
    }

    // Create transaction record
    await supabase
      .from("wallet_transactions" as any)
      .insert({
        wallet_id: wallet.id,
        amount: data.amount,
        type: "payout",
        status: "pending_review",
        description: `Permintaan penarikan ke rekening bank`,
      })

    return {
      success: true,
      data: {
        id: payoutRequest.id,
        amount: netAmount,
        status: "pending",
        created_at: payoutRequest.created_at,
      },
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memproses penarikan" }
  }
}
