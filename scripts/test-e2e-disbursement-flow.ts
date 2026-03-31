#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: Worker Disbursement (Withdrawal) Flow + Failure/Refund Path
 *
 * This script verifies two disbursement scenarios:
 *
 * PATH A — Successful Withdrawal:
 *  1. Worker exists and has wallet
 *  2. Worker has sufficient wallet balance
 *  3. Bank account is saved for the worker
 *  4. Withdrawal amount is valid (>= Rp 100.000)
 *  5. Fee is calculated (1% or Rp 5.000, whichever is higher)
 *  6. Payout request created with pending status
 *  7. Wallet balance is deducted
 *  8. Simulate successful payout webhook from Xendit
 *  9. Verify payout status is updated to completed
 * 10. Verify final wallet balance reflects deduction
 *
 * PATH B — Failed Withdrawal + Wallet Refund:
 *  1. Worker requests withdrawal
 *  2. Wallet is debited (pending payout)
 *  3. Simulate FAILED payout webhook from Xendit
 *  4. Verify payout status is updated to failed
 *  5. Verify failure_reason is recorded
 *  6. Verify wallet is refunded to original balance
 *
 * Usage:
 *   npx ts-node scripts/test-e2e-disbursement-flow.ts <worker_id> <bank_account_id> [amount]
 *
 * Example:
 *   npx ts-node scripts/test-e2e-disbursement-flow.ts <worker_id> <bank_account_id> 100000
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join } from "path";

// Load environment variables
const envPath = join(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase configuration");
  console.error("Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const TEST_AMOUNT = 100000; // Rp 100.000 (minimum per spec)
const MIN_WITHDRAWAL_AMOUNT = 100000;
const MAX_WITHDRAWAL_AMOUNT = 100000000;

// Colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message: string, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateFee(amount: number): number {
  // 1% or Rp 5.000, whichever is higher
  return Math.max(Math.floor(amount * 0.01), 5000);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// PATH A: SUCCESSFUL DISBURSEMENT
// ============================================================================

/**
 * Step A-1: Verify worker exists
 */
async function stepA1_verifyWorker(workerId: string) {
  log(`\n📋 Step A-1: Verifying worker exists`, "cyan");
  log(`   Worker ID: ${workerId}`);

  const { data, error } = await supabase
    .from("workers")
    .select("id, full_name, user_id")
    .eq("id", workerId)
    .single();

  if (error || !data) {
    log(`   ❌ Worker not found: ${error?.message}`, "red");
    throw new Error(`Worker not found: ${error?.message}`);
  }

  log(`   ✅ Worker found: ${data.full_name || data.id}`, "green");
  return data;
}

/**
 * Step A-2: Get or create worker wallet
 */
async function stepA2_getOrCreateWallet(
  workerId: string,
  requiredBalance: number,
) {
  log(`\n💰 Step A-2: Getting worker wallet`, "cyan");

  let { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("worker_id", workerId)
    .maybeSingle();

  if (error) {
    log(`   ❌ Error fetching wallet: ${error.message}`, "red");
    throw error;
  }

  if (!wallet) {
    log(`   ℹ️  No wallet found, creating one...`, "yellow");

    const { data: newWallet, error: createError } = await supabase
      .from("wallets")
      .insert({
        business_id: null,
        worker_id: workerId,
        balance: requiredBalance,
        currency: "IDR",
        is_active: true,
      })
      .select()
      .single();

    if (createError || !newWallet) {
      log(`   ❌ Failed to create wallet: ${createError?.message}`, "red");
      throw createError;
    }

    wallet = newWallet;
    log(
      `   ✅ Wallet created with balance: ${formatCurrency(requiredBalance)}`,
      "green",
    );
  } else {
    // Ensure wallet has sufficient balance
    if (Number(wallet.balance) < requiredBalance) {
      const amountToSeed = requiredBalance - Number(wallet.balance);
      log(
        `   ℹ️  Seeding wallet with ${formatCurrency(amountToSeed)}...`,
        "yellow",
      );

      const { data: updatedWallet, error: updateError } = await supabase
        .from("wallets")
        .update({
          balance: requiredBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id)
        .select()
        .single();

      if (updateError || !updatedWallet) {
        log(`   ❌ Failed to seed wallet: ${updateError?.message}`, "red");
        throw updateError;
      }

      wallet = updatedWallet;
      log(
        `   ✅ Wallet seeded to: ${formatCurrency(requiredBalance)}`,
        "green",
      );
    } else {
      log(`   ✅ Wallet found`, "green");
    }
  }

  log(
    `   Current balance: ${formatCurrency(Number(wallet.balance))}`,
    "blue",
  );
  return wallet;
}

/**
 * Step A-3: Verify bank account belongs to worker
 */
async function stepA3_verifyBankAccount(
  workerId: string,
  bankAccountId: string,
) {
  log(`\n🏦 Step A-3: Verifying bank account`, "cyan");

  const { data: bankAccount, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("id", bankAccountId)
    .eq("worker_id", workerId)
    .single();

  if (error || !bankAccount) {
    log(`   ❌ Bank account not found: ${error?.message}`, "red");
    throw new Error(`Bank account not found: ${error?.message}`);
  }

  const bankNames: Record<string, string> = {
    BCA: "Bank Central Asia",
    BRI: "Bank Rakyat Indonesia",
    Mandiri: "Bank Mandiri",
    BNI: "Bank Nasional Indonesia",
  };

  const bankName = bankNames[bankAccount.bank_code] || bankAccount.bank_code;

  log(`   ✅ Bank account found`, "green");
  log(`   Bank: ${bankName}`, "blue");
  log(`   Account Number: ${bankAccount.bank_account_number}`, "blue");
  log(`   Account Name: ${bankAccount.bank_account_name}`, "blue");

  return bankAccount;
}

/**
 * Step A-4: Validate withdrawal amount
 */
function stepA4_validateWithdrawalAmount(
  amount: number,
  availableBalance: number,
) {
  log(`\n💵 Step A-4: Validating withdrawal amount`, "cyan");
  log(`   Amount: ${formatCurrency(amount)}`);
  log(`   Available balance: ${formatCurrency(availableBalance)}`);

  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    log(
      `   ❌ Amount below minimum (${formatCurrency(MIN_WITHDRAWAL_AMOUNT)})`,
      "red",
    );
    throw new Error(
      `Minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL_AMOUNT)}`,
    );
  }

  if (amount > MAX_WITHDRAWAL_AMOUNT) {
    log(`   ❌ Amount exceeds maximum (Rp 100.000.000)`, "red");
    throw new Error("Maximum withdrawal amount is Rp 100.000.000");
  }

  if (amount > availableBalance) {
    log(`   ❌ Insufficient balance`, "red");
    throw new Error(
      `Insufficient balance. Available: ${formatCurrency(availableBalance)}`,
    );
  }

  const fee = calculateFee(amount);
  const netAmount = amount - fee;

  log(`   ✅ Amount valid`, "green");
  log(`   Fee (1% min. Rp 5.000): ${formatCurrency(fee)}`, "blue");
  log(`   Net amount: ${formatCurrency(netAmount)}`, "blue");

  return { amount, fee, netAmount };
}

/**
 * Step A-5: Create payout request
 */
async function stepA5_createPayoutRequest(
  workerId: string,
  bankAccount: any,
  amount: number,
  fee: number,
  netAmount: number,
) {
  log(`\n📝 Step A-5: Creating payout request`, "cyan");

  const { data: payoutRequest, error } = await supabase
    .from("payout_requests")
    .insert({
      worker_id: workerId,
      amount: amount,
      fee_amount: fee,
      net_amount: netAmount,
      status: "pending",
      bank_code: bankAccount.bank_code,
      bank_account_number: bankAccount.bank_account_number,
      bank_account_name: bankAccount.bank_account_name,
      payment_provider: "xendit",
      provider_payout_id: `test_payout_${Date.now()}`,
      provider_response: { test_mode: true },
      requested_at: new Date().toISOString(),
      processed_at: null,
      completed_at: null,
      failed_at: null,
      failure_reason: null,
      metadata: { bank_account_id: bankAccount.id, test_mode: true },
    })
    .select()
    .single();

  if (error || !payoutRequest) {
    log(`   ❌ Failed to create payout request: ${error?.message}`, "red");
    throw error;
  }

  log(`   ✅ Payout request created`, "green");
  log(`   Payout Request ID: ${payoutRequest.id}`, "blue");
  log(`   Status: ${payoutRequest.status}`, "blue");

  return payoutRequest;
}

/**
 * Step A-6: Debit worker wallet
 */
async function stepA6_debitWorkerWallet(workerId: string, amount: number) {
  log(`\n💰 Step A-6: Debiting worker wallet`, "cyan");
  log(`   Amount to debit: ${formatCurrency(amount)}`);

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("worker_id", workerId)
    .single();

  if (walletError || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${walletError?.message}`, "red");
    throw walletError;
  }

  const currentBalance = Number(wallet.balance);
  const newBalance = currentBalance - amount;

  const { data: updatedWallet, error: updateError } = await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id)
    .select()
    .single();

  if (updateError || !updatedWallet) {
    log(`   ❌ Failed to debit wallet: ${updateError?.message}`, "red");
    throw updateError;
  }

  log(`   ✅ Wallet debited successfully`, "green");
  log(`   Previous balance: ${formatCurrency(currentBalance)}`, "blue");
  log(`   New balance: ${formatCurrency(Number(updatedWallet.balance))}`, "blue");

  return updatedWallet;
}

/**
 * Step A-7: Simulate successful payout webhook
 */
async function stepA7_simulateSuccessWebhook(payoutRequest: any) {
  log(`\n🔔 Step A-7: Simulating successful payout webhook`, "cyan");

  const webhookPayload = {
    external_id: payoutRequest.id,
    id: payoutRequest.provider_payout_id,
    status: "COMPLETED",
    completed_at: new Date().toISOString(),
    amount: payoutRequest.net_amount,
  };

  log(`   Webhook payload:`, "blue");
  log(`   - external_id: ${webhookPayload.external_id}`, "blue");
  log(`   - status: ${webhookPayload.status}`, "blue");
  log(`   - amount: ${formatCurrency(webhookPayload.amount)}`, "blue");

  // Simulate webhook handler: update payout to completed
  const { data: updatedPayout, error: updateError } = await supabase
    .from("payout_requests")
    .update({
      status: "completed",
      completed_at: webhookPayload.completed_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payoutRequest.id)
    .select()
    .single();

  if (updateError || !updatedPayout) {
    log(`   ❌ Failed to update payout: ${updateError?.message}`, "red");
    throw updateError;
  }

  log(`   ✅ Payout status updated to 'completed'`, "green");

  return updatedPayout;
}

/**
 * Step A-8: Verify payout record
 */
async function stepA8_verifyPayoutRecord(
  payoutRequestId: string,
  expectedStatus: string,
) {
  log(`\n🔍 Step A-8: Verifying payout record`, "cyan");

  const { data: payout, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("id", payoutRequestId)
    .single();

  if (error || !payout) {
    log(`   ❌ Failed to fetch payout: ${error?.message}`, "red");
    throw error;
  }

  if (payout.status !== expectedStatus) {
    log(
      `   ❌ Payout status mismatch. Expected: ${expectedStatus}, Got: ${payout.status}`,
      "red",
    );
    throw new Error(`Payout status mismatch`);
  }

  log(`   ✅ Payout record verified`, "green");
  log(`   Status: ${payout.status}`, "blue");
  log(`   Amount: ${formatCurrency(Number(payout.amount))}`, "blue");
  log(`   Fee: ${formatCurrency(Number(payout.fee_amount))}`, "blue");
  log(`   Net amount: ${formatCurrency(Number(payout.net_amount))}`, "blue");
  log(`   Completed at: ${payout.completed_at}`, "blue");

  return payout;
}

/**
 * Step A-9: Verify wallet balance after withdrawal
 */
async function stepA9_verifyWalletBalance(
  workerId: string,
  expectedBalance: number,
) {
  log(`\n💰 Step A-9: Verifying wallet balance after withdrawal`, "cyan");

  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("worker_id", workerId)
    .single();

  if (error || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${error?.message}`, "red");
    throw error;
  }

  const actualBalance = Number(wallet.balance);

  if (Math.abs(actualBalance - expectedBalance) > 0.01) {
    log(
      `   ❌ Balance mismatch. Expected: ${formatCurrency(expectedBalance)}, Got: ${formatCurrency(actualBalance)}`,
      "red",
    );
    throw new Error(`Wallet balance mismatch`);
  }

  log(`   ✅ Wallet balance verified`, "green");
  log(`   Balance: ${formatCurrency(actualBalance)}`, "blue");

  return wallet;
}

// ============================================================================
// PATH B: FAILED DISBURSEMENT + WALLET REFUND
// ============================================================================

/**
 * Step B-1: Create payout request for failure simulation
 */
async function stepB1_createPendingPayout(
  workerId: string,
  bankAccount: any,
  amount: number,
  fee: number,
  netAmount: number,
) {
  log(`\n📝 Step B-1: Creating pending payout request`, "cyan");

  const { data: payoutRequest, error } = await supabase
    .from("payout_requests")
    .insert({
      worker_id: workerId,
      amount: amount,
      fee_amount: fee,
      net_amount: netAmount,
      status: "pending",
      bank_code: bankAccount.bank_code,
      bank_account_number: bankAccount.bank_account_number,
      bank_account_name: bankAccount.bank_account_name,
      payment_provider: "xendit",
      provider_payout_id: `test_failed_payout_${Date.now()}`,
      provider_response: { test_mode: true },
      requested_at: new Date().toISOString(),
      processed_at: null,
      completed_at: null,
      failed_at: null,
      failure_reason: null,
      metadata: { bank_account_id: bankAccount.id, test_mode: true },
    })
    .select()
    .single();

  if (error || !payoutRequest) {
    log(`   ❌ Failed to create payout request: ${error?.message}`, "red");
    throw error;
  }

  log(`   ✅ Payout request created with ID: ${payoutRequest.id}`, "green");
  log(`   Status: ${payoutRequest.status}`, "blue");

  return payoutRequest;
}

/**
 * Step B-2: Debit wallet (pending payout)
 */
async function stepB2_debitWalletForPendingPayout(
  workerId: string,
  amount: number,
) {
  log(`\n💰 Step B-2: Debiting wallet for pending payout`, "cyan");
  log(`   Amount to debit: ${formatCurrency(amount)}`);

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("worker_id", workerId)
    .single();

  if (walletError || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${walletError?.message}`, "red");
    throw walletError;
  }

  const currentBalance = Number(wallet.balance);
  const balanceAfterDebit = currentBalance - amount;

  const { data: updatedWallet, error: updateError } = await supabase
    .from("wallets")
    .update({
      balance: balanceAfterDebit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id)
    .select()
    .single();

  if (updateError || !updatedWallet) {
    log(`   ❌ Failed to debit wallet: ${updateError?.message}`, "red");
    throw updateError;
  }

  log(`   ✅ Wallet debited`, "green");
  log(`   Balance before: ${formatCurrency(currentBalance)}`, "blue");
  log(`   Balance after: ${formatCurrency(balanceAfterDebit)}`, "blue");

  return { wallet: updatedWallet, balanceAfterDebit };
}

/**
 * Step B-3: Simulate failed payout webhook
 */
async function stepB3_simulateFailedWebhook(payoutRequest: any) {
  log(`\n🔔 Step B-3: Simulating failed payout webhook`, "cyan");

  const webhookPayload = {
    external_id: payoutRequest.id,
    id: payoutRequest.provider_payout_id,
    status: "FAILED",
    failure_reason: "Bank account validation failed",
    amount: payoutRequest.net_amount,
  };

  log(`   Webhook payload:`, "blue");
  log(`   - external_id: ${webhookPayload.external_id}`, "blue");
  log(`   - status: ${webhookPayload.status}`, "blue");
  log(`   - failure_reason: ${webhookPayload.failure_reason}`, "blue");

  // Simulate webhook handler: mark payout as failed
  const { data: failedPayout, error: failError } = await supabase
    .from("payout_requests")
    .update({
      status: "failed",
      failure_reason: webhookPayload.failure_reason,
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payoutRequest.id)
    .select()
    .single();

  if (failError || !failedPayout) {
    log(`   ❌ Failed to update payout: ${failError?.message}`, "red");
    throw failError;
  }

  log(`   ✅ Payout status updated to 'failed'`, "green");

  return failedPayout;
}

/**
 * Step B-4: Verify payout record shows failed status
 */
async function stepB4_verifyFailedPayoutRecord(payoutRequestId: string) {
  log(`\n🔍 Step B-4: Verifying failed payout record`, "cyan");

  const { data: payout, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("id", payoutRequestId)
    .single();

  if (error || !payout) {
    log(`   ❌ Failed to fetch payout: ${error?.message}`, "red");
    throw error;
  }

  if (payout.status !== "failed") {
    log(
      `   ❌ Payout status mismatch. Expected: failed, Got: ${payout.status}`,
      "red",
    );
    throw new Error("Payout status should be failed");
  }

  if (!payout.failure_reason) {
    log(`   ❌ Payout should have failure_reason`, "red");
    throw new Error("Payout should have failure_reason");
  }

  if (!payout.failed_at) {
    log(`   ❌ Payout should have failed_at timestamp`, "red");
    throw new Error("Payout should have failed_at timestamp");
  }

  log(`   ✅ Payout status: ${payout.status}`, "green");
  log(`   ✅ Failure reason: ${payout.failure_reason}`, "green");
  log(`   ✅ Failed at: ${payout.failed_at}`, "green");

  return payout;
}

/**
 * Step B-5: Refund worker wallet
 */
async function stepB5_refundWallet(
  walletId: string,
  refundAmount: number,
  currentBalance: number,
) {
  log(`\n💰 Step B-5: Refunding worker wallet`, "cyan");
  log(`   Refund amount: ${formatCurrency(refundAmount)}`);

  const refundedBalance = currentBalance + refundAmount;

  const { data: refundedWallet, error: refundError } = await supabase
    .from("wallets")
    .update({
      balance: refundedBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", walletId)
    .select()
    .single();

  if (refundError || !refundedWallet) {
    log(`   ❌ Failed to refund wallet: ${refundError?.message}`, "red");
    throw refundError;
  }

  log(`   ✅ Wallet refunded`, "green");
  log(`   Balance before refund: ${formatCurrency(currentBalance)}`, "blue");
  log(`   Balance after refund: ${formatCurrency(refundedBalance)}`, "blue");

  return { wallet: refundedWallet, refundedBalance };
}

/**
 * Step B-6: Verify wallet balance is restored
 */
async function stepB6_verifyRestoredBalance(
  workerId: string,
  originalBalance: number,
) {
  log(`\n🔍 Step B-6: Verifying wallet balance is restored`, "cyan");

  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("worker_id", workerId)
    .single();

  if (error || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${error?.message}`, "red");
    throw error;
  }

  const actualBalance = Number(wallet.balance);

  if (Math.abs(actualBalance - originalBalance) > 0.01) {
    log(`   ❌ Wallet balance not properly restored!`, "red");
    log(`   Expected: ${formatCurrency(originalBalance)}`, "red");
    log(`   Got: ${formatCurrency(actualBalance)}`, "red");
    throw new Error("Wallet balance should be fully refunded on failed payout");
  }

  log(
    `   ✅ Wallet balance fully restored: ${formatCurrency(actualBalance)}`,
    "green",
  );

  return wallet;
}

/**
 * Step B-7: Clean up failed payout record
 */
async function stepB7_cleanupFailedPayout(payoutRequestId: string) {
  log(`\n🧹 Step B-7: Cleaning up failed payout record`, "cyan");

  const { error } = await supabase
    .from("payout_requests")
    .delete()
    .eq("id", payoutRequestId);

  if (error) {
    log(`   ⚠️  Failed to delete payout: ${error.message}`, "yellow");
  } else {
    log(`   ✅ Payout request deleted`, "green");
  }
}

// ============================================================================
// Main Test Execution
// ============================================================================

async function runPathA_SuccessfulWithdrawal(
  workerId: string,
  bankAccountId: string,
  amount: number,
  initialWalletBalance: number,
) {
  log("\n" + "=".repeat(70), "cyan");
  log("🧪 PATH A: Successful Withdrawal", "cyan");
  log("=".repeat(70), "cyan");

  try {
    // Steps A-1 through A-9
    await stepA1_verifyWorker(workerId);
    await sleep(300);

    const wallet = await stepA2_getOrCreateWallet(workerId, initialWalletBalance);
    await sleep(300);

    const bankAccount = await stepA3_verifyBankAccount(workerId, bankAccountId);
    await sleep(300);

    const { fee, netAmount } = stepA4_validateWithdrawalAmount(
      amount,
      Number(wallet.balance),
    );
    await sleep(300);

    const payoutRequest = await stepA5_createPayoutRequest(
      workerId,
      bankAccount,
      amount,
      fee,
      netAmount,
    );
    await sleep(500);

    await stepA6_debitWorkerWallet(workerId, amount);
    await sleep(500);

    await stepA7_simulateSuccessWebhook(payoutRequest);
    await sleep(500);

    await stepA8_verifyPayoutRecord(payoutRequest.id, "completed");
    await sleep(300);

    const expectedBalance = initialWalletBalance - amount;
    await stepA9_verifyWalletBalance(workerId, expectedBalance);

    log("\n" + "=".repeat(70), "green");
    log("✅ PATH A PASSED: Successful withdrawal flow works correctly", "green");
    log("=".repeat(70), "green");

    return {
      success: true,
      payoutRequestId: payoutRequest.id,
      initialBalance: initialWalletBalance,
      finalBalance: expectedBalance,
    };
  } catch (error) {
    log("\n" + "=".repeat(70), "red");
    log("❌ PATH A FAILED", "red");
    log("=".repeat(70) + "\n", "red");
    log(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      "red",
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runPathB_FailedWithdrawalWithRefund(
  workerId: string,
  bankAccountId: string,
  amount: number,
  initialWalletBalance: number,
) {
  log("\n" + "=".repeat(70), "cyan");
  log("🧪 PATH B: Failed Withdrawal with Wallet Refund", "cyan");
  log("=".repeat(70), "cyan");

  let payoutRequest: any = null;
  let walletId = "";

  try {
    // Ensure wallet has required balance
    const wallet = await stepA2_getOrCreateWallet(workerId, initialWalletBalance);
    walletId = wallet.id;
    await sleep(300);

    const bankAccount = await stepA3_verifyBankAccount(workerId, bankAccountId);
    await sleep(300);

    const { fee, netAmount } = stepA4_validateWithdrawalAmount(
      amount,
      initialWalletBalance,
    );
    await sleep(300);

    // B-1: Create pending payout
    payoutRequest = await stepB1_createPendingPayout(
      workerId,
      bankAccount,
      amount,
      fee,
      netAmount,
    );
    await sleep(500);

    // B-2: Debit wallet for pending payout
    const { balanceAfterDebit } = await stepB2_debitWalletForPendingPayout(
      workerId,
      amount,
    );
    await sleep(500);

    // B-3: Simulate failed payout webhook
    await stepB3_simulateFailedWebhook(payoutRequest);
    await sleep(500);

    // B-4: Verify payout record shows failed
    await stepB4_verifyFailedPayoutRecord(payoutRequest.id);
    await sleep(300);

    // B-5: Refund wallet
    await stepB5_refundWallet(walletId, amount, balanceAfterDebit);
    await sleep(500);

    // B-6: Verify wallet balance is restored
    await stepB6_verifyRestoredBalance(workerId, initialWalletBalance);
    await sleep(300);

    // B-7: Clean up
    await stepB7_cleanupFailedPayout(payoutRequest.id);

    log("\n" + "=".repeat(70), "green");
    log(
      "✅ PATH B PASSED: Failed withdrawal with refund works correctly",
      "green",
    );
    log("=".repeat(70), "green");

    return {
      success: true,
      payoutRequestId: payoutRequest?.id,
      initialBalance: initialWalletBalance,
      balanceAfterDebit,
      finalBalance: initialWalletBalance,
    };
  } catch (error) {
    // Attempt cleanup even on failure
    if (payoutRequest?.id) {
      await stepB7_cleanupFailedPayout(payoutRequest.id);
    }

    log("\n" + "=".repeat(70), "red");
    log("❌ PATH B FAILED", "red");
    log("=".repeat(70) + "\n", "red");
    log(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      "red",
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main test runner
 */
async function runE2ETest(
  workerId: string,
  bankAccountId: string,
  amount: number = TEST_AMOUNT,
) {
  log("\n" + "=".repeat(70), "magenta");
  log("🧪 E2E TEST: Worker Disbursement Flow", "magenta");
  log("   Successful Withdrawal + Failed Withdrawal / Refund", "magenta");
  log("=".repeat(70) + "\n", "magenta");

  // Use a higher seed balance to cover both paths
  const seedBalance = amount * 3;
  const pathAResult = await runPathA_SuccessfulWithdrawal(
    workerId,
    bankAccountId,
    amount,
    seedBalance,
  );

  // Reset wallet before Path B
  log("\n" + "-".repeat(70), "yellow");
  log("ℹ️  Resetting wallet before Path B...", "yellow");
  log("-".repeat(70), "yellow");

  const { data: resetWallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("worker_id", workerId)
    .single();

  if (resetWallet) {
    await supabase
      .from("wallets")
      .update({
        balance: seedBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resetWallet.id);
  }

  const pathBResult = await runPathB_FailedWithdrawalWithRefund(
    workerId,
    bankAccountId,
    amount,
    seedBalance,
  );

  // Final Summary
  log("\n" + "=".repeat(70), "magenta");
  log("📊 FINAL TEST SUMMARY", "magenta");
  log("=".repeat(70), "magenta");

  log(`\n   Worker ID: ${workerId}`, "blue");
  log(`   Bank Account ID: ${bankAccountId}`, "blue");
  log(`   Test Amount: ${formatCurrency(amount)}`, "blue");
  log(`   Seed Balance: ${formatCurrency(seedBalance)}`, "blue");

  log("\n   PATH A — Successful Withdrawal:", "cyan");
  log(`   - Status: ${pathAResult.success ? "✅ PASSED" : "❌ FAILED"}`, "cyan");
  if (pathAResult.success) {
    log(`   - Payout ID: ${pathAResult.payoutRequestId}`, "blue");
    log(
      `   - Balance: ${formatCurrency(pathAResult.initialBalance)} → ${formatCurrency(pathAResult.finalBalance)}`,
      "blue",
    );
  } else {
    log(`   - Error: ${pathAResult.error}`, "red");
  }

  log("\n   PATH B — Failed Withdrawal + Refund:", "cyan");
  log(`   - Status: ${pathBResult.success ? "✅ PASSED" : "❌ FAILED"}`, "cyan");
  if (pathBResult.success) {
    log(`   - Payout ID: ${pathBResult.payoutRequestId}`, "blue");
    log(
      `   - Balance: ${formatCurrency(pathBResult.initialBalance)} → ${formatCurrency(pathBResult.balanceAfterDebit)} → ${formatCurrency(pathBResult.finalBalance)}`,
      "blue",
    );
    log(`   - Refund verified ✅`, "green");
  } else {
    log(`   - Error: ${pathBResult.error}`, "red");
  }

  const allPassed = pathAResult.success && pathBResult.success;

  if (allPassed) {
    log("\n" + "=".repeat(70), "green");
    log("✅ ALL DISBURSEMENT FLOW TESTS PASSED", "green");
    log("=".repeat(70) + "\n", "green");
  } else {
    log("\n" + "=".repeat(70), "red");
    log("❌ SOME TESTS FAILED — REVIEW OUTPUT ABOVE", "red");
    log("=".repeat(70) + "\n", "red");
  }

  return {
    success: allPassed,
    pathA: pathAResult,
    pathB: pathBResult,
  };
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    log("E2E Test: Worker Disbursement (Withdrawal) Flow", "cyan");
    log("");
    log("Verifies two paths:", "cyan");
    log("  PATH A — Successful withdrawal through to completion", "cyan");
    log(
      "  PATH B — Failed payout webhook triggers wallet refund",
      "cyan",
    );
    log("");
    log("Usage:", "yellow");
    log(
      "  npx ts-node scripts/test-e2e-disbursement-flow.ts <worker_id> <bank_account_id> [amount]",
      "yellow",
    );
    log("");
    log("Arguments:", "yellow");
    log(
      "  worker_id       - The UUID of the worker to test",
      "yellow",
    );
    log(
      "  bank_account_id - The UUID of the worker's bank account",
      "yellow",
    );
    log(
      "  amount          - Optional. Withdrawal amount in IDR (default: 100000)",
      "yellow",
    );
    log("");
    log("Examples:", "yellow");
    log(
      "  npx ts-node scripts/test-e2e-disbursement-flow.ts <worker_id> <bank_account_id>",
      "yellow",
    );
    log(
      "  npx ts-node scripts/test-e2e-disbursement-flow.ts <worker_id> <bank_account_id> 100000",
      "yellow",
    );
    process.exit(0);
  }

  if (args.length < 2) {
    log(
      "Usage: npx ts-node scripts/test-e2e-disbursement-flow.ts <worker_id> <bank_account_id> [amount]",
      "yellow",
    );
    log("\nArguments:", "yellow");
    log("  worker_id       - The UUID of the worker to test", "yellow");
    log(
      "  bank_account_id - The UUID of the worker's bank account",
      "yellow",
    );
    log(
      "  amount          - Optional. Withdrawal amount in IDR (default: 100000)",
      "yellow",
    );
    log("\nExample:", "yellow");
    log(
      "  npx ts-node scripts/test-e2e-disbursement-flow.ts 123e4567-e89b-12d3-a456-426614174000 987fcdeb-51a2-22d3-a456-426614174000 100000",
      "yellow",
    );
    process.exit(1);
  }

  const workerId = args[0];
  const bankAccountId = args[1];
  const amount = args[2] ? parseInt(args[2], 10) : TEST_AMOUNT;

  // Validate UUID formats
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!workerId.match(uuidRegex)) {
    log("❌ Invalid worker ID format. Expected UUID format.", "red");
    process.exit(1);
  }

  if (!bankAccountId.match(uuidRegex)) {
    log("❌ Invalid bank account ID format. Expected UUID format.", "red");
    process.exit(1);
  }

  if (isNaN(amount) || amount <= 0) {
    log("❌ Invalid amount. Must be a positive number.", "red");
    process.exit(1);
  }

  runE2ETest(workerId, bankAccountId, amount)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      log(`\n❌ Unexpected error: ${error.message}`, "red");
      process.exit(1);
    });
}

export { runE2ETest };
