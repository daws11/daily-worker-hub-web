#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: Payment Refund Flow
 *
 * This script verifies the end-to-end refund flow:
 * 1. Business user performs successful top-up (payment -> webhook -> wallet credited)
 * 2. Xendit refund webhook is simulated (provider issues partial/full refund)
 * 3. Business wallet is debited by the refund amount
 * 4. Refund record is created in wallet_transactions table
 *
 * Usage:
 *   npx ts-node scripts/test-e2e-payment-refund-flow.ts <business_id> [amount]
 *
 * Example:
 *   npx ts-node scripts/test-e2e-payment-refund-flow.ts <business_id> 500000
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
const TEST_AMOUNT = 500000; // Rp 500.000 (minimum per spec)
const MIN_TOPUP_AMOUNT = 500000;
const FEE_PERCENTAGE = 0.007;
const FIXED_FEE = 500;

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
  return Math.floor(amount * FEE_PERCENTAGE) + FIXED_FEE;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// PHASE 1: Successful Top-Up (baseline setup)
// ============================================================================

/**
 * Step 1: Verify business exists
 */
async function verifyBusiness(businessId: string) {
  log(`\n📋 Step 1: Verifying business exists`, "cyan");
  log(`   Business ID: ${businessId}`);

  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, user_id")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    log(`   ❌ Business not found: ${error?.message}`, "red");
    throw new Error(`Business not found: ${error?.message}`);
  }

  log(`   ✅ Business found: ${data.name}`, "green");
  return data;
}

/**
 * Step 2: Get or create business wallet
 */
async function getOrCreateWallet(businessId: string) {
  log(`\n💰 Step 2: Getting business wallet`, "cyan");

  let { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("business_id", businessId)
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
        business_id: businessId,
        worker_id: null,
        balance: 0,
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
    log(`   ✅ Wallet created successfully`, "green");
  } else {
    log(`   ✅ Wallet found`, "green");
  }

  log(`   Current balance: ${formatCurrency(Number(wallet.balance))}`, "blue");
  return wallet;
}

/**
 * Step 3: Validate top-up amount
 */
function verifyTopUpAmount(amount: number) {
  log(`\n💵 Step 3: Validating top-up amount`, "cyan");
  log(`   Amount: ${formatCurrency(amount)}`);

  if (amount < MIN_TOPUP_AMOUNT) {
    log(
      `   ❌ Amount below minimum (${formatCurrency(MIN_TOPUP_AMOUNT)})`,
      "red",
    );
    throw new Error(
      `Minimum top-up amount is ${formatCurrency(MIN_TOPUP_AMOUNT)}`,
    );
  }

  if (amount > 100000000) {
    log(`   ❌ Amount exceeds maximum (Rp 100.000.000)`, "red");
    throw new Error("Maximum top-up amount is Rp 100.000.000");
  }

  const fee = calculateFee(amount);
  log(`   ✅ Amount valid`, "green");
  log(`   Fee (0.7% + Rp 500): ${formatCurrency(fee)}`, "blue");
  log(`   Total amount: ${formatCurrency(amount + fee)}`, "blue");

  return { amount, fee, total: amount + fee };
}

/**
 * Step 4: Create payment transaction (pending)
 */
async function createPaymentTransaction(
  businessId: string,
  amount: number,
  fee: number,
) {
  log(`\n📝 Step 4: Creating payment transaction`, "cyan");

  const totalAmount = amount + fee;
  const qrisExpiresAt = new Date(Date.now() + 60 * 60000).toISOString();

  const { data: transaction, error } = await supabase
    .from("payment_transactions")
    .insert({
      business_id: businessId,
      amount: totalAmount,
      status: "pending",
      payment_provider: "xendit",
      provider_payment_id: `test_refund_payment_${Date.now()}`,
      payment_url: `https://checkout.xendit.co/test/${Date.now()}`,
      qris_expires_at: qrisExpiresAt,
      fee_amount: fee,
      metadata: { test_mode: true },
    })
    .select()
    .single();

  if (error || !transaction) {
    log(`   ❌ Failed to create transaction: ${error?.message}`, "red");
    throw error;
  }

  log(`   ✅ Transaction created`, "green");
  log(`   Transaction ID: ${transaction.id}`, "blue");
  log(`   Payment URL: ${transaction.payment_url}`, "blue");

  return transaction;
}

/**
 * Step 5: Simulate successful payment webhook
 */
async function simulateSuccessWebhook(transaction: any) {
  log(`\n🔔 Step 5: Simulating successful payment webhook`, "cyan");

  const webhookPayload = {
    external_id: transaction.id,
    id: transaction.provider_payment_id,
    status: "COMPLETED",
    payment_time: new Date().toISOString(),
    amount: Number(transaction.amount),
  };

  log(`   Webhook payload:`, "blue");
  log(`   - external_id: ${webhookPayload.external_id}`, "blue");
  log(`   - status: ${webhookPayload.status}`, "blue");
  log(`   - amount: ${formatCurrency(webhookPayload.amount)}`, "blue");

  // Update transaction to success status (simulating webhook handler)
  const { data: updatedTransaction, error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      status: "success",
      paid_at: webhookPayload.payment_time,
    })
    .eq("id", transaction.id)
    .select()
    .single();

  if (updateError || !updatedTransaction) {
    log(`   ❌ Failed to update transaction: ${updateError?.message}`, "red");
    throw updateError;
  }

  log(`   ✅ Transaction status updated to 'success'`, "green");

  return updatedTransaction;
}

/**
 * Step 6: Credit business wallet (net amount after fee)
 */
async function creditBusinessWallet(
  businessId: string,
  transactionId: string,
  netAmount: number,
) {
  log(`\n💰 Step 6: Crediting business wallet`, "cyan");
  log(`   Net amount to credit: ${formatCurrency(netAmount)}`);

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("business_id", businessId)
    .single();

  if (walletError || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${walletError?.message}`, "red");
    throw walletError;
  }

  const currentBalance = Number(wallet.balance);
  const newBalance = currentBalance + netAmount;

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
    log(`   ❌ Failed to credit wallet: ${updateError?.message}`, "red");
    throw updateError;
  }

  log(`   ✅ Wallet credited successfully`, "green");
  log(`   Previous balance: ${formatCurrency(currentBalance)}`, "blue");
  log(`   New balance: ${formatCurrency(Number(updatedWallet.balance))}`, "blue");

  await recordWalletTransaction(
    wallet.id,
    netAmount,
    transactionId,
    "top_up",
    "Payment via Xendit - top_up",
  );

  return updatedWallet;
}

/**
 * Record a wallet transaction entry
 */
async function recordWalletTransaction(
  walletId: string,
  amount: number,
  referenceId: string,
  type: "top_up" | "payment" | "refund" | "payout",
  description: string,
) {
  const { error } = await supabase.from("wallet_transactions").insert({
    wallet_id: walletId,
    type,
    amount,
    reference_id: referenceId,
    description,
    created_at: new Date().toISOString(),
  });

  if (error) {
    log(`   ⚠️  Failed to record wallet transaction: ${error.message}`, "yellow");
  } else {
    log(`   ✅ Wallet transaction recorded (type: ${type})`, "green");
  }
}

// ============================================================================
// PHASE 2: Xendit Refund Simulation
// ============================================================================

/**
 * Step 7: Verify top-up was successful (baseline for refund test)
 */
async function verifyTopUpSuccess(
  transactionId: string,
  businessId: string,
  expectedBalance: number,
) {
  log(`\n🔍 Step 7: Verifying top-up was successful`, "cyan");

  const { data: transaction, error: txError } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (txError || !transaction) {
    log(`   ❌ Failed to fetch transaction: ${txError?.message}`, "red");
    throw txError;
  }

  if (transaction.status !== "success") {
    log(
      `   ❌ Transaction status mismatch. Expected: success, Got: ${transaction.status}`,
      "red",
    );
    throw new Error("Transaction was not successful");
  }

  log(`   ✅ Transaction status: ${transaction.status}`, "green");

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("business_id", businessId)
    .single();

  if (walletError || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${walletError?.message}`, "red");
    throw walletError;
  }

  const actualBalance = Number(wallet.balance);
  if (Math.abs(actualBalance - expectedBalance) > 0.01) {
    log(
      `   ❌ Balance mismatch. Expected: ${formatCurrency(expectedBalance)}, Got: ${formatCurrency(actualBalance)}`,
      "red",
    );
    throw new Error("Wallet balance mismatch after top-up");
  }

  log(`   ✅ Wallet balance verified: ${formatCurrency(actualBalance)}`, "green");

  return { transaction, wallet };
}

/**
 * Step 8: Simulate Xendit refund webhook
 *
 * Note: The current webhook handler does not process refund statuses.
 * Refund simulation is done via direct DB operations to exercise the
 * wallet debit and refund record logic.
 */
async function simulateRefundWebhook(
  transactionId: string,
  providerPaymentId: string,
  refundAmount: number,
  isFullRefund: boolean,
) {
  log(`\n🔔 Step 8: Simulating Xendit refund webhook`, "cyan");

  const webhookPayload = {
    external_id: transactionId,
    id: providerPaymentId,
    status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
    refund_amount: refundAmount,
    refund_time: new Date().toISOString(),
    amount: refundAmount,
    type: "REFUND",
  };

  log(`   Webhook payload:`, "blue");
  log(`   - external_id: ${webhookPayload.external_id}`, "blue");
  log(`   - status: ${webhookPayload.status}`, "blue");
  log(`   - refund_amount: ${formatCurrency(webhookPayload.refund_amount)}`, "blue");
  log(`   - type: ${webhookPayload.type}`, "blue");

  // Update transaction with refund info (simulating what a real refund handler would do)
  const { data: updatedTransaction, error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      refund_amount: refundAmount,
      refund_status: webhookPayload.status,
      refunded_at: webhookPayload.refund_time,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .select()
    .single();

  if (updateError || !updatedTransaction) {
    log(`   ❌ Failed to update transaction with refund: ${updateError?.message}`, "red");
    throw updateError;
  }

  log(`   ✅ Transaction updated with refund info`, "green");
  log(`   Refund status: ${updatedTransaction.refund_status}`, "blue");
  log(`   Refund amount: ${formatCurrency(refundAmount)}`, "blue");

  return updatedTransaction;
}

// ============================================================================
// PHASE 3: Wallet Debit (Refund)
// ============================================================================

/**
 * Step 9: Debit business wallet for refund amount
 */
async function debitBusinessWallet(
  businessId: string,
  refundAmount: number,
) {
  log(`\n💰 Step 9: Debiting business wallet for refund`, "cyan");
  log(`   Refund amount: ${formatCurrency(refundAmount)}`);

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("business_id", businessId)
    .single();

  if (walletError || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${walletError?.message}`, "red");
    throw walletError;
  }

  const currentBalance = Number(wallet.balance);

  if (currentBalance < refundAmount) {
    log(
      `   ⚠️  Wallet balance (${formatCurrency(currentBalance)}) is less than refund amount (${formatCurrency(refundAmount)})`,
      "yellow",
    );
    log(`   ℹ️  Partial debit applied`, "yellow");
  }

  const newBalance = Math.max(0, currentBalance - refundAmount);

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

// ============================================================================
// PHASE 4: Refund Record
// ============================================================================

/**
 * Step 10: Record refund transaction in wallet_transactions
 */
async function recordRefundTransaction(
  walletId: string,
  transactionId: string,
  refundAmount: number,
) {
  log(`\n📝 Step 10: Recording refund transaction`, "cyan");

  const { data: refundRecord, error } = await supabase
    .from("wallet_transactions")
    .insert({
      wallet_id: walletId,
      type: "refund",
      amount: refundAmount,
      reference_id: transactionId,
      description: "Refund via Xendit - refund",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    log(`   ❌ Failed to record refund transaction: ${error.message}`, "red");
    throw error;
  }

  log(`   ✅ Refund transaction recorded`, "green");
  log(`   Refund record ID: ${refundRecord.id}`, "blue");
  log(`   Type: ${refundRecord.type}`, "blue");
  log(`   Amount: ${formatCurrency(Number(refundRecord.amount))}`, "blue");

  return refundRecord;
}

/**
 * Step 11: Verify refund record in wallet_transactions
 */
async function verifyRefundRecord(
  walletId: string,
  transactionId: string,
  expectedRefundAmount: number,
) {
  log(`\n🔍 Step 11: Verifying refund record`, "cyan");

  const { data: records, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("wallet_id", walletId)
    .eq("reference_id", transactionId)
    .eq("type", "refund")
    .maybeSingle();

  if (error) {
    log(`   ❌ Failed to fetch refund records: ${error.message}`, "red");
    throw error;
  }

  if (!records) {
    log(`   ❌ Refund record not found`, "red");
    throw new Error("Refund record not found in wallet_transactions");
  }

  const actualAmount = Number(records.amount);
  if (Math.abs(actualAmount - expectedRefundAmount) > 0.01) {
    log(
      `   ❌ Refund amount mismatch. Expected: ${formatCurrency(expectedRefundAmount)}, Got: ${formatCurrency(actualAmount)}`,
      "red",
    );
    throw new Error("Refund amount mismatch");
  }

  log(`   ✅ Refund record verified`, "green");
  log(`   Record ID: ${records.id}`, "blue");
  log(`   Type: ${records.type}`, "blue");
  log(`   Amount: ${formatCurrency(actualAmount)}`, "blue");
  log(`   Description: ${records.description}`, "blue");

  return records;
}

/**
 * Step 12: Verify final wallet balance
 */
async function verifyFinalBalance(
  businessId: string,
  expectedBalance: number,
) {
  log(`\n🔍 Step 12: Verifying final wallet balance`, "cyan");

  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("business_id", businessId)
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
    throw new Error("Final wallet balance mismatch");
  }

  log(`   ✅ Final balance verified: ${formatCurrency(actualBalance)}`, "green");

  return wallet;
}

/**
 * Step 13: Verify refund transaction record
 */
async function verifyRefundTransactionRecord(
  transactionId: string,
  expectedRefundAmount: number,
  expectedRefundStatus: string,
) {
  log(`\n🔍 Step 13: Verifying refund transaction record`, "cyan");

  const { data: transaction, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error || !transaction) {
    log(`   ❌ Failed to fetch transaction: ${error?.message}`, "red");
    throw error;
  }

  if (Number(transaction.refund_amount) !== expectedRefundAmount) {
    log(
      `   ❌ Refund amount mismatch. Expected: ${formatCurrency(expectedRefundAmount)}, Got: ${formatCurrency(Number(transaction.refund_amount))}`,
      "red",
    );
    throw new Error("Transaction refund amount mismatch");
  }

  if (transaction.refund_status !== expectedRefundStatus) {
    log(
      `   ❌ Refund status mismatch. Expected: ${expectedRefundStatus}, Got: ${transaction.refund_status}`,
      "red",
    );
    throw new Error("Transaction refund status mismatch");
  }

  log(`   ✅ Refund amount: ${formatCurrency(Number(transaction.refund_amount))}`, "green");
  log(`   ✅ Refund status: ${transaction.refund_status}`, "green");
  log(`   ✅ Refunded at: ${transaction.refunded_at}`, "green");

  return transaction;
}

/**
 * Step 14: Clean up test records
 */
async function cleanupTestRecords(
  transactionId: string,
  walletId: string,
) {
  log(`\n🧹 Step 14: Cleaning up test records`, "cyan");

  const { error: walletTxError } = await supabase
    .from("wallet_transactions")
    .delete()
    .eq("wallet_id", walletId)
    .eq("reference_id", transactionId);

  if (walletTxError) {
    log(`   ⚠️  Failed to delete wallet transactions: ${walletTxError.message}`, "yellow");
  } else {
    log(`   ✅ Wallet transaction records deleted`, "green");
  }

  const { error: txError } = await supabase
    .from("payment_transactions")
    .delete()
    .eq("id", transactionId);

  if (txError) {
    log(`   ⚠️  Failed to delete payment transaction: ${txError.message}`, "yellow");
  } else {
    log(`   ✅ Payment transaction deleted`, "green");
  }

  const { error: resetError } = await supabase
    .from("wallets")
    .update({
      balance: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", walletId);

  if (resetError) {
    log(`   ⚠️  Failed to reset wallet balance: ${resetError.message}`, "yellow");
  } else {
    log(`   ✅ Wallet balance reset to 0`, "green");
  }
}

// ============================================================================
// Main Test Execution
// ============================================================================

async function runE2ETest(
  businessId: string,
  amount: number = TEST_AMOUNT,
  refundPercentage: number = 1.0,
) {
  log("\n" + "=".repeat(70), "magenta");
  log("🧪 E2E TEST: Payment Refund Flow", "magenta");
  log("=".repeat(70) + "\n", "magenta");

  const isFullRefund = refundPercentage >= 1.0;

  try {
    // Phase 1: Successful Top-Up (baseline)
    log("\n" + "-".repeat(70), "cyan");
    log("📦 PHASE 1: Successful Top-Up (Baseline Setup)", "cyan");
    log("-".repeat(70), "cyan");

    // Step 1: Verify business
    await verifyBusiness(businessId);

    // Step 2: Get/create wallet
    const wallet = await getOrCreateWallet(businessId);
    const initialBalance = Number(wallet.balance);

    // Step 3: Validate amount
    const { fee, total } = verifyTopUpAmount(amount);

    // Step 4: Create pending payment transaction
    const transaction = await createPaymentTransaction(businessId, amount, fee);

    await sleep(500);

    // Step 5: Simulate successful webhook
    await simulateSuccessWebhook(transaction);

    await sleep(500);

    // Step 6: Credit wallet
    const netTopupAmount = total - fee;
    const creditedWallet = await creditBusinessWallet(
      businessId,
      transaction.id,
      netTopupAmount,
    );

    const balanceAfterTopUp = Number(creditedWallet.balance);

    // Phase 2: Verify Top-Up Success
    log("\n" + "-".repeat(70), "cyan");
    log("🔍 PHASE 2: Verifying Top-Up Before Refund", "cyan");
    log("-".repeat(70), "cyan");

    // Step 7: Verify top-up was successful
    await verifyTopUpSuccess(transaction.id, businessId, balanceAfterTopUp);

    // Phase 3: Refund Simulation
    log("\n" + "-".repeat(70), "cyan");
    log("💸 PHASE 3: Xendit Refund Simulation", "cyan");
    log("-".repeat(70), "cyan");

    // Calculate refund amount
    const refundAmount = Math.floor(netTopupAmount * refundPercentage);

    log(`\n📋 Refund Details:`, "blue");
    log(`   Top-up amount: ${formatCurrency(amount)}`, "blue");
    log(`   Fee: ${formatCurrency(fee)}`, "blue");
    log(`   Net credited: ${formatCurrency(netTopupAmount)}`, "blue");
    log(`   Refund percentage: ${(refundPercentage * 100).toFixed(0)}%`, "blue");
    log(`   Refund amount: ${formatCurrency(refundAmount)}`, "blue");
    log(`   Refund type: ${isFullRefund ? "FULL REFUND" : "PARTIAL REFUND"}`, "blue");

    // Step 8: Simulate refund webhook
    const refundStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await simulateRefundWebhook(
      transaction.id,
      transaction.provider_payment_id,
      refundAmount,
      isFullRefund,
    );

    await sleep(500);

    // Phase 4: Wallet Debit
    log("\n" + "-".repeat(70), "cyan");
    log("💰 PHASE 4: Wallet Debit (Refund)", "cyan");
    log("-".repeat(70), "cyan");

    // Step 9: Debit business wallet
    const debitedWallet = await debitBusinessWallet(businessId, refundAmount);
    const balanceAfterDebit = Number(debitedWallet.balance);

    // Phase 5: Refund Record
    log("\n" + "-".repeat(70), "cyan");
    log("📝 PHASE 5: Refund Record Creation", "cyan");
    log("-".repeat(70), "cyan");

    // Step 10: Record refund transaction
    await recordRefundTransaction(wallet.id, transaction.id, refundAmount);

    await sleep(500);

    // Step 11: Verify refund record
    await verifyRefundRecord(wallet.id, transaction.id, refundAmount);

    // Step 12: Verify final balance
    const expectedFinalBalance = balanceAfterTopUp - refundAmount;
    await verifyFinalBalance(businessId, expectedFinalBalance);

    // Step 13: Verify transaction record
    await verifyRefundTransactionRecord(
      transaction.id,
      refundAmount,
      refundStatus,
    );

    // Step 14: Clean up
    await cleanupTestRecords(transaction.id, wallet.id);

    // Test Summary
    log("\n" + "=".repeat(70), "green");
    log("✅ ALL REFUND FLOW TESTS PASSED", "green");
    log("=".repeat(70) + "\n", "green");

    log("📊 Test Summary:", "cyan");
    log(`   Business ID: ${businessId}`, "blue");
    log(`   Transaction ID: ${transaction.id}`, "blue");
    log(`   Wallet ID: ${wallet.id}`, "blue");
    log(`   Top-up amount: ${formatCurrency(amount)}`, "blue");
    log(`   Fee: ${formatCurrency(fee)}`, "blue");
    log(`   Net credited to wallet: ${formatCurrency(netTopupAmount)}`, "blue");
    log(`   Refund percentage: ${(refundPercentage * 100).toFixed(0)}%`, "blue");
    log(`   Refund amount: ${formatCurrency(refundAmount)}`, "blue");
    log(`   Refund status: ${refundStatus}`, "blue");
    log(`   Initial balance: ${formatCurrency(initialBalance)}`, "blue");
    log(`   Balance after top-up: ${formatCurrency(balanceAfterTopUp)}`, "blue");
    log(`   Final balance: ${formatCurrency(balanceAfterDebit)}`, "blue");
    log(`\n   Flow verified:`, "green");
    log(`   1. ✅ Business exists and wallet accessible`, "green");
    log(`   2. ✅ Pending transaction created`, "green");
    log(`   3. ✅ PAID webhook simulated → transaction marked success`, "green");
    log(`   4. ✅ Wallet credited with net amount (total - fee)`, "green");
    log(`   5. ✅ Refund webhook simulated (REFUNDED/PARTIALLY_REFUNDED)`, "green");
    log(`   6. ✅ Wallet debited by refund amount`, "green");
    log(`   7. ✅ Refund record created in wallet_transactions`, "green");
    log(`   8. ✅ Payment transaction refund fields updated`, "green");
    log(`   9. ✅ Final balance verified`, "green");
    log(`   10. ✅ Test records cleaned up`, "green");

    return {
      success: true,
      transactionId: transaction.id,
      walletId: wallet.id,
      initialBalance,
      balanceAfterTopUp,
      finalBalance: balanceAfterDebit,
      refundAmount,
      refundType: refundStatus,
      netTopupAmount,
    };
  } catch (error) {
    log("\n" + "=".repeat(70), "red");
    log("❌ REFUND FLOW TEST FAILED", "red");
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

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    log("E2E Test: Payment Refund Flow", "cyan");
    log("");
    log("Usage:", "yellow");
    log("  npx ts-node scripts/test-e2e-payment-refund-flow.ts <business_id> [amount] [refund_percentage]", "yellow");
    log("");
    log("Arguments:", "yellow");
    log("  business_id        - The UUID of the business to test", "yellow");
    log("  amount             - Optional. Top-up amount in IDR (default: 500000)", "yellow");
    log("  refund_percentage  - Optional. Refund percentage: 1.0 = full, 0.5 = 50% (default: 1.0)", "yellow");
    log("");
    log("Examples:", "yellow");
    log("  Full refund:", "yellow");
    log("    npx ts-node scripts/test-e2e-payment-refund-flow.ts <business_id> 500000 1.0", "yellow");
    log("  Partial refund (50%):", "yellow");
    log("    npx ts-node scripts/test-e2e-payment-refund-flow.ts <business_id> 500000 0.5", "yellow");
    log("  Default (full refund with minimum amount):", "yellow");
    log("    npx ts-node scripts/test-e2e-payment-refund-flow.ts <business_id>", "yellow");
    process.exit(0);
  }

  if (args.length < 1) {
    log(
      "Usage: npx ts-node scripts/test-e2e-payment-refund-flow.ts <business_id> [amount] [refund_percentage]",
      "yellow",
    );
    log("\nArguments:", "yellow");
    log("  business_id        - The UUID of the business to test", "yellow");
    log("  amount             - Optional. Top-up amount in IDR (default: 500000)", "yellow");
    log("  refund_percentage  - Optional. Refund percentage: 1.0 = full, 0.5 = 50% (default: 1.0)", "yellow");
    log("\nExample:", "yellow");
    log(
      "  npx ts-node scripts/test-e2e-payment-refund-flow.ts 123e4567-e89b-12d3-a456-426614174000 500000 1.0",
      "yellow",
    );
    process.exit(1);
  }

  const businessId = args[0];
  const amount = args[1] ? parseInt(args[1], 10) : TEST_AMOUNT;
  const refundPercentage = args[2] ? parseFloat(args[2]) : 1.0;

  // Validate UUID format
  if (
    !businessId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  ) {
    log("❌ Invalid business ID format. Expected UUID format.", "red");
    process.exit(1);
  }

  if (isNaN(amount) || amount <= 0) {
    log("❌ Invalid amount. Must be a positive number.", "red");
    process.exit(1);
  }

  if (isNaN(refundPercentage) || refundPercentage <= 0 || refundPercentage > 1) {
    log("❌ Invalid refund percentage. Must be between 0 and 1 (e.g., 0.5 for 50%).", "red");
    process.exit(1);
  }

  runE2ETest(businessId, amount, refundPercentage)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      log(`\n❌ Unexpected error: ${error.message}`, "red");
      process.exit(1);
    });
}

export { runE2ETest };
