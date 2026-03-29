import { supabase } from "../client";
import type { Database } from "../types";
import {
  getWalletTransactions as getWalletTransactionsBase,
  getUserWalletTransactions as getUserWalletTransactionsBase,
} from "./transactions";

// Re-export transaction functions for useWallet convenience import
export const getWalletTransactions = getWalletTransactionsBase;
export const getUserWalletTransactions = getUserWalletTransactionsBase;

type WalletsRow = {
  id: string;
  business_id: string | null;
  worker_id: string | null;
  user_id: string | null;
  balance: number;
  currency: string;
  is_active: boolean;
  available_balance: number;
  pending_balance: number;
  created_at: string;
  updated_at: string;
};

export type WalletWithUser = WalletsRow & {
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

export type WalletTransactionWithDetails = {
  id: string;
  wallet_id: string;
  amount: number;
  type: "hold" | "release" | "earn" | "payout" | "refund";
  status:
    | "pending_review"
    | "available"
    | "released"
    | "disputed"
    | "cancelled";
  booking_id: string | null;
  description: string | null;
  created_at: string;
  booking?: {
    id: string;
    job?: {
      id: string;
      title: string;
    };
  } | null;
};

/**
 * Create a new wallet
 */
export async function createWallet(
  walletData: Omit<WalletsRow, "id" | "created_at" | "updated_at">,
): Promise<WalletsRow> {
  const { data, error } = await (supabase as any)
    .from("wallets")
    .insert(walletData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create wallet: ${error.message}`);
  }

  return data;
}

/**
 * Create a new wallet for a user (legacy compatibility)
 * @deprecated Use createWallet with explicit worker_id or business_id instead
 */
export async function createWalletForUser(userId: string) {
  try {
    const { data, error } = await (supabase as any)
      .from("wallets")
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) {
      console.error("Error creating wallet:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error creating wallet:", error);
    return { data: null, error };
  }
}

/**
 * Update an existing wallet
 */
export async function updateWallet(
  walletId: string,
  updates: Partial<Pick<WalletsRow, "balance" | "currency" | "is_active">>,
): Promise<WalletsRow> {
  const { data, error } = await (supabase as any)
    .from("wallets")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", walletId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update wallet: ${error.message}`);
  }

  return data;
}

/**
 * Get a single wallet by ID
 */
export async function getWalletById(
  walletId: string,
): Promise<WalletsRow | null> {
  const { data, error } = await (supabase as any)
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch wallet: ${error.message}`);
  }

  return data;
}

/**
 * Get wallet by user ID (legacy compatibility)
 * @deprecated Use getWorkerWallet or getBusinessWallet instead
 */
export async function getWallet(userId: string) {
  try {
    const { data, error } = await (supabase as any)
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching wallet:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error fetching wallet:", error);
    return { data: null, error };
  }
}

/**
 * Get wallet by business ID
 */
export async function getBusinessWallet(
  businessId: string,
): Promise<WalletsRow | null> {
  const { data, error } = await (supabase as any)
    .from("wallets")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch business wallet: ${error.message}`);
  }

  return data;
}

/**
 * Get wallet by worker ID
 */
export async function getWorkerWallet(
  workerId: string,
): Promise<WalletsRow | null> {
  // First get the worker's user_id
  const { data: worker, error: workerError } = await (supabase as any)
    .from("workers")
    .select("user_id")
    .eq("id", workerId)
    .single();

  if (workerError || !worker) {
    throw new Error(`Failed to fetch worker: ${workerError?.message}`);
  }

  const { data, error } = await (supabase as any)
    .from("wallets")
    .select("*")
    .eq("user_id", worker.user_id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch worker wallet: ${error.message}`);
  }

  return data;
}

/**
 * Get or create business wallet
 * Creates a new wallet if one doesn't exist
 */
export async function getOrCreateBusinessWallet(
  businessId: string,
  currency: string = "IDR",
): Promise<WalletsRow> {
  const existingWallet = await getBusinessWallet(businessId);

  if (existingWallet) {
    return existingWallet;
  }

  return createWallet({
    business_id: businessId,
    worker_id: null,
    user_id: null,
    balance: 0,
    currency,
    is_active: true,
    available_balance: 0,
    pending_balance: 0,
  });
}

/**
 * Get or create worker wallet
 * Creates a new wallet if one doesn't exist
 */
export async function getOrCreateWorkerWallet(
  workerId: string,
  currency: string = "IDR",
): Promise<WalletsRow> {
  const existingWallet = await getWorkerWallet(workerId);

  if (existingWallet) {
    return existingWallet;
  }

  return createWallet({
    business_id: null,
    worker_id: workerId,
    user_id: null,
    balance: 0,
    currency,
    is_active: true,
    available_balance: 0,
    pending_balance: 0,
  });
}

/**
 * Update wallet balance (legacy compatibility)
 * @deprecated Use updateWallet with explicit balance instead
 */
export async function updateBalance(walletId: string, newBalance: number) {
  try {
    const { data, error } = await (supabase as any)
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", walletId)
      .select()
      .single();

    if (error) {
      console.error("Error updating wallet balance:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error updating wallet balance:", error);
    return { data: null, error };
  }
}

/**
 * Add funds to a wallet (credit)
 */
export async function creditWallet(
  walletId: string,
  amount: number,
): Promise<WalletsRow> {
  // First get current balance
  const wallet = await getWalletById(walletId);
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const newBalance = wallet.balance + amount;

  return updateWallet(walletId, { balance: newBalance });
}

/**
 * Deduct funds from a wallet (debit)
 */
export async function debitWallet(
  walletId: string,
  amount: number,
): Promise<WalletsRow> {
  // First get current balance
  const wallet = await getWalletById(walletId);
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  const newBalance = wallet.balance - amount;

  return updateWallet(walletId, { balance: newBalance });
}

/**
 * Calculate pending balance from pending transactions
 * Returns the sum of all pending transactions for a wallet
 */
export async function calculatePendingBalance(walletId: string) {
  try {
    const { data, error } = await (supabase as any)
      .from("wallet_transactions")
      .select("amount")
      .eq("wallet_id", walletId)
      .eq("type", "pending");

    if (error) {
      console.error("Error calculating pending balance:", error);
      return { data: null, error };
    }

    const pendingBalance =
      data?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) ??
      0;

    return { data: pendingBalance, error: null };
  } catch (error) {
    console.error("Unexpected error calculating pending balance:", error);
    return { data: null, error };
  }
}

/**
 * Get total earnings from credit transactions
 * Returns the sum of all credit (income) transactions for a wallet
 */
export async function getTotalEarnings(walletId: string) {
  try {
    const { data, error } = await (supabase as any)
      .from("wallet_transactions")
      .select("amount")
      .eq("wallet_id", walletId)
      .eq("type", "credit");

    if (error) {
      console.error("Error calculating total earnings:", error);
      return { data: null, error };
    }

    const totalEarnings =
      data?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) ??
      0;

    return { data: totalEarnings, error: null };
  } catch (error) {
    console.error("Unexpected error calculating total earnings:", error);
    return { data: null, error };
  }
}

/**
 * Deactivate a wallet
 */
export async function deactivateWallet(walletId: string): Promise<WalletsRow> {
  return updateWallet(walletId, { is_active: false });
}

/**
 * Activate a wallet
 */
export async function activateWallet(walletId: string): Promise<WalletsRow> {
  return updateWallet(walletId, { is_active: true });
}

/**
 * Delete a wallet
 */
export async function deleteWallet(walletId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("wallets")
    .delete()
    .eq("id", walletId);

  if (error) {
    throw new Error(`Failed to delete wallet: ${error.message}`);
  }
}

// ============================================
// WALLET BALANCE & TRANSACTION MANAGEMENT
// ============================================

export type WalletBalance = {
  pending_balance: number;
  available_balance: number;
};

/**
 * Get wallet balance (pending and available) for a user
 */
export async function getWalletBalance(
  userId: string,
): Promise<{ data: WalletBalance | null; error: { message: string } | null }> {
  try {
    const { data, error } = await (supabase as any)
      .from("wallets")
      .select("pending_balance, available_balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return {
      data: {
        pending_balance: data?.pending_balance ?? 0,
        available_balance: data?.available_balance ?? 0,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { data: null, error: { message } };
  }
}

/**
 * Get or create a wallet for a user
 */
export async function getOrCreateWallet(
  userId: string,
): Promise<{ data: WalletWithUser | null; error: { message: string } | null }> {
  try {
    // First try to get existing wallet
    const { data: existingWallet, error: fetchError } = await (supabase as any)
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      return { data: null, error: { message: fetchError.message } };
    }

    if (existingWallet) {
      return { data: existingWallet as WalletWithUser, error: null };
    }

    // Create new wallet
    const { data: newWallet, error: createError } = await (supabase as any)
      .from("wallets")
      .insert({
        user_id: userId,
        balance: 0,
        currency: "IDR",
        is_active: true,
        available_balance: 0,
        pending_balance: 0,
      })
      .select()
      .single();

    if (createError) {
      return { data: null, error: { message: createError.message } };
    }

    return { data: newWallet as WalletWithUser, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { data: null, error: { message } };
  }
}

/**
 * Update wallet balance fields (available_balance and pending_balance)
 */
export async function updateWalletBalance(
  walletId: string,
  pendingBalance: number,
  availableBalance: number,
): Promise<{ data: WalletsRow | null; error: { message: string } | null }> {
  try {
    const { data, error } = await (supabase as any)
      .from("wallets")
      .update({
        pending_balance: pendingBalance,
        available_balance: availableBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as WalletsRow, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { data: null, error: { message } };
  }
}

/**
 * Add funds to pending balance (hold transaction)
 */
export async function addPendingFunds(
  walletId: string,
  amount: number,
  bookingId?: string,
  description?: string,
): Promise<{ data: null; error: { message: string } | null }> {
  try {
    // Insert hold transaction
    const { error: txError } = await (supabase as any)
      .from("wallet_transactions")
      .insert({
        wallet_id: walletId,
        amount,
        type: "hold",
        status: "pending_review",
        booking_id: bookingId ?? null,
        description: description ?? null,
      });

    if (txError) {
      return { data: null, error: { message: txError.message } };
    }

    // Update wallet pending balance
    const { data: wallet, error: walletError } = await (supabase as any)
      .from("wallets")
      .select("pending_balance, available_balance")
      .eq("id", walletId)
      .single();

    if (walletError) {
      return { data: null, error: { message: walletError.message } };
    }

    const newPendingBalance = (wallet.pending_balance ?? 0) + amount;
    const { error: updateError } = await (supabase as any)
      .from("wallets")
      .update({
        pending_balance: newPendingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletId);

    if (updateError) {
      return { data: null, error: { message: updateError.message } };
    }

    return { data: null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { data: null, error: { message } };
  }
}

/**
 * Release pending funds to available balance (release transaction)
 */
export async function releaseFunds(
  walletId: string,
  amount: number,
): Promise<{ data: null; error: { message: string } | null }> {
  try {
    // Insert release transaction
    const { error: txError } = await (supabase as any)
      .from("wallet_transactions")
      .insert({
        wallet_id: walletId,
        amount,
        type: "release",
        status: "released",
        description: "Funds released to available balance",
      });

    if (txError) {
      return { data: null, error: { message: txError.message } };
    }

    // Update wallet balances
    const { data: wallet, error: walletError } = await (supabase as any)
      .from("wallets")
      .select("pending_balance, available_balance")
      .eq("id", walletId)
      .single();

    if (walletError) {
      return { data: null, error: { message: walletError.message } };
    }

    const newPendingBalance = Math.max(0, (wallet.pending_balance ?? 0) - amount);
    const newAvailableBalance = (wallet.available_balance ?? 0) + amount;

    const { error: updateError } = await (supabase as any)
      .from("wallets")
      .update({
        pending_balance: newPendingBalance,
        available_balance: newAvailableBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletId);

    if (updateError) {
      return { data: null, error: { message: updateError.message } };
    }

    return { data: null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { data: null, error: { message } };
  }
}

/**
 * Deduct from available balance (payout transaction)
 */
export async function deductAvailableFunds(
  walletId: string,
  amount: number,
  description?: string,
): Promise<{ data: null; error: { message: string } | null }> {
  try {
    // Verify sufficient balance
    const { data: wallet, error: fetchError } = await (supabase as any)
      .from("wallets")
      .select("available_balance")
      .eq("id", walletId)
      .single();

    if (fetchError) {
      return { data: null, error: { message: fetchError.message } };
    }

    if ((wallet.available_balance ?? 0) < amount) {
      return { data: null, error: { message: "Insufficient available balance" } };
    }

    // Insert payout transaction
    const { error: txError } = await (supabase as any)
      .from("wallet_transactions")
      .insert({
        wallet_id: walletId,
        amount,
        type: "payout",
        status: "pending_review",
        description: description ?? "Withdrawal",
      });

    if (txError) {
      return { data: null, error: { message: txError.message } };
    }

    // Update wallet available balance
    const newAvailableBalance = (wallet.available_balance ?? 0) - amount;
    const { error: updateError } = await (supabase as any)
      .from("wallets")
      .update({
        available_balance: newAvailableBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletId);

    if (updateError) {
      return { data: null, error: { message: updateError.message } };
    }

    return { data: null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { data: null, error: { message } };
  }
}
