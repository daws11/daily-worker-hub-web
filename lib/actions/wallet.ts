"use server"

import { createClient } from "../supabase/server"
import type { Database, Tables } from "../supabase/types"
import { xenditGateway } from "@/lib/payments"
import { PAYMENT_CONSTANTS } from "@/lib/types/payment"

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
      .from("wallets" as any)
      .select("*")
      .eq("user_id", worker.user_id)
      .maybeSingle()

    if (error) {
      return { success: false, error: `Gagal mengambil data dompet: ${error.message}` }
    }

    // Create wallet if it doesn't exist
    if (!data) {
      const { data: newWallet, error: createError } = await supabase
        .from("wallets" as any)
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

      return { success: true, data: newWallet as unknown as Wallet }
    }

    return { success: true, data: data as unknown as Wallet }
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

    return { success: true, data: (data || []) as unknown as WalletTransaction[], count: count || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil transaksi" }
  }
}

/**
 * Request a withdrawal from wallet
 * 
 * This function handles the complete withdrawal flow:
 * 1. Validates worker balance
 * 2. Validates bank account
 * 3. Creates payout request record
 * 4. Deducts balance from wallet (hold)
 * 5. Creates Xendit disbursement
 * 6. Returns transaction ID
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

    // Get worker info
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id, user_id, full_name")
      .eq("id", workerId)
      .single()

    if (workerError || !worker) {
      return { success: false, error: "Worker tidak ditemukan" }
    }

    // Get worker's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets" as any)
      .select("*")
      .eq("worker_id", workerId)
      .maybeSingle()

    if (walletError) {
      return { success: false, error: `Gagal mengambil data dompet: ${walletError.message}` }
    }

    if (!wallet) {
      return { success: false, error: "Dompet tidak ditemukan" }
    }

    const walletData = wallet as unknown as Wallet

    // Check if sufficient balance
    if (walletData.balance < data.amount) {
      return { 
        success: false, 
        error: `Saldo tidak mencukupi. Saldo tersedia: Rp ${walletData.balance.toLocaleString('id-ID')}` 
      }
    }

    // Check minimum withdrawal amount
    if (data.amount < PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT) {
      return { 
        success: false, 
        error: `Minimal penarikan adalah Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString('id-ID')}` 
      }
    }

    // Check maximum withdrawal amount
    if (data.amount > PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT) {
      return { 
        success: false, 
        error: `Maksimal penarikan adalah Rp ${PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT.toLocaleString('id-ID')}` 
      }
    }

    // Get bank account details
    const { data: bankAccount, error: bankError } = await (supabase as any)
      .from("bank_accounts")
      .select("*")
      .eq("id", data.bankAccountId)
      .eq("worker_id", workerId)
      .single()

    if (bankError || !bankAccount) {
      return { success: false, error: "Rekening bank tidak ditemukan" }
    }

    const bankAccountData = bankAccount as { 
      id: string
      bank_code: string
      bank_account_number: string
      bank_account_name: string 
    }

    // Calculate fee (1% or minimum Rp 5,000)
    const feeAmount = Math.max(
      data.amount * PAYMENT_CONSTANTS.DEFAULT_PAYOUT_FEE_PERCENTAGE, 
      5000
    )
    const netAmount = data.amount - feeAmount

    // Generate external ID for disbursement
    const externalId = `payout-${workerId}-${Date.now()}`

    // Create payout request record (pending)
    const { data: payoutRequest, error: payoutError } = await supabase
      .from("payout_requests" as any)
      .insert({
        worker_id: workerId,
        amount: data.amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        bank_code: bankAccountData.bank_code,
        bank_account_number: bankAccountData.bank_account_number,
        bank_account_name: bankAccountData.bank_account_name,
        status: "pending",
        payment_provider: "xendit",
        metadata: {
          external_id: externalId,
          bank_account_id: data.bankAccountId,
        },
      })
      .select()
      .single()

    if (payoutError) {
      return { success: false, error: `Gagal membuat permintaan penarikan: ${payoutError.message}` }
    }

    const payoutData = payoutRequest as unknown as { 
      id: string
      created_at: string 
    }

    // Deduct balance from wallet (hold until completed)
    const { error: updateError } = await supabase
      .from("wallets" as any)
      .update({
        balance: walletData.balance - data.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletData.id)

    if (updateError) {
      // Rollback payout request
      await supabase
        .from("payout_requests" as any)
        .delete()
        .eq("id", payoutData.id)

      return { success: false, error: `Gagal mengupdate saldo: ${updateError.message}` }
    }

    // Create hold transaction record
    await supabase
      .from("wallet_transactions" as any)
      .insert({
        wallet_id: walletData.id,
        amount: data.amount,
        type: "payout",
        status: "pending_review",
        description: `Penarikan ke ${bankAccountData.bank_code} - ${bankAccountData.bank_account_number}`,
        reference_id: payoutData.id,
      })

    // Create disbursement via Xendit
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/webhooks/xendit/disbursement`
      
      const disbursement = await xenditGateway.createDisbursement({
        externalId: externalId,
        amount: netAmount,
        bankDetails: {
          bankCode: bankAccountData.bank_code,
          accountNumber: bankAccountData.bank_account_number,
          accountHolderName: bankAccountData.bank_account_name,
        },
        description: `Penarikan worker - ${worker.full_name}`,
        callbackUrl: webhookUrl || undefined,
        metadata: {
          payout_request_id: payoutData.id,
          worker_id: workerId,
          fee_amount: feeAmount,
        },
      })

      // Update payout request with provider ID
      await supabase
        .from("payout_requests" as any)
        .update({
          provider_payout_id: disbursement.id,
          status: "processing",
          provider_response: disbursement,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutData.id)

      // Update transaction status
      await supabase
        .from("wallet_transactions" as any)
        .update({ status: "paid" })
        .eq("reference_id", payoutData.id)

      return {
        success: true,
        data: {
          id: payoutData.id,
          amount: netAmount,
          status: "processing",
          created_at: payoutData.created_at,
        },
      }

    } catch (disbursementError) {
      console.error("[requestWithdrawal] Disbursement failed:", disbursementError)

      // Refund wallet balance
      await supabase
        .from("wallets" as any)
        .update({
          balance: walletData.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", walletData.id)

      // Update payout request as failed
      await supabase
        .from("payout_requests" as any)
        .update({
          status: "failed",
          failure_reason: disbursementError instanceof Error 
            ? disbursementError.message 
            : "Disbursement failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutData.id)

      // Update transaction status
      await supabase
        .from("wallet_transactions" as any)
        .update({ status: "refunded" })
        .eq("reference_id", payoutData.id)

      return { 
        success: false, 
        error: `Gagal memproses penarikan: ${disbursementError instanceof Error ? disbursementError.message : 'Unknown error'}` 
      }
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memproses penarikan" }
  }
}
