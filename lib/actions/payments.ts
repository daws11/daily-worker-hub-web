// @ts-nocheck
"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import { createInvoice, calculateFee, type PaymentProvider } from "../payments";
import {
  validateTopUpAmount,
  calculatePaymentFeeDetails,
} from "../utils/payment-validator";
import { PAYMENT_CONSTANTS } from "../types/payment";

type PaymentTransaction =
  Database["public"]["Tables"]["payment_transactions"]["Row"];
type Wallet = Database["public"]["Tables"]["wallets"]["Row"];

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
>;

export type PaymentResult = {
  success: boolean;
  error?: string;
  data?: {
    transaction: PaymentTransaction;
    payment_url: string;
    expires_at: string;
  };
};

export type WalletBalanceResult = {
  success: boolean;
  error?: string;
  data?: {
    balance: number;
    currency: string;
  };
};

export type PaymentHistoryResult = {
  success: boolean;
  error?: string;
  data?: PaymentTransaction[];
  count?: number;
};

export type PayoutRequestResult = {
  success: boolean;
  error?: string;
  data?: {
    payout_request: {
      id: string;
      worker_id: string;
      amount: number;
      fee_amount: number;
      net_amount: number;
      status: string;
      bank_account_number: string;
      bank_account_name: string;
      bank_code: string;
      requested_at: string;
      processed_at: string | null;
      completed_at: string | null;
    };
    estimated_arrival?: string;
  };
};

/**
 * Initialize QRIS payment for business wallet top-up
 * Creates payment transaction and generates QRIS code
 */
export async function initializeQrisPayment(
  businessId: string,
  amount: number,
  metadata?: Record<string, unknown>,
  provider: PaymentProvider = "xendit",
): Promise<PaymentResult> {
  try {
    const supabase = await createClient();

    // Validate the top-up amount
    const validation = validateTopUpAmount(amount);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Calculate payment fee using the new gateway interface
    const feeAmount = calculateFee(amount, "qris");
    const totalAmount = amount + feeAmount;

    // Check if business exists and has a wallet
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      return { success: false, error: "Business tidak ditemukan" };
    }

    // Create payment transaction with pending status
    const externalId = `payment_${businessId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const qrisExpiresAt = new Date(
      Date.now() + PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES * 60000,
    ).toISOString();

    const newTransaction: PaymentTransactionInsert = {
      business_id: businessId,
      amount: totalAmount,
      status: "pending_review",
      payment_provider: provider,
      provider_payment_id: null,
      payment_url: null,
      qris_expires_at: qrisExpiresAt,
      fee_amount: feeAmount,
      metadata: metadata || {},
    };

    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert(newTransaction)
      .select()
      .single();

    if (transactionError || !transaction) {
      return {
        success: false,
        error: `Gagal membuat transaksi: ${transactionError?.message}`,
      };
    }

    // Create payment invoice with the gateway
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

      const invoice = await createInvoice(
        {
          externalId: transaction.id,
          amount: totalAmount,
          description: `Top-up wallet untuk ${business.name}`,
          expiryMinutes: PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES,
          paymentMethod: "qris",
          successRedirectUrl: `${baseUrl}/business/wallet?payment=success`,
          failureRedirectUrl: `${baseUrl}/business/wallet?payment=failed`,
          callbackUrl: `${baseUrl}/api/webhooks/${provider}`,
          metadata: {
            business_id,
            business_name: business.name,
            original_amount: amount,
            fee_amount: feeAmount,
          },
        },
        provider,
      );

      // Update transaction with payment details
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          payment_url: invoice.invoiceUrl,
          provider_payment_id: invoice.id,
          metadata: {
            ...metadata,
            invoice_id: invoice.id,
            invoice_url: invoice.invoiceUrl,
            qr_string: invoice.qrString,
            token: invoice.token,
          },
        })
        .eq("id", transaction.id);

      if (updateError) {
        return {
          success: false,
          error: `Gagal menyimpan detail pembayaran: ${updateError.message}`,
        };
      }

      return {
        success: true,
        data: {
          transaction: {
            ...transaction,
            payment_url: invoice.invoiceUrl,
            provider_payment_id: invoice.id,
          },
          payment_url: invoice.invoiceUrl,
          expires_at: qrisExpiresAt,
        },
      };
    } catch (gatewayError) {
      // If gateway fails, mark transaction as failed
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          failure_reason:
            gatewayError instanceof Error
              ? gatewayError.message
              : "Gagal membuat payment invoice",
        })
        .eq("id", transaction.id);

      return {
        success: false,
        error: `Gagal membuat payment invoice: ${gatewayError instanceof Error ? gatewayError.message : "Unknown error"}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat inisialisasi pembayaran QRIS",
    };
  }
}

/**
 * Get wallet balance for a business
 */
export async function getBusinessWalletBalance(
  businessId: string,
): Promise<WalletBalanceResult> {
  try {
    const supabase = await createClient();

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance, currency")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil saldo wallet: ${error.message}`,
      };
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
        .single();

      if (createError || !newWallet) {
        return {
          success: false,
          error: `Gagal membuat wallet: ${createError?.message}`,
        };
      }

      return {
        success: true,
        data: { balance: newWallet.balance, currency: newWallet.currency },
      };
    }

    return {
      success: true,
      data: { balance: wallet.balance, currency: wallet.currency },
    };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil saldo wallet",
    };
  }
}

/**
 * Get wallet balance for a worker
 */
export async function getWorkerWalletBalance(
  workerId: string,
): Promise<WalletBalanceResult> {
  try {
    const supabase = await createClient();

    // First get the worker's user_id
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("user_id")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      return { success: false, error: "Worker tidak ditemukan" };
    }

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", worker.user_id)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil saldo wallet: ${error.message}`,
      };
    }

    // If wallet doesn't exist, create one with zero balance
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from("wallets")
        .insert({
          user_id: worker.user_id,
          balance: 0,
          pending_balance: 0,
          available_balance: 0,
        })
        .select("balance")
        .single();

      if (createError || !newWallet) {
        return {
          success: false,
          error: `Gagal membuat wallet: ${createError?.message}`,
        };
      }

      return {
        success: true,
        data: { balance: newWallet.balance, currency: "IDR" },
      };
    }

    return {
      success: true,
      data: { balance: wallet.balance, currency: "IDR" },
    };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil saldo wallet",
    };
  }
}

/**
 * Get payment transaction history for a business
 */
export async function getBusinessPaymentHistory(
  businessId: string,
  status?: "pending" | "success" | "failed" | "expired",
): Promise<PaymentHistoryResult> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("payment_transactions")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil riwayat pembayaran: ${error.message}`,
      };
    }

    return { success: true, data: data || [], count: data?.length || 0 };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil riwayat pembayaran",
    };
  }
}

/**
 * Get payment transaction details by ID
 */
export async function getPaymentTransactionDetails(
  transactionId: string,
  businessId: string,
): Promise<{
  success: boolean;
  error?: string;
  data?: PaymentTransaction;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("business_id", businessId)
      .single();

    if (error || !data) {
      return { success: false, error: "Transaksi tidak ditemukan" };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil detail transaksi",
    };
  }
}

/**
 * Worker requests a payout to their bank account
 * Creates payout request in database
 */
export async function requestPayout(
  workerId: string,
  amount: number,
  bankAccountId?: string,
): Promise<PayoutRequestResult> {
  try {
    const supabase = await createClient();

    // Validate minimum payout amount (Rp 50,000)
    const MIN_PAYOUT_AMOUNT = 50000;
    if (amount < MIN_PAYOUT_AMOUNT) {
      return {
        success: false,
        error: `Minimal penarikan Rp ${MIN_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
      };
    }

    // Validate maximum payout amount (Rp 10,000,000)
    const MAX_PAYOUT_AMOUNT = 10000000;
    if (amount > MAX_PAYOUT_AMOUNT) {
      return {
        success: false,
        error: `Maksimal penarikan Rp ${MAX_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
      };
    }

    // Get worker's user_id first
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("user_id")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      return { success: false, error: "Worker tidak ditemukan" };
    }

    // Get worker's wallet to check balance
    const { data: wallet, error: walletError } = await (supabase as any)
      .from("wallets")
      .select("id, balance")
      .eq("user_id", worker.user_id)
      .maybeSingle();

    if (walletError || !wallet) {
      return { success: false, error: "Wallet tidak ditemukan" };
    }

    // Validate that worker has sufficient balance
    if (amount > wallet.balance) {
      return {
        success: false,
        error: `Saldo tidak cukup. Saldo tersedia: Rp ${wallet.balance.toLocaleString("id-ID")}`,
      };
    }

    // Get worker's bank account
    let bankAccount: any = null;

    if (bankAccountId) {
      const { data: specifiedAccount, error: accountError } = await (
        supabase as any
      )
        .from("bank_accounts")
        .select("*")
        .eq("id", bankAccountId)
        .eq("worker_id", workerId)
        .single();

      if (accountError || !specifiedAccount) {
        return { success: false, error: "Rekening bank tidak ditemukan" };
      }
      bankAccount = specifiedAccount;
    } else {
      const { data: primaryAccount, error: primaryError } = await (
        supabase as any
      )
        .from("bank_accounts")
        .select("*")
        .eq("worker_id", workerId)
        .eq("is_primary", true)
        .maybeSingle();

      if (primaryError) {
        return { success: false, error: "Gagal mengambil rekening bank" };
      }

      if (!primaryAccount) {
        return {
          success: false,
          error: "Silakan tambahkan rekening bank terlebih dahulu",
        };
      }
      bankAccount = primaryAccount;
    }

    // Calculate payout fee (2%)
    const feePercentage = 0.02;
    const feeAmount = Math.round(amount * feePercentage);
    const netAmount = amount - feeAmount;

    // Create payout request
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
        payment_provider: "manual",
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
      .single();

    if (payoutError || !payoutRequest) {
      return {
        success: false,
        error: `Gagal membuat permintaan penarikan: ${payoutError?.message}`,
      };
    }

    // Debit wallet
    const { error: debitError } = await (supabase as any)
      .from("wallets")
      .update({ balance: wallet.balance - amount })
      .eq("id", wallet.id);

    if (debitError) {
      return {
        success: false,
        error: `Gagal mengurangi saldo wallet: ${debitError.message}`,
      };
    }

    return {
      success: true,
      data: {
        payout_request: payoutRequest,
        estimated_arrival: "1-2 hari kerja",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat memproses permintaan penarikan",
    };
  }
}

/**
 * Calculate payment fee for a given amount
 * Returns fee breakdown including percentage and fixed fee
 */
export async function calculateTopUpFee(
  amount: number,
  paymentMethod: string = "qris",
): Promise<{
  success: boolean;
  error?: string;
  data?: {
    amount: number;
    fee_amount: number;
    total_amount: number;
    fee_percentage: number;
  };
}> {
  try {
    // Validate amount first
    const validation = validateTopUpAmount(amount);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Calculate fee using the new gateway interface
    const feeAmount = calculateFee(amount, paymentMethod);
    const totalAmount = amount + feeAmount;

    // Determine fee percentage based on payment method
    let feePercentage = 0.007; // Default 0.7% for QRIS
    if (paymentMethod === "credit_card" || paymentMethod === "card") {
      feePercentage = 0.029; // 2.9%
    } else if (
      paymentMethod === "gopay" ||
      paymentMethod === "shopeepay" ||
      paymentMethod === "dana" ||
      paymentMethod === "ovo"
    ) {
      feePercentage = 0.015; // 1.5%
    } else if (paymentMethod === "bank_transfer" || paymentMethod === "va") {
      feePercentage = 0.005; // 0.5%
    }

    return {
      success: true,
      data: {
        amount,
        fee_amount: feeAmount,
        total_amount: totalAmount,
        fee_percentage: feePercentage,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat menghitung biaya top up",
    };
  }
}
