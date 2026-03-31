#!/usr/bin/env -S node --loader ts-node/esm

/**
 * Database Verification Script
 *
 * Verifies that test records from E2E payment flow tests are properly cleaned up
 * and that wallet balances are in expected states.
 *
 * Checks:
 * 1. payment_transactions with metadata->>'test_mode' = 'true'
 * 2. wallet_transactions with metadata->>'test_mode' = 'true'
 * 3. payout_requests with metadata->>'test_mode' = 'true'
 * 4. Wallet balance sanity checks
 *
 * Usage:
 *   node --loader ts-node/esm scripts/test-e2e-db-verification.ts [--cleanup]
 *
 * The --cleanup flag will remove all test_mode=true records (for post-test cleanup).
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
  console.error("Missing Supabase configuration");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "null";
  return new Date(dateStr).toISOString();
}

// Check if a string is a valid UUID
function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Query payment_transactions with test_mode=true
// ─────────────────────────────────────────────────────────────────────────────
async function step1_CheckPaymentTransactions(): Promise<{
  records: Array<Record<string, unknown>>;
  success: boolean;
}> {
  log("\n[Step 1] Checking payment_transactions (test_mode=true)...", "cyan");

  const { data, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("metadata->>test_mode", "true");

  if (error) {
    log(`  ❌ Query failed: ${error.message}`, "red");
    return { records: [], success: false };
  }

  if (!data || data.length === 0) {
    log("  ✅ No test payment_transactions found (all cleaned up)", "green");
    return { records: [], success: true };
  }

  log(`  ⚠️  Found ${data.length} test payment_transactions:`, "yellow");
  for (const tx of data) {
    log(
      `     ID=${tx.id} | status=${tx.status} | amount=${formatCurrency(tx.amount)} | created=${formatDate(tx.created_at)}`,
      "yellow"
    );
  }

  return { records: data || [], success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Query wallet_transactions with test_mode=true
// ─────────────────────────────────────────────────────────────────────────────
async function step2_CheckWalletTransactions(): Promise<{
  records: Array<Record<string, unknown>>;
  success: boolean;
}> {
  log("\n[Step 2] Checking wallet_transactions (test_mode=true)...", "cyan");

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("metadata->>test_mode", "true");

  if (error) {
    log(`  ❌ Query failed: ${error.message}`, "red");
    return { records: [], success: false };
  }

  if (!data || data.length === 0) {
    log("  ✅ No test wallet_transactions found (all cleaned up)", "green");
    return { records: [], success: true };
  }

  log(`  ⚠️  Found ${data.length} test wallet_transactions:`, "yellow");
  for (const wt of data) {
    log(
      `     ID=${wt.id} | wallet_id=${wt.wallet_id} | type=${wt.type} | amount=${formatCurrency(wt.amount)} | created=${formatDate(wt.created_at)}`,
      "yellow"
    );
  }

  return { records: data || [], success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Query payout_requests with test_mode=true
// ─────────────────────────────────────────────────────────────────────────────
async function step3_CheckPayoutRequests(): Promise<{
  records: Array<Record<string, unknown>>;
  success: boolean;
}> {
  log("\n[Step 3] Checking payout_requests (test_mode=true)...", "cyan");

  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("metadata->>test_mode", "true");

  if (error) {
    log(`  ❌ Query failed: ${error.message}`, "red");
    return { records: [], success: false };
  }

  if (!data || data.length === 0) {
    log("  ✅ No test payout_requests found (all cleaned up)", "green");
    return { records: [], success: true };
  }

  log(`  ⚠️  Found ${data.length} test payout_requests:`, "yellow");
  for (const pr of data) {
    log(
      `     ID=${pr.id} | worker_id=${pr.worker_id} | status=${pr.status} | amount=${formatCurrency(pr.amount)} | created=${formatDate(pr.created_at)}`,
      "yellow"
    );
  }

  return { records: data || [], success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Check for any wallets with unusual balance changes (negative balances)
// ─────────────────────────────────────────────────────────────────────────────
async function step4_CheckWalletSanity(): Promise<boolean> {
  log("\n[Step 4] Checking wallet balance sanity (no negative balances)...", "cyan");

  // Check for negative balances in wallets table
  const { data, error } = await supabase
    .from("wallets")
    .select("id, business_id, worker_id, balance")
    .lt("balance", 0);

  if (error) {
    log(`  ❌ Query failed: ${error.message}`, "red");
    return false;
  }

  if (!data || data.length === 0) {
    log("  ✅ No wallets with negative balances found", "green");
    return true;
  }

  log(`  ❌ Found ${data.length} wallets with negative balances:`, "red");
  for (const wallet of data) {
    log(
      `     ID=${wallet.id} | business_id=${wallet.business_id} | worker_id=${wallet.worker_id} | balance=${formatCurrency(wallet.balance)}`,
      "red"
    );
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Cleanup test records (optional --cleanup flag)
// ─────────────────────────────────────────────────────────────────────────────
async function step5_CleanupIfRequested(
  doCleanup: boolean
): Promise<{ success: boolean }> {
  if (!doCleanup) {
    log("\n[Step 5] Skipping cleanup (no --cleanup flag)", "blue");
    return { success: true };
  }

  log("\n[Step 5] Cleaning up test records (--cleanup flag set)...", "magenta");

  try {
    // Delete wallet_transactions with test_mode=true
    const { error: wtError } = await supabase
      .from("wallet_transactions")
      .delete()
      .eq("metadata->>test_mode", "true");
    if (wtError) {
      log(`  ⚠️  wallet_transactions cleanup: ${wtError.message}`, "yellow");
    } else {
      log("  ✅ wallet_transactions test records deleted", "green");
    }

    // Delete payout_requests with test_mode=true
    const { error: prError } = await supabase
      .from("payout_requests")
      .delete()
      .eq("metadata->>test_mode", "true");
    if (prError) {
      log(`  ⚠️  payout_requests cleanup: ${prError.message}`, "yellow");
    } else {
      log("  ✅ payout_requests test records deleted", "green");
    }

    // Delete payment_transactions with test_mode=true
    const { error: ptError } = await supabase
      .from("payment_transactions")
      .delete()
      .eq("metadata->>test_mode", "true");
    if (ptError) {
      log(`  ⚌  payment_transactions cleanup: ${ptError.message}`, "yellow");
    } else {
      log("  ✅ payment_transactions test records deleted", "green");
    }

    log("\n  Cleanup complete. Run this script again to verify.", "magenta");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`  ❌ Cleanup failed: ${message}`, "red");
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main verification run
// ─────────────────────────────────────────────────────────────────────────────
async function runVerification(doCleanup = false): Promise<{
  success: boolean;
  testRecordsFound: boolean;
}> {
  log("\n==============================================", "blue");
  log("  DATABASE VERIFICATION — Payment Flow Tests", "blue");
  log("==============================================", "blue");
  log(
    `  Supabase: ${supabaseUrl}`,
    "blue"
  );
  log(
    `  Cleanup mode: ${doCleanup ? "ENABLED" : "REPORT ONLY"}`,
    doCleanup ? "magenta" : "blue"
  );
  log("----------------------------------------------", "blue");

  try {
    const [ptResult, wtResult, prResult, sanityResult, cleanupResult] =
      await Promise.all([
        step1_CheckPaymentTransactions(),
        step2_CheckWalletTransactions(),
        step3_CheckPayoutRequests(),
        step4_CheckWalletSanity(),
        step5_CleanupIfRequested(doCleanup),
      ]);

    // Summary
    const totalTestRecords =
      (ptResult.records.length) +
      (wtResult.records.length) +
      (prResult.records.length);
    const allQueriesSucceeded =
      ptResult.success && wtResult.success && prResult.success;
    const noNegativeBalances = sanityResult;
    const cleanupSucceeded = cleanupResult.success;
    const testRecordsFound = totalTestRecords > 0;

    log("\n==============================================", "blue");
    log("  VERIFICATION SUMMARY", "blue");
    log("==============================================", "blue");
    log(`  payment_transactions (test): ${ptResult.records.length} record(s)`, "reset");
    log(`  wallet_transactions (test): ${wtResult.records.length} record(s)`, "reset");
    log(`  payout_requests (test): ${prResult.records.length} record(s)`, "reset");
    log(`  Negative wallet balances: ${noNegativeBalances ? "NONE ✅" : "FOUND ❌"}`, noNegativeBalances ? "green" : "red");
    log(`  Cleanup: ${doCleanup ? (cleanupSucceeded ? "COMPLETED ✅" : "FAILED ❌") : "SKIPPED (report only)"}`, "blue");
    log("----------------------------------------------", "blue");

    if (!allQueriesSucceeded) {
      log("  ❌ VERIFICATION FAILED — one or more queries errored", "red");
      return { success: false, testRecordsFound };
    }

    if (!noNegativeBalances) {
      log("  ❌ VERIFICATION FAILED — negative wallet balances found", "red");
      return { success: false, testRecordsFound };
    }

    if (testRecordsFound) {
      log(
        "  ⚠️  VERIFICATION WARNING — test records found (not yet cleaned up)",
        "yellow"
      );
      log(
        "     Run with --cleanup to remove all test records",
        "yellow"
      );
      return { success: true, testRecordsFound };
    }

    log("  ✅ VERIFICATION PASSED — no test records found, wallet balances sane", "green");
    return { success: true, testRecordsFound: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`\n  ❌ UNEXPECTED ERROR: ${message}`, "red");
    return { success: false, testRecordsFound: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const doCleanup = args.includes("--cleanup");
  const showHelp =
    args.includes("--help") || args.includes("-h");

  if (showHelp) {
    log("Usage: node --loader ts-node/esm scripts/test-e2e-db-verification.ts [options]", "cyan");
    log("");
    log("Options:", "cyan");
    log("  --cleanup   Delete all test records (metadata->>test_mode = 'true')", "cyan");
    log("  --help, -h  Show this help message", "cyan");
    log("");
    log("Examples:", "cyan");
    log("  # Report-only verification (no changes)", "cyan");
    log("  node --loader ts-node/esm scripts/test-e2e-db-verification.ts", "cyan");
    log("");
    log("  # Verify AND clean up test records", "cyan");
    log("  node --loader ts-node/esm scripts/test-e2e-db-verification.ts --cleanup", "cyan");
    process.exit(0);
  }

  const result = await runVerification(doCleanup);

  if (doCleanup) {
    process.exit(result.success ? 0 : 1);
  } else {
    // In report-only mode, exit 0 even if records found (just a warning)
    process.exit(0);
  }
}

export { runVerification };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
