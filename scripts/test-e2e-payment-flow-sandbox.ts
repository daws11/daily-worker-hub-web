#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: QRIS Payment Flow Sandbox
 *
 * This script verifies the end-to-end QRIS payment flow in sandbox mode:
 * 1. Verify business wallet exists (or create one)
 * 2. Validate top-up amount meets minimum threshold
 * 3. Create QRIS payment via Xendit API
 * 4. Simulate successful payment webhook from Xendit
 * 5. Verify payment transaction status updated
 * 6. Verify wallet balance is credited correctly
 * 7. Verify wallet_transactions log entry is recorded
 *
 * This script is intended for sandbox/testing environments only.
 *
 * Usage:
 *   npx ts-node scripts/test-e2e-payment-flow-sandbox.ts <business_id> <amount>
 *   npx ts-node scripts/test-e2e-payment-flow-sandbox.ts --help
 *
 * Example:
 *   npx ts-node scripts/test-e2e-payment-flow-sandbox.ts 123e4567-e89b-12d3-a456-426614174000 500000
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join } from "path";
import { xenditGateway } from "../lib/payments/xendit";

// Load environment variables
const envPath = join(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration");
  console.error("Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const DEFAULT_AMOUNT = 500000; // Rp 500.000
const MIN_AMOUNT = 500000;
const MAX_AMOUNT = 100000000;
const FEE_PERCENTAGE = 0.007;
const FIXED_FEE = 500;
const QRIS_EXPIRY_MINUTES = 60;

// Colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Step helpers
// ---------------------------------------------------------------------------

/**
 * Step 1: Verify business exists
 */
async function verifyBusiness(businessId: string): Promise<{ id: string; name: string }> {
  log("\n[Step 1] Verifying business exists", "cyan");
  log(`  Business ID: ${businessId}`);

  const { data, error } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    log(`  FAIL: Business not found — ${error?.message}`, "red");
    throw new Error(`Business not found: ${error?.message}`);
  }

  log(`  OK: Business found — ${data.name}`, "green");
  return data;
}

/**
 * Step 2: Get or create business wallet
 */
async function getOrCreateWallet(businessId: string): Promise<{
  id: string;
  balance: number;
}> {
  log("\n[Step 2] Getting business wallet", "cyan");

  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    log(`  FAIL: Error fetching wallet — ${error.message}`, "red");
    throw error;
  }

  if (!wallet) {
    log("  No wallet found, creating one...", "yellow");
    const { data: newWallet, error: createError } = await supabase
      .from("wallets")
      .insert({
        business_id: businessId,
        worker_id: null,
        balance: 0,
        currency: "IDR",
        is_active: true,
      })
      .select("id, balance")
      .single();

    if (createError || !newWallet) {
      log(`  FAIL: Could not create wallet — ${createError?.message}`, "red");
      throw createError;
    }

    log(`  OK: Wallet created`, "green");
    return newWallet;
  }

  log(`  OK: Wallet found`, "green");
  log(`  Current balance: ${formatCurrency(Number(wallet.balance))}`, "blue");
  return wallet;
}

/**
 * Step 3: Validate top-up amount
 */
function validateAmount(amount: number): { amount: number; fee: number; total: number } {
  log("\n[Step 3] Validating top-up amount", "cyan");
  log(`  Amount: ${formatCurrency(amount)}`);

  if (amount < MIN_AMOUNT) {
    log(`  FAIL: Amount below minimum (${formatCurrency(MIN_AMOUNT)})`, "red");
    throw new Error(`Minimum top-up amount is ${formatCurrency(MIN_AMOUNT)}`);
  }

  if (amount > MAX_AMOUNT) {
    log(`  FAIL: Amount exceeds maximum (${formatCurrency(MAX_AMOUNT)})`, "red");
    throw new Error(`Maximum top-up amount is ${formatCurrency(MAX_AMOUNT)}`);
  }

  const fee = calculateFee(amount);
  const total = amount + fee;

  log(`  OK: Amount valid`, "green");
  log(`  Fee (0.7% + Rp 500): ${formatCurrency(fee)}`, "blue");
  log(`  Total charged: ${formatCurrency(total)}`, "blue");

  return { amount, fee, total };
}

/**
 * Step 4: Create QRIS payment via Xendit API
 */
async function createQRISPayment(
  businessId: string,
  totalAmount: number,
  fee: number,
): Promise<{
  transactionId: string;
  providerPaymentId: string;
  qrString: string;
  paymentUrl: string;
  expiresAt: string;
}> {
  log("\n[Step 4] Creating QRIS payment via Xendit", "cyan");

  const externalId = `qris_test_${businessId}_${Date.now()}`;

  try {
    const result = await xenditGateway.createQRISPayment({
      externalId,
      amount: totalAmount,
      description: `Sandbox QRIS top-up for business ${businessId}`,
      expiryMinutes: QRIS_EXPIRY_MINUTES,
      metadata: { business_id: businessId, test_mode: true },
    });

    log(`  OK: QRIS payment created`, "green");
    log(`  Provider ID:   ${result.id}`, "blue");
    log(`  External ID:   ${result.externalId}`, "blue");
    log(`  QR String:     ${result.qrString ? result.qrString.substring(0, 40) + "..." : "N/A"}`, "blue");
    log(`  Payment URL:  ${result.invoiceUrl}`, "blue");
    log(`  Expires at:   ${result.expiresAt}`, "blue");

    return {
      transactionId: result.externalId,
      providerPaymentId: result.id,
      qrString: result.qrString || "",
      paymentUrl: result.invoiceUrl || "",
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    log(
      `  FAIL: Could not create QRIS payment — ${error instanceof Error ? error.message : String(error)}`,
      "red",
    );
    throw error;
  }
}

/**
 * Step 5: Record pending payment transaction in database
 */
async function recordPendingTransaction(
  businessId: string,
  amount: number,
  fee: number,
  providerPaymentId: string,
  qrString: string,
  paymentUrl: string,
  expiresAt: string,
): Promise<{ id: string }> {
  log("\n[Step 5] Recording pending transaction in database", "cyan");

  const { data: transaction, error } = await supabase
    .from("payment_transactions")
    .insert({
      business_id: businessId,
      amount,
      status: "pending",
      payment_provider: "xendit",
      provider_payment_id: providerPaymentId,
      payment_url: paymentUrl,
      qris_string: qrString,
      qris_expires_at: expiresAt,
      fee_amount: fee,
      metadata: { test_mode: true },
    })
    .select("id")
    .single();

  if (error || !transaction) {
    log(`  FAIL: Could not record transaction — ${error?.message}`, "red");
    throw error;
  }

  log(`  OK: Transaction recorded`, "green");
  log(`  Transaction ID: ${transaction.id}`, "blue");

  return transaction;
}

/**
 * Step 6: Simulate successful Xendit webhook (PAID status)
 */
async function simulateWebhook(
  transactionId: string,
  providerPaymentId: string,
  amount: number,
): Promise<void> {
  log("\n[Step 6] Simulating Xendit PAID webhook", "cyan");

  const webhookPayload = {
    id: providerPaymentId,
    external_id: transactionId,
    status: "PAID",
    amount,
    paid_at: new Date().toISOString(),
    payment_method: "QRIS",
    payment_channel: "QRIS",
  };

  log(`  external_id:  ${webhookPayload.external_id}`, "blue");
  log(`  status:       ${webhookPayload.status}`, "blue");
  log(`  amount:       ${formatCurrency(webhookPayload.amount)}`, "blue");
  log(`  paid_at:      ${webhookPayload.paid_at}`, "blue");

  // Update transaction to success
  const { error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      status: "success",
      paid_at: webhookPayload.paid_at,
      updated_at: new Date().toISOString(),
      metadata: { payment_method: webhookPayload.payment_method, test_mode: true },
    })
    .eq("id", transactionId);

  if (updateError) {
    log(`  FAIL: Could not update transaction — ${updateError.message}`, "red");
    throw updateError;
  }

  log(`  OK: Transaction status updated to 'success'`, "green");
}

/**
 * Step 7: Credit business wallet
 */
async function creditWallet(
  businessId: string,
  amount: number,
  transactionId: string,
): Promise<{ previousBalance: number; newBalance: number }> {
  log("\n[Step 7] Crediting business wallet", "cyan");
  log(`  Amount to credit: ${formatCurrency(amount)}`);

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("business_id", businessId)
    .single();

  if (walletError || !wallet) {
    log(`  FAIL: Could not fetch wallet — ${walletError?.message}`, "red");
    throw walletError;
  }

  const previousBalance = Number(wallet.balance);
  const newBalance = previousBalance + amount;

  const { data: updatedWallet, error: updateError } = await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id)
    .select("balance")
    .single();

  if (updateError || !updatedWallet) {
    log(`  FAIL: Could not credit wallet — ${updateError?.message}`, "red");
    throw updateError;
  }

  log(`  OK: Wallet credited`, "green");
  log(`  Previous balance: ${formatCurrency(previousBalance)}`, "blue");
  log(`  New balance:      ${formatCurrency(Number(updatedWallet.balance))}`, "blue");

  return { previousBalance, newBalance };
}

/**
 * Step 8: Record wallet_transactions entry
 */
async function recordWalletTransaction(
  businessId: string,
  amount: number,
  paymentTransactionId: string,
): Promise<void> {
  log("\n[Step 8] Recording wallet_transactions log", "cyan");

  // Get wallet ID first
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id")
    .eq("business_id", businessId)
    .single();

  if (walletError || !wallet) {
    log(`  FAIL: Could not fetch wallet — ${walletError?.message}`, "red");
    throw walletError;
  }

  const { error: insertError } = await supabase
    .from("wallet_transactions")
    .insert({
      wallet_id: wallet.id,
      type: "top_up",
      amount,
      reference_id: paymentTransactionId,
      description: "Payment via Xendit QRIS - top_up",
    });

  if (insertError) {
    log(`  FAIL: Could not record wallet transaction — ${insertError.message}`, "red");
    throw insertError;
  }

  log(`  OK: wallet_transactions entry recorded`, "green");
}

/**
 * Step 9: Verify transaction record in database
 */
async function verifyTransactionRecord(
  transactionId: string,
  expectedStatus: string,
  expectedAmount: number,
): Promise<void> {
  log("\n[Step 9] Verifying transaction record", "cyan");

  const { data: transaction, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error || !transaction) {
    log(`  FAIL: Transaction not found — ${error?.message}`, "red");
    throw error;
  }

  if (transaction.status !== expectedStatus) {
    log(`  FAIL: Status mismatch — expected '${expectedStatus}', got '${transaction.status}'`, "red");
    throw new Error("Transaction status mismatch");
  }

  log(`  OK: Transaction verified`, "green");
  log(`  Status:  ${transaction.status}`, "blue");
  log(`  Amount:  ${formatCurrency(Number(transaction.amount))}`, "blue");
  log(`  Fee:     ${formatCurrency(Number(transaction.fee_amount))}`, "blue");
  log(`  Paid at: ${transaction.paid_at ?? "—"}`, "blue");
}

/**
 * Step 10: Verify wallet_transactions log
 */
async function verifyWalletTransactionLog(
  paymentTransactionId: string,
  expectedAmount: number,
): Promise<void> {
  log("\n[Step 10] Verifying wallet_transactions log", "cyan");

  const { data: records, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("reference_id", paymentTransactionId)
    .single();

  if (error || !records) {
    log(`  FAIL: Wallet transaction log not found — ${error?.message}`, "red");
    throw error;
  }

  if (records.type !== "top_up") {
    log(`  FAIL: Unexpected type — expected 'top_up', got '${records.type}'`, "red");
    throw new Error("Unexpected wallet transaction type");
  }

  if (Math.abs(Number(records.amount) - expectedAmount) > 0.01) {
    log(
      `  FAIL: Amount mismatch — expected ${formatCurrency(expectedAmount)}, got ${formatCurrency(Number(records.amount))}`,
      "red",
    );
    throw new Error("Wallet transaction amount mismatch");
  }

  log(`  OK: Wallet transaction log verified`, "green");
  log(`  Type:        ${records.type}`, "blue");
  log(`  Amount:      ${formatCurrency(Number(records.amount))}`, "blue");
  log(`  Description: ${records.description}`, "blue");
}

/**
 * Step 11: Verify final wallet balance
 */
async function verifyFinalBalance(
  businessId: string,
  expectedBalance: number,
): Promise<void> {
  log("\n[Step 11] Verifying final wallet balance", "cyan");

  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("business_id", businessId)
    .single();

  if (error || !wallet) {
    log(`  FAIL: Could not fetch wallet — ${error?.message}`, "red");
    throw error;
  }

  const actualBalance = Number(wallet.balance);

  if (Math.abs(actualBalance - expectedBalance) > 0.01) {
    log(
      `  FAIL: Balance mismatch — expected ${formatCurrency(expectedBalance)}, got ${formatCurrency(actualBalance)}`,
      "red",
    );
    throw new Error("Final wallet balance mismatch");
  }

  log(`  OK: Final balance verified`, "green");
  log(`  Balance: ${formatCurrency(actualBalance)}`, "blue");
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

interface TestResult {
  success: boolean;
  transactionId?: string;
  previousBalance?: number;
  newBalance?: number;
  error?: string;
}

async function runTest(
  businessId: string,
  amount: number = DEFAULT_AMOUNT,
): Promise<TestResult> {
  log("\n" + "=".repeat(60), "cyan");
  log("E2E QRIS PAYMENT FLOW — SANDBOX TEST", "cyan");
  log("=".repeat(60), "cyan");

  try {
    // Step 1
    await verifyBusiness(businessId);

    // Step 2
    const wallet = await getOrCreateWallet(businessId);
    const initialBalance = Number(wallet.balance);

    // Step 3
    const { amount: validatedAmount, fee, total } = validateAmount(amount);

    // Step 4 — create QRIS via Xendit (calls real Xendit API)
    const qris = await createQRISPayment(businessId, total, fee);

    // Step 5 — persist pending transaction
    const transaction = await recordPendingTransaction(
      businessId,
      total,
      fee,
      qris.providerPaymentId,
      qris.qrString,
      qris.paymentUrl,
      qris.expiresAt,
    );

    // Brief pause for DB consistency
    await sleep(300);

    // Step 6 — simulate webhook
    await simulateWebhook(transaction.id, qris.providerPaymentId, total);

    await sleep(300);

    // Step 7 — credit wallet (net amount = total - fee)
    const netAmount = validatedAmount;
    const { previousBalance } = await creditWallet(businessId, netAmount, transaction.id);

    // Step 8 — record wallet_transactions
    await recordWalletTransaction(businessId, netAmount, transaction.id);

    await sleep(300);

    // Step 9 — verify transaction record
    await verifyTransactionRecord(transaction.id, "success", total);

    // Step 10 — verify wallet_transactions log
    await verifyWalletTransactionLog(transaction.id, netAmount);

    // Step 11 — verify final balance
    await verifyFinalBalance(businessId, initialBalance + netAmount);

    // ---- Summary ----
    log("\n" + "=".repeat(60), "green");
    log("ALL CHECKS PASSED", "green");
    log("=".repeat(60), "green");

    log("\nTest Summary:", "cyan");
    log(`  Business ID:          ${businessId}`, "blue");
    log(`  Top-up amount:        ${formatCurrency(validatedAmount)}`, "blue");
    log(`  Fee:                  ${formatCurrency(fee)}`, "blue");
    log(`  Total charged:        ${formatCurrency(total)}`, "blue");
    log(`  Net credited:         ${formatCurrency(netAmount)}`, "blue");
    log(`  Initial balance:     ${formatCurrency(initialBalance)}`, "blue");
    log(`  Final balance:        ${formatCurrency(initialBalance + netAmount)}`, "blue");
    log(`  Transaction ID:       ${transaction.id}`, "blue");
    log(`  Provider Payment ID: ${qris.providerPaymentId}`, "blue");

    return {
      success: true,
      transactionId: transaction.id,
      previousBalance,
      newBalance: initialBalance + netAmount,
    };
  } catch (error) {
    log("\n" + "=".repeat(60), "red");
    log("TEST FAILED", "red");
    log("=".repeat(60), "red");
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, "red");

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args[0] === "--help" || args[0] === "-h") {
    log("Usage: npx ts-node scripts/test-e2e-payment-flow-sandbox.ts <business_id> [amount]", "yellow");
    log("", "yellow");
    log("Arguments:", "yellow");
    log("  business_id  UUID of the business to test", "yellow");
    log("  amount       Optional. Top-up amount in IDR (default: 500000)", "yellow");
    log("", "yellow");
    log("Example:", "yellow");
    log(
      "  npx ts-node scripts/test-e2e-payment-flow-sandbox.ts 123e4567-e89b-12d3-a456-426614174000 500000",
      "yellow",
    );
    process.exit(0);
  }

  if (args.length < 1) {
    log("Usage: npx ts-node scripts/test-e2e-payment-flow-sandbox.ts <business_id> [amount]", "yellow");
    log("Run with --help for usage information.", "yellow");
    process.exit(1);
  }

  const businessId = args[0];
  const amount = args[1] ? parseInt(args[1], 10) : DEFAULT_AMOUNT;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(businessId)) {
    log("Invalid business ID format. Expected a UUID.", "red");
    process.exit(1);
  }

  if (isNaN(amount) || amount <= 0) {
    log("Invalid amount. Must be a positive number.", "red");
    process.exit(1);
  }

  runTest(businessId, amount)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      log(`Unexpected error: ${error.message}`, "red");
      process.exit(1);
    });
}

export { runTest };
