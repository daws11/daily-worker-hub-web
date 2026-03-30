// @ts-nocheck
import { supabase } from "../client";
import type { Database, Json } from "../types";

// ============================================================================
// SHARED TYPES
// ============================================================================

/** Supabase query builder for chained filter calls */
type QueryBuilder = ReturnType<typeof supabase.from>;

// Database table row types
type WalletsRow = {
  id: string;
  business_id: string | null;
  worker_id: string | null;
  user_id: string | null;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  const { data, error } = await (supabase
    .from("wallets") as QueryBuilder)
    .insert(walletData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create wallet: ${error.message}`);
  }

  return data as WalletsRow;
}

/**
 * Create a new wallet for a user (legacy compatibility)
 * @deprecated Use createWallet with explicit worker_id or business_id instead
 */
export async function createWalletForUser(userId: string) {
  try {
    const { data, error } = await (supabase
      .from("wallets") as QueryBuilder)
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) {
      console.error("Error creating wallet:", error);
      return { data: null, error };
    }

    return { data: data as WalletsRow | null, error: null };
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
  const { data, error } = await (supabase
    .from("wallets") as QueryBuilder)
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

  return data as WalletsRow;
}

/**
 * Get a single wallet by ID
 */
export async function getWalletById(
  walletId: string,
): Promise<WalletsRow | null> {
  const { data, error } = await (supabase
    .from("wallets") as QueryBuilder)
    .select("*")
    .eq("id", walletId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch wallet: ${error.message}`);
  }

  return data as WalletsRow | null;
}

/**
 * Get wallet by user ID (legacy compatibility)
 * @deprecated Use getWorkerWallet or getBusinessWallet instead
 */
export async function getWallet(userId: string) {
  try {
    const { data, error } = await (supabase
      .from("wallets") as QueryBuilder)
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching wallet:", error);
      return { data: null, error };
    }

    return { data: data as WalletsRow | null, error: null };
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
  const { data, error } = await (supabase
    .from("wallets") as QueryBuilder)
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch business wallet: ${error.message}`);
  }

  return data as WalletsRow | null;
}

/**
 * Get wallet by worker ID
 */
export async function getWorkerWallet(
  workerId: string,
): Promise<WalletsRow | null> {
  // First get the worker's user_id
  const { data: worker, error: workerError } = await (supabase
    .from("workers") as QueryBuilder)
    .select("user_id")
    .eq("id", workerId)
    .single();

  if (workerError || !worker) {
    throw new Error(`Failed to fetch worker: ${workerError?.message}`);
  }

  const { data, error } = await (supabase
    .from("wallets") as QueryBuilder)
    .select("*")
    .eq("user_id", (worker as { user_id: string }).user_id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch worker wallet: ${error.message}`);
  }

  return data as WalletsRow | null;
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
  });
}

/**
 * Update wallet balance (legacy compatibility)
 * @deprecated Use updateWallet with explicit balance instead
 */
export async function updateBalance(walletId: string, newBalance: number) {
  try {
    const { data, error } = await (supabase
      .from("wallets") as QueryBuilder)
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", walletId)
      .select()
      .single();

    if (error) {
      console.error("Error updating wallet balance:", error);
      return { data: null, error };
    }

    return { data: data as WalletsRow | null, error: null };
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
    const { data, error } = await (supabase
      .from("wallet_transactions") as QueryBuilder)
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
    const { data, error } = await (supabase
      .from("wallet_transactions") as QueryBuilder)
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
  const { error } = await (supabase
    .from("wallets") as QueryBuilder)
    .delete()
    .eq("id", walletId);

  if (error) {
    throw new Error(`Failed to delete wallet: ${error.message}`);
  }
}

// ============================================================================
// WALLET WITH USER TYPE
// ============================================================================

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];

export type WalletWithUser = WalletRow & {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
};

// ============================================================================
// ADDITIONAL WALLET FUNCTIONS (STUBS FOR useWallet HOOK)
// ============================================================================

type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"];

export type WalletTransactionWithDetails = WalletTransactionRow & {
  booking?: {
    id: string;
    job?: {
      id: string;
      title: string;
    };
  } | null;
};

export async function getWalletBalance(userId: string): Promise<{
  data: { pending_balance: number; available_balance: number } | null;
  error: Error | null;
}> {
  try {
    const wallet = await getWallet(userId);
    if (wallet.data === null || wallet.error) {
      return { data: null, error: wallet.error };
    }
    return {
      data: {
        pending_balance: wallet.data.pending_balance ?? 0,
        available_balance: wallet.data.available_balance ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function getOrCreateWallet(userId: string): Promise<{
  data: WalletWithUser | null;
  error: Error | null;
}> {
  try {
    const existing = await getWallet(userId);
    if (!existing.error && existing.data) {
      return { data: existing.data as WalletWithUser, error: null };
    }

    const { data, error } = await (supabase
      .from("wallets") as QueryBuilder)
      .insert({ user_id: userId, pending_balance: 0, available_balance: 0 })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as WalletWithUser, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function getWalletTransactions(
  walletId: string,
  limit = 50,
): Promise<{ data: WalletTransactionWithDetails[] | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase
      .from("wallet_transactions") as QueryBuilder)
      .select(
        "*, booking:bookings(id, job:jobs(id, title))",
      )
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data || []) as WalletTransactionWithDetails[], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function getUserWalletTransactions(
  userId: string,
  limit = 50,
): Promise<{ data: WalletTransactionWithDetails[] | null; error: Error | null }> {
  try {
    const wallet = await getWallet(userId);
    if (!wallet.data) {
      return { data: null, error: wallet.error ?? new Error("Wallet not found") };
    }

    return getWalletTransactions(wallet.data.id, limit);
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateWalletBalance(
  walletId: string,
  pendingBalance: number,
  availableBalance: number,
): Promise<{ data: WalletWithUser | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase
      .from("wallets") as QueryBuilder)
      .update({
        pending_balance: pendingBalance,
        available_balance: availableBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as WalletWithUser, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function addPendingFunds(
  walletId: string,
  amount: number,
  _bookingId?: string,
): Promise<{ data: WalletWithUser | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase
      .from("wallet_transactions") as QueryBuilder)
      .insert({
        wallet_id: walletId,
        amount,
        type: "credit",
        status: "pending_review",
        description: "Pending funds added",
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Get current wallet balance and update
    const wallet = await getWalletById(walletId);
    if (!wallet) {
      return { data: null, error: new Error("Wallet not found") };
    }

    return updateWalletBalance(
      walletId,
      (wallet.pending_balance ?? 0) + amount,
      wallet.available_balance ?? 0,
    );
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function releaseFunds(
  walletId: string,
  amount: number,
): Promise<{ data: WalletWithUser | null; error: Error | null }> {
  try {
    const wallet = await getWalletById(walletId);
    if (!wallet) {
      return { data: null, error: new Error("Wallet not found") };
    }

    const newPending = Math.max(0, (wallet.pending_balance ?? 0) - amount);
    const newAvailable = (wallet.available_balance ?? 0) + amount;

    const { data, error } = await (supabase
      .from("wallet_transactions") as QueryBuilder)
      .insert({
        wallet_id: walletId,
        amount,
        type: "release",
        status: "available",
        description: "Funds released to available balance",
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return updateWalletBalance(walletId, newPending, newAvailable);
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function deductAvailableFunds(
  walletId: string,
  amount: number,
): Promise<{ data: WalletWithUser | null; error: Error | null }> {
  try {
    const wallet = await getWalletById(walletId);
    if (!wallet) {
      return { data: null, error: new Error("Wallet not found") };
    }

    if ((wallet.available_balance ?? 0) < amount) {
      return {
        data: null,
        error: new Error("Insufficient available balance"),
      };
    }

    const { data, error } = await (supabase
      .from("wallet_transactions") as QueryBuilder)
      .insert({
        wallet_id: walletId,
        amount,
        type: "debit",
        status: "available",
        description: "Funds withdrawn",
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return updateWalletBalance(
      walletId,
      wallet.pending_balance ?? 0,
      (wallet.available_balance ?? 0) - amount,
    );
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
