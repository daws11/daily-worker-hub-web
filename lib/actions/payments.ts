"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
<<<<<<< HEAD
import { createQrisPayment, calculatePaymentFee, createPayout, calculatePayoutFee } from "../utils/xendit"
import { validateTopUpAmount, calculatePaymentFeeDetails, validatePaymentAmount } from "../utils/payment-validator"
import { PAYMENT_CONSTANTS } from "../types/payment"

type PaymentTransaction = {
  id: string
  business_id: string
  amount: number
  fee_amount: number
  type: 'credit' | 'debit' | 'pending' | 'released'
  status: 'success' | 'pending' | 'failed' | 'expired'
  payment_provider: string
  provider_payment_id: string | null
  payment_url: string | null
  qris_expires_at: string | null
  metadata: Record<string, any> | null
  created_at: string
}

type Wallet = {
  id: string
  business_id: string | null
  worker_id: string | null
  balance: number
  pending_balance: number
  created_at: string
  updated_at: string
}

type PayoutRequest = {
  id: string
  worker_id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  bank_account_id: string | null
  fee_amount: number
  total_amount: number
  net_amount?: number
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

type BankAccount = {
  id: string
  worker_id: string
  bank_code: string
  bank_account_number: string
  bank_account_name: string
  is_default: boolean
  created_at: string
}

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

export type PayoutRequestResult = {
  success: boolean
  error?: string
  data?: {
    payout_request: PayoutRequest
    estimated_arrival?: string
  }
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

    const { data: transaction, error: transactionError } = await (supabase as any)
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
      const { error: updateError } = await (supabase as any)
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
      await (supabase as any)
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
=======

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type Wallet = Database["public"]["Tables"]["wallets"]["Row"]

// Type for updating a booking's payment status
type BookingPaymentUpdate = Pick<Booking, 'payment_status'>

export type PaymentReleaseResult = {
  success: boolean
  error?: string
  data?: Booking
}

export type BatchPaymentReleaseResult = {
  success: boolean
  error?: string
  released_count?: number
  failed_count?: number
}

/**
 * Release payment for a single booking
 * Checks if review deadline has passed and payment is not disputed
 * Moves funds from pending to available balance
 */
export async function releasePaymentAction(
  bookingId: string,
  workerId: string
): Promise<PaymentReleaseResult> {
  try {
    const supabase = await createClient()

    // Get the booking with job details
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          budget_max
        )
      `)
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    // Check if payment is still in review
    if (booking.payment_status !== "pending_review") {
      return { success: false, error: `Pembayaran tidak dalam status review: ${booking.payment_status}` }
    }

    // Check if review deadline has passed
    if (!booking.review_deadline) {
      return { success: false, error: "Batas waktu review tidak ditemukan" }
    }

    const now = new Date()
    const reviewDeadline = new Date(booking.review_deadline)

    if (now < reviewDeadline) {
      return { success: false, error: "Batas waktu review belum tercapai" }
    }

    // Get the payment amount
    const paymentAmount = booking.jobs?.budget_max || booking.final_price || 0

    // Import dynamically to avoid circular dependency
    const { releaseFundsAction } = await import("./wallets")
    const walletResult = await releaseFundsAction(
      workerId,
      paymentAmount,
      bookingId,
      `Pembayaran tersedia untuk ${booking.jobs?.title || "pekerjaan"}`
    )

    if (!walletResult.success) {
      return { success: false, error: walletResult.error || "Gagal melepaskan dana" }
    }

    // Update booking payment status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({ payment_status: "available" })
      .eq("id", bookingId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal memperbarui status pembayaran: ${updateError.message}` }
    }

    // Send notification to worker
    // Import dynamically to avoid circular dependency
    const { createNotification } = await import("./notifications")
    const jobTitle = booking.jobs?.title || "pekerjaan"
    await createNotification(
      workerId,
      "Pembayaran Tersedia",
      `Pembayaran sebesar Rp ${paymentAmount.toLocaleString("id-ID")} untuk ${jobTitle} kini tersedia di dompet Anda.`,
      `/dashboard/worker/wallet`
    )

    return { success: true, data: updatedBooking }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat melepaskan pembayaran" }
>>>>>>> auto-claude/017-job-completion-payment-release
  }
}

/**
<<<<<<< HEAD
 * Get wallet balance for a business
 */
export async function getBusinessWalletBalance(businessId: string): Promise<WalletBalanceResult> {
  try {
    const supabase = await createClient()

    const { data: wallet, error } = await (supabase as any)
      .from("wallets")
      .select("balance, currency")
      .eq("business_id", businessId)
      .maybeSingle()

    if (error) {
      return { success: false, error: `Gagal mengambil saldo wallet: ${error.message}` }
    }

    // If wallet doesn't exist, create one with zero balance
    if (!wallet) {
      const { data: newWallet, error: createError } = await (supabase as any)
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

    const { data: wallet, error } = await (supabase as any)
      .from("wallets")
      .select("balance, currency")
      .eq("worker_id", workerId)
      .maybeSingle()

    if (error) {
      return { success: false, error: `Gagal mengambil saldo wallet: ${error.message}` }
    }

    // If wallet doesn't exist, create one with zero balance
    if (!wallet) {
      const { data: newWallet, error: createError } = await (supabase as any)
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

    let query = (supabase as any)
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

    const { data, error } = await (supabase as any)
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
=======
 * Release all payments that have passed their review deadline
 * This function should be called periodically (e.g., via cron job)
 * Processes all bookings with payment_status 'pending_review' where review_deadline < now
 */
export async function releaseDuePaymentsAction(): Promise<BatchPaymentReleaseResult> {
  try {
    const supabase = await createClient()

    const now = new Date().toISOString()

    // Get all bookings that are ready for release
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        id,
        worker_id,
        payment_status,
        review_deadline,
        final_price,
        jobs (
          id,
          title,
          budget_max
        )
      `)
      .eq("payment_status", "pending_review")
      .lt("review_deadline", now)
      .order("review_deadline", { ascending: true })

    if (fetchError) {
      return { success: false, error: `Gagal mengambil booking: ${fetchError.message}` }
    }

    if (!bookings || bookings.length === 0) {
      return { success: true, released_count: 0, failed_count: 0 }
    }

    let releasedCount = 0
    let failedCount = 0

    // Import notification function once for batch processing
    const { createNotification } = await import("./notifications")

    // Process each booking
    for (const booking of bookings) {
      try {
        const paymentAmount = booking.jobs?.budget_max || booking.final_price || 0

        // Import dynamically to avoid circular dependency
        const { releaseFundsAction } = await import("./wallets")
        const walletResult = await releaseFundsAction(
          booking.worker_id,
          paymentAmount,
          booking.id,
          `Pembayaran tersedia untuk ${booking.jobs?.title || "pekerjaan"}`
        )

        if (!walletResult.success) {
          failedCount++
          continue
        }

        // Update booking payment status
        const { error: updateError } = await supabase
          .from("bookings")
          .update({ payment_status: "available" })
          .eq("id", booking.id)

        if (updateError) {
          failedCount++
        } else {
          releasedCount++

          // Send notification to worker
          const jobTitle = booking.jobs?.title || "pekerjaan"
          await createNotification(
            booking.worker_id,
            "Pembayaran Tersedia",
            `Pembayaran sebesar Rp ${paymentAmount.toLocaleString("id-ID")} untuk ${jobTitle} kini tersedia di dompet Anda.`,
            `/dashboard/worker/wallet`
          )
        }
      } catch {
        failedCount++
      }
    }

    return {
      success: true,
      released_count: releasedCount,
      failed_count: failedCount,
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memproses pembayaran jatuh tempo" }
>>>>>>> auto-claude/017-job-completion-payment-release
  }
}

/**
<<<<<<< HEAD
 * Worker requests a payout to their bank account
 * Creates payout request and processes withdrawal via Xendit
 */
export async function requestPayout(
  workerId: string,
  amount: number,
  bankAccountId?: string
): Promise<PayoutRequestResult> {
  try {
    const supabase = await createClient()

    // Validate the payout amount (minimum amount check)
    if (amount < PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT) {
      return {
        success: false,
        error: `Minimal penarikan Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
      }
    }

    if (amount > PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT) {
      return {
        success: false,
        error: `Maksimal penarikan Rp ${PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
      }
    }

    // Get worker's wallet to check balance
    const { data: wallet, error: walletError } = await (supabase as any)
      .from("wallets")
      .select("id, balance")
      .eq("worker_id", workerId)
      .maybeSingle()

    if (walletError || !wallet) {
      return { success: false, error: "Wallet tidak ditemukan" }
    }

    // Validate that worker has sufficient balance
    const balanceValidation = validatePaymentAmount(amount, wallet.balance)
    if (!balanceValidation.valid) {
      return { success: false, error: balanceValidation.error }
    }

    // Get worker's bank account (use specified one or primary)
    let bankAccount: BankAccount | null = null

    if (bankAccountId) {
      // Get the specified bank account
      const { data: specifiedAccount, error: accountError } = await (supabase as any)
        .from("bank_accounts")
        .select("*")
        .eq("id", bankAccountId)
        .eq("worker_id", workerId)
        .single()

      if (accountError || !specifiedAccount) {
        return { success: false, error: "Rekening bank tidak ditemukan" }
      }
      bankAccount = specifiedAccount
    } else {
      // Get primary bank account
      const { data: primaryAccount, error: primaryError } = await (supabase as any)
        .from("bank_accounts")
        .select("*")
        .eq("worker_id", workerId)
        .eq("is_primary", true)
        .maybeSingle()

      if (primaryError) {
        return { success: false, error: "Gagal mengambil rekening bank" }
      }

      if (!primaryAccount) {
        return {
          success: false,
          error: "Silakan tambahkan rekening bank terlebih dahulu",
        }
      }
      bankAccount = primaryAccount
    }

    // Calculate payout fee
    const feeAmount = calculatePayoutFee(amount, bankAccount.bank_code)
    const netAmount = amount - feeAmount

    // Create payout request with pending status
    const { data: payoutRequest, error: payoutError } = await (supabase as any)
      .from("payout_requests")
      .insert({
        worker_id: workerId,
        amount: amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        status: "pending",
        bank_code: bankAccount.bank_code,
        bank_account_number: bankAccount.bank_account_number,
        bank_account_name: bankAccount.bank_account_name,
        payment_provider: "xendit",
        provider_payout_id: null,
        provider_response: {},
        requested_at: new Date().toISOString(),
        processed_at: null,
        completed_at: null,
        failed_at: null,
        failure_reason: null,
        metadata: { bank_account_id: bankAccount.id },
      })
      .select()
      .single()

    if (payoutError || !payoutRequest) {
      return { success: false, error: `Gagal membuat permintaan penarikan: ${payoutError?.message}` }
    }

    // Create payout with Xendit
    try {
      const xenditPayout = await createPayout({
        external_id: payoutRequest.id,
        amount: netAmount,
        bank_code: bankAccount.bank_code,
        account_number: bankAccount.bank_account_number,
        account_holder_name: bankAccount.bank_account_name,
        description: `Penarikan saldo untuk worker ${workerId}`,
      })

      // Update payout request with Xendit details
      const { data: updatedPayout, error: updateError } = await (supabase as any)
        .from("payout_requests")
        .update({
          provider_payout_id: xenditPayout.id,
          provider_response: xenditPayout,
          status: "processing",
          processed_at: new Date().toISOString(),
        })
        .eq("id", payoutRequest.id)
        .select()
        .single()

      if (updateError || !updatedPayout) {
        return { success: false, error: `Gagal menyimpan detail payout: ${updateError?.message}` }
      }

      // Debit wallet (balance will be locked for this payout)
      const { error: debitError } = await (supabase as any)
        .from("wallets")
        .update({ balance: wallet.balance - amount })
        .eq("id", wallet.id)

      if (debitError) {
        return { success: false, error: `Gagal mengurangi saldo wallet: ${debitError.message}` }
      }

      return {
        success: true,
        data: {
          payout_request: updatedPayout,
          estimated_arrival: xenditPayout.estimated_arrival_date,
        },
      }
    } catch (xenditError) {
      // If Xendit fails, mark payout request as failed
      await (supabase as any)
        .from("payout_requests")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          failure_reason: xenditError instanceof Error ? xenditError.message : "Gagal membuat payout",
        })
        .eq("id", payoutRequest.id)

      return {
        success: false,
        error: `Gagal membuat payout: ${xenditError instanceof Error ? xenditError.message : "Unknown error"}`,
      }
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memproses permintaan penarikan" }
=======
 * Get payments that are pending release for a worker
 * Returns bookings where payment_status is 'pending_review'
 */
export async function getPendingReleasePaymentsAction(
  workerId: string
): Promise<{
  success: boolean
  error?: string
  data?: Array<{
    booking_id: string
    job_title: string
    amount: number
    review_deadline: string
    hours_until_release: number
  }>
}> {
  try {
    const supabase = await createClient()

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id,
        review_deadline,
        final_price,
        jobs (
          title,
          budget_max
        )
      `)
      .eq("worker_id", workerId)
      .eq("payment_status", "pending_review")
      .order("review_deadline", { ascending: true })

    if (error) {
      return { success: false, error: `Gagal mengambil pembayaran: ${error.message}` }
    }

    const now = new Date()

    const payments = (bookings || []).map((booking) => {
      const reviewDeadline = new Date(booking.review_deadline || "")
      const hoursUntilRelease = Math.max(0, (reviewDeadline.getTime() - now.getTime()) / (1000 * 60 * 60))

      return {
        booking_id: booking.id,
        job_title: booking.jobs?.title || "Pekerjaan",
        amount: booking.jobs?.budget_max || booking.final_price || 0,
        review_deadline: booking.review_deadline || "",
        hours_until_release: Math.round(hoursUntilRelease),
      }
    })

    return { success: true, data: payments }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pembayaran yang akan dilepas" }
>>>>>>> auto-claude/017-job-completion-payment-release
  }
}
