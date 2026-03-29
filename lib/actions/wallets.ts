"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import { xenditGateway } from "@/lib/payments";
import { PAYMENT_CONSTANTS } from "@/lib/types/payment";

type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
type WalletTransaction =
  Database["public"]["Tables"]["wallet_transactions"]["Row"];

// Type for inserting a new wallet
type WalletInsert = Pick<
  Wallet,
  "user_id" | "pending_balance" | "available_balance"
>;

// Type for inserting a new wallet transaction
type WalletTransactionInsert = Pick<
  WalletTransaction,
  | "wallet_id"
  | "booking_id"
  | "amount"
  | "type"
  | "status"
  | "description"
  | "metadata"
>;

/**
 * Result type for wallet creation and retrieval operations.
 * Contains the wallet data on success or an error message on failure.
 */
export type WalletResult = {
  success: boolean;
  error?: string;
  data?: Wallet | null;
};

export type TransactionsResult = {
  success: boolean;
  error?: string;
  data?: WalletTransaction[];
  count?: number;
};

/**
 * Result type for retrieving wallet balance.
 * Contains pending and available balances on success.
 */
export type WalletBalanceResult = {
  success: boolean;
  error?: string;
  data?: {
    pending_balance: number;
    available_balance: number;
  };
};

/**
 * Result type for single wallet transaction operations.
 * Contains the transaction record on success.
 */
export type WalletTransactionResult = {
  success: boolean;
  error?: string;
  data?: WalletTransaction;
};

/**
 * Result type for listing wallet transactions with pagination count.
 * Contains an array of transactions on success.
 */
export type WalletTransactionsListResult = {
  success: boolean;
  error?: string;
  data?: WalletTransaction[];
  count?: number;
};

export type WithdrawalResult = {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
  };
};

/**
 * Create a new wallet for a user
 * Should be called when a new user registers
 */
export async function createWalletAction(
  userId: string,
): Promise<WalletResult> {
  try {
    const supabase = await createClient();

    // Check if wallet already exists
    const { data: existingWallet, error: checkError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      return { success: false, error: "Gagal mengecek status dompet" };
    }

    if (existingWallet) {
      return { success: false, error: "Dompet sudah ada" };
    }

    // Create the new wallet
    const newWallet: WalletInsert = {
      user_id: userId,
      pending_balance: 0,
      available_balance: 0,
    };

    const { data, error } = await supabase
      .from("wallets")
      .insert(newWallet)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal membuat dompet: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat dompet" };
  }
}

/**
 * Get wallet balance for a user
 * Returns both pending and available balance
 */
export async function getWalletBalanceAction(
  userId: string,
): Promise<WalletBalanceResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("wallets")
      .select("pending_balance, available_balance")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Dompet tidak ditemukan" };
      }
      return {
        success: false,
        error: `Gagal mengambil saldo dompet: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil saldo dompet",
    };
  }
}

/**
 * Get or create wallet for a user
 * Returns existing wallet or creates a new one if it doesn't exist
 */
export async function getOrCreateWalletAction(
  userId: string,
): Promise<WalletResult> {
  try {
    const supabase = await createClient();

    // First try to get existing wallet
    const { data: existingWallet, error: fetchError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return { success: false, error: "Gagal mengambil data dompet" };
    }

    // If wallet exists, return it
    if (existingWallet) {
      return { success: true, data: existingWallet };
    }

    // Create new wallet
    const newWallet: WalletInsert = {
      user_id: userId,
      pending_balance: 0,
      available_balance: 0,
    };

    const { data, error } = await supabase
      .from("wallets")
      .insert(newWallet)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal membuat dompet: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil atau membuat dompet",
    };
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
  description?: string,
): Promise<WalletResult> {
  try {
    const supabase = await createClient();

    // Get the user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      return { success: false, error: "Dompet tidak ditemukan" };
    }

    // Calculate new pending balance
    const newPendingBalance = Number(wallet.pending_balance) + amount;

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await supabase
      .from("wallets")
      .update({
        pending_balance: newPendingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal menambahkan dana: ${updateError.message}`,
      };
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
    };

    const { error: transactionError } = await supabase
      .from("wallet_transactions")
      .insert(transaction);

    if (transactionError) {
      // Log but don't fail - wallet was updated successfully
      console.error("Gagal membuat catatan transaksi:", transactionError);
    }

    return { success: true, data: updatedWallet };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menambahkan dana" };
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
  description?: string,
): Promise<WalletResult> {
  try {
    const supabase = await createClient();

    // Get the user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      return { success: false, error: "Dompet tidak ditemukan" };
    }

    // Check if sufficient pending balance
    if (Number(wallet.pending_balance) < amount) {
      return { success: false, error: "Saldo pending tidak mencukupi" };
    }

    // Calculate new balances
    const newPendingBalance = Number(wallet.pending_balance) - amount;
    const newAvailableBalance = Number(wallet.available_balance) + amount;

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
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal melepaskan dana: ${updateError.message}`,
      };
    }

    // Update transaction status to released
    const { error: transactionUpdateError } = await supabase
      .from("wallet_transactions")
      .update({ status: "released" })
      .eq("booking_id", bookingId)
      .eq("wallet_id", wallet.id)
      .eq("status", "pending_review");

    if (transactionUpdateError) {
      // Log but don't fail - wallet was updated successfully
      console.error(
        "Gagal memperbarui status transaksi:",
        transactionUpdateError,
      );
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
    };

    const { error: transactionError } = await supabase
      .from("wallet_transactions")
      .insert(releaseTransaction);

    if (transactionError) {
      // Log but don't fail - wallet was updated successfully
      console.error("Gagal membuat catatan transaksi:", transactionError);
    }

    return { success: true, data: updatedWallet };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat melepaskan dana" };
  }
}

/**
 * Deduct funds from available balance
 * Called when a worker withdraws funds
 */
export async function deductAvailableFundsAction(
  userId: string,
  amount: number,
  description?: string,
): Promise<WalletResult> {
  try {
    const supabase = await createClient();

    // Get the user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      return { success: false, error: "Dompet tidak ditemukan" };
    }

    // Check if sufficient available balance
    if (Number(wallet.available_balance) < amount) {
      return { success: false, error: "Saldo tersedia tidak mencukupi" };
    }

    // Calculate new available balance
    const newAvailableBalance = Number(wallet.available_balance) - amount;

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await supabase
      .from("wallets")
      .update({
        available_balance: newAvailableBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal mengurangi dana: ${updateError.message}`,
      };
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
    };

    const { error: transactionError } = await supabase
      .from("wallet_transactions")
      .insert(transaction);

    if (transactionError) {
      // Log but don't fail - wallet was updated successfully
      console.error("Gagal membuat catatan transaksi:", transactionError);
    }

    return { success: true, data: updatedWallet };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengurangi dana" };
  }
}

/**
 * Get wallet transactions for a user
 */
export async function getWalletTransactionsAction(
  userId: string,
  limit: number = 50,
): Promise<WalletTransactionsListResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("wallet_transactions")
      .select(
        `
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
      `,
      )
      .eq("wallets.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil riwayat transaksi: ${error.message}`,
      };
    }

    return { success: true, data: data as WalletTransaction[], count: data?.length || 0 };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil riwayat transaksi",
    };
  }
}

/**
 * Get wallet details for a user
 */
export async function getWalletDetailsAction(
  userId: string,
): Promise<WalletResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Dompet tidak ditemukan" };
      }
      return {
        success: false,
        error: `Gagal mengambil data dompet: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil data dompet",
    };
  }
}

/**
 * Get worker wallet data by worker ID
 * First looks up the worker's user_id, then retrieves/creates the wallet
 */
export async function getWorkerWalletAction(
  workerId: string,
): Promise<WalletResult> {
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

    // Try to get existing wallet
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", worker.user_id)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil data dompet: ${error.message}`,
      };
    }

    // Create wallet if it doesn't exist
    if (!data) {
      const newWallet: WalletInsert = {
        user_id: worker.user_id,
        pending_balance: 0,
        available_balance: 0,
      };

      const { data: newWalletData, error: createError } = await supabase
        .from("wallets")
        .insert(newWallet)
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          error: `Gagal membuat dompet: ${createError.message}`,
        };
      }

      return { success: true, data: newWalletData };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil data dompet",
    };
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
export async function requestWithdrawalAction(
  workerId: string,
  data: {
    amount: number;
    bankAccountId: string;
  },
): Promise<WithdrawalResult> {
  try {
    const supabase = await createClient();

    // Get worker info
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id, user_id, full_name")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      return { success: false, error: "Worker tidak ditemukan" };
    }

    // Get worker's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets" as any)
      .select("*")
      .eq("worker_id", workerId)
      .maybeSingle();

    if (walletError) {
      return {
        success: false,
        error: `Gagal mengambil data dompet: ${walletError.message}`,
      };
    }

    if (!wallet) {
      return { success: false, error: "Dompet tidak ditemukan" };
    }

    const walletData = wallet as unknown as Wallet & {
      balance: number;
      available_balance: number;
    };

    // Check if sufficient balance
    if (walletData.available_balance < data.amount) {
      return {
        success: false,
        error: `Saldo tidak mencukupi. Saldo tersedia: Rp ${walletData.available_balance.toLocaleString("id-ID")}`,
      };
    }

    // Check minimum withdrawal amount
    if (data.amount < PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT) {
      return {
        success: false,
        error: `Minimal penarikan adalah Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
      };
    }

    // Check maximum withdrawal amount
    if (data.amount > PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT) {
      return {
        success: false,
        error: `Maksimal penarikan adalah Rp ${PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
      };
    }

    // Get bank account details
    const { data: bankAccount, error: bankError } = await (supabase as any)
      .from("bank_accounts")
      .select("*")
      .eq("id", data.bankAccountId)
      .eq("worker_id", workerId)
      .single();

    if (bankError || !bankAccount) {
      return { success: false, error: "Rekening bank tidak ditemukan" };
    }

    const bankAccountData = bankAccount as {
      id: string;
      bank_code: string;
      bank_account_number: string;
      bank_account_name: string;
    };

    // Calculate fee (1% or minimum Rp 5,000)
    const feeAmount = Math.max(
      data.amount * PAYMENT_CONSTANTS.DEFAULT_PAYOUT_FEE_PERCENTAGE,
      5000,
    );
    const netAmount = data.amount - feeAmount;

    // Generate external ID for disbursement
    const externalId = `payout-${workerId}-${Date.now()}`;

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
      .single();

    if (payoutError) {
      return {
        success: false,
        error: `Gagal membuat permintaan penarikan: ${payoutError.message}`,
      };
    }

    const payoutData = payoutRequest as unknown as {
      id: string;
      created_at: string;
    };

    // Deduct balance from available wallet balance
    const { error: updateError } = await supabase
      .from("wallets" as any)
      .update({
        available_balance: walletData.available_balance - data.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletData.id);

    if (updateError) {
      // Rollback payout request
      await supabase
        .from("payout_requests" as any)
        .delete()
        .eq("id", payoutData.id);

      return {
        success: false,
        error: `Gagal mengupdate saldo: ${updateError.message}`,
      };
    }

    // Create hold transaction record
    await supabase.from("wallet_transactions" as any).insert({
      wallet_id: walletData.id,
      amount: data.amount,
      type: "payout",
      status: "pending_review",
      description: `Penarikan ke ${bankAccountData.bank_code} - ${bankAccountData.bank_account_number}`,
      reference_id: payoutData.id,
    });

    // Create disbursement via Xendit
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/webhooks/xendit/disbursement`;

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
      });

      // Update payout request with provider ID
      await supabase
        .from("payout_requests" as any)
        .update({
          provider_payout_id: disbursement.id,
          status: "processing",
          provider_response: disbursement,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutData.id);

      // Update transaction status
      await supabase
        .from("wallet_transactions" as any)
        .update({ status: "paid" })
        .eq("reference_id", payoutData.id);

      return {
        success: true,
        data: {
          id: payoutData.id,
          amount: netAmount,
          status: "processing",
          created_at: payoutData.created_at,
        },
      };
    } catch (disbursementError) {
      // Refund wallet balance
      await supabase
        .from("wallets" as any)
        .update({
          available_balance: walletData.available_balance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", walletData.id);

      // Update payout request as failed
      await supabase
        .from("payout_requests" as any)
        .update({
          status: "failed",
          failure_reason:
            disbursementError instanceof Error
              ? disbursementError.message
              : "Disbursement failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutData.id);

      // Update transaction status
      await supabase
        .from("wallet_transactions" as any)
        .update({ status: "refunded" })
        .eq("reference_id", payoutData.id);

      return {
        success: false,
        error: `Gagal memproses penarikan: ${disbursementError instanceof Error ? disbursementError.message : "Unknown error"}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat memproses penarikan",
    };
  }
}
