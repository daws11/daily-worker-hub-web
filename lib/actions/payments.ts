"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { createQrisPayment, calculatePaymentFee } from "../utils/xendit"
import { validateTopUpAmount, calculatePaymentFeeDetails } from "../utils/payment-validator"
import { PAYMENT_CONSTANTS } from "../types/payment"

type PaymentTransaction = Database["public"]["Tables"]["payment_transactions"]["Row"]
type Wallet = Database["public"]["Tables"]["wallets"]["Row"]

// Type for creating a new payment transaction
type PaymentTransactionInsert = Pick<
  PaymentTransaction,
  | "business_id"
  | "amount"
  | "status"
  | "payment_provider"
  | "provider_payment_id"
  | "payment_url"
  | "qris_expires_at"
  | "fee_amount"
  | "metadata"
>

export type PaymentResult = {
  success: boolean
  error?: string
  data?: {
    transaction: PaymentTransaction
    payment_url: string
    expires_at: string
  }
}

export type WalletBalanceResult = {
  success: boolean
  error?: string
  data?: {
    balance: number
    currency: string
  }
}

export type PaymentHistoryResult = {
  success: boolean
  error?: string
  data?: PaymentTransaction[]
  count?: number
}

/**
 * Initialize QRIS payment for business wallet top-up
 * Creates payment transaction and generates QRIS code
 */
export async function initializeQrisPayment(
  businessId: string,
  amount: number,
  metadata?: Record<string, unknown>
): Promise<PaymentResult> {
  try {
    const supabase = await createClient()

    // Validate the top-up amount
    const validation = validateTopUpAmount(amount)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Calculate payment fee (0.7% + Rp 500 for QRIS)
    const feeAmount = calculatePaymentFee(amount)
    const totalAmount = amount + feeAmount

    // Check if business exists and has a wallet
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .single()

    if (businessError || !business) {
      return { success: false, error: "Business tidak ditemukan" }
    }

    // Create payment transaction with pending status
    const externalId = `payment_${businessId}_${Date.now()}`
    const qrisExpiresAt = new Date(
      Date.now() + PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES * 60000
    ).toISOString()

    const newTransaction: PaymentTransactionInsert = {
      business_id: businessId,
      amount: totalAmount,
      status: "pending",
      payment_provider: "xendit",
      provider_payment_id: null,
      payment_url: null,
      qris_expires_at: qrisExpiresAt,
      fee_amount: feeAmount,
      metadata: metadata || {},
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert(newTransaction)
      .select()
      .single()

    if (transactionError || !transaction) {
      return { success: false, error: `Gagal membuat transaksi: ${transactionError?.message}` }
    }

    // Create QRIS payment with Xendit
    try {
      const qrisPayment = await createQrisPayment({
        external_id: transaction.id,
        amount: totalAmount,
        description: `Top-up wallet untuk ${business.name}`,
        expiry_minutes: PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES,
      })

      // Update transaction with payment details
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          payment_url: qrisPayment.payment_url,
          provider_payment_id: qrisPayment.id,
        })
        .eq("id", transaction.id)

      if (updateError) {
        return { success: false, error: `Gagal menyimpan detail pembayaran: ${updateError.message}` }
      }

      return {
        success: true,
        data: {
          transaction: { ...transaction, payment_url: qrisPayment.payment_url, provider_payment_id: qrisPayment.id },
          payment_url: qrisPayment.payment_url,
          expires_at: qrisExpiresAt,
        },
      }
    } catch (xenditError) {
      // If Xendit fails, mark transaction as failed
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          failure_reason: xenditError instanceof Error ? xenditError.message : "Gagal membuat QRIS payment",
        })
        .eq("id", transaction.id)

      return {
        success: false,
        error: `Gagal membuat QRIS payment: ${xenditError instanceof Error ? xenditError.message : "Unknown error"}`,
      }
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat inisialisasi pembayaran QRIS" }
  }
}

/**
 * Get wallet balance for a business
 */
export async function getBusinessWalletBalance(businessId: string): Promise<WalletBalanceResult> {
  try {
    const supabase = await createClient()

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance, currency")
      .eq("business_id", businessId)
      .maybeSingle()

    if (error) {
      return { success: false, error: `Gagal mengambil saldo wallet: ${error.message}` }
    }

    // If wallet doesn't exist, create one with zero balance
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from("wallets")
        .insert({
          business_id: businessId,
          worker_id: null,
          balance: 0,
          currency: "IDR",
          is_active: true,
        })
        .select("balance, currency")
        .single()

      if (createError || !newWallet) {
        return { success: false, error: `Gagal membuat wallet: ${createError?.message}` }
      }

      return { success: true, data: { balance: newWallet.balance, currency: newWallet.currency } }
    }

    return { success: true, data: { balance: wallet.balance, currency: wallet.currency } }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil saldo wallet" }
  }
}

/**
 * Get wallet balance for a worker
 */
export async function getWorkerWalletBalance(workerId: string): Promise<WalletBalanceResult> {
  try {
    const supabase = await createClient()

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance, currency")
      .eq("worker_id", workerId)
      .maybeSingle()

    if (error) {
      return { success: false, error: `Gagal mengambil saldo wallet: ${error.message}` }
    }

    // If wallet doesn't exist, create one with zero balance
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from("wallets")
        .insert({
          business_id: null,
          worker_id: workerId,
          balance: 0,
          currency: "IDR",
          is_active: true,
        })
        .select("balance, currency")
        .single()

      if (createError || !newWallet) {
        return { success: false, error: `Gagal membuat wallet: ${createError?.message}` }
      }

      return { success: true, data: { balance: newWallet.balance, currency: newWallet.currency } }
    }

    return { success: true, data: { balance: wallet.balance, currency: wallet.currency } }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil saldo wallet" }
  }
}

/**
 * Get payment transaction history for a business
 */
export async function getBusinessPaymentHistory(
  businessId: string,
  status?: "pending" | "success" | "failed" | "expired"
): Promise<PaymentHistoryResult> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("payment_transactions")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: `Gagal mengambil riwayat pembayaran: ${error.message}` }
    }

    return { success: true, data: data || [], count: data?.length || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil riwayat pembayaran" }
  }
}

/**
 * Get payment transaction details by ID
 */
export async function getPaymentTransactionDetails(
  transactionId: string,
  businessId: string
): Promise<{
  success: boolean
  error?: string
  data?: PaymentTransaction
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("business_id", businessId)
      .single()

    if (error || !data) {
      return { success: false, error: "Transaksi tidak ditemukan" }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil detail transaksi" }
  }
}

/**
 * Calculate payment fee for a given amount
 * Returns fee breakdown including percentage and fixed fee
 */
export async function calculateTopUpFee(amount: number): Promise<{
  success: boolean
  error?: string
  data?: {
    amount: number
    fee_amount: number
    total_amount: number
    fee_percentage: number
  }
}> {
  try {
    // Validate amount first
    const validation = validateTopUpAmount(amount)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const { feeAmount, totalAmount } = calculatePaymentFeeDetails(amount)

    return {
      success: true,
      data: {
        amount,
        fee_amount: feeAmount,
        total_amount: totalAmount,
        fee_percentage: 0.007, // 0.7% for QRIS
      },
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menghitung biaya top up" }
  }
}
