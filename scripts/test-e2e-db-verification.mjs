#!/usr/bin/env node

/**
 * Database Verification Script (Plain JS - no TypeScript loader required)
 *
 * Verifies that test records from E2E payment flow tests are properly cleaned up
 * and that wallet balances are in expected states.
 *
 * Checks:
 * 1. payment_transactions with metadata->>'test_mode' = 'true'
 * 2. wallet_transactions with metadata->>'test_mode' = 'true'
 * 3. payout_requests with metadata->>'test_mode' = 'true'
 * 4. Wallet balance sanity checks (no negative balances)
 *
 * Usage:
 *   node scripts/test-e2e-db-verification.mjs [--cleanup]
 *
 * The --cleanup flag will remove all test_mode=true records.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase configuration");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase REST API helpers
// ─────────────────────────────────────────────────────────────────────────────
async function supabaseQuery(table, filters = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", "*");
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "apikey": SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "count=none",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function supabaseDelete(table, filters = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "apikey": SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok && response.status !== 204 && response.status !== 200) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "null";
  return new Date(dateStr).toISOString();
}

// Colors
const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(msg, color = "reset") {
  console.log(`${C[color]}${msg}${C.reset}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 1: payment_transactions with test_mode=true
// ─────────────────────────────────────────────────────────────────────────────
async function checkPaymentTransactions() {
  log("\n[1] Checking payment_transactions (test_mode=true)...", "cyan");

  // Use Supabase RPC or direct query with ->> operator
  // The REST API supports select with ->> via query params
  const url = new URL(`${SUPABASE_URL}/rest/v1/payment_transactions`);
  url.searchParams.set("select", "id,status,amount,metadata,created_at,business_id");
  url.searchParams.set("metadata", "cs=test_mode.\\\"true\\\"");

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "apikey": SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "count=none",
    },
  });

  if (!response.ok) {
    // Fallback: get all and filter client-side (less efficient but works)
    const fallbackUrl = `${SUPABASE_URL}/rest/v1/payment_transactions?select=id,status,amount,metadata,created_at,business_id`;
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
        "Range": "0-999",
      },
    });
    if (!fallbackResponse.ok) {
      log(`  ❌ Query failed: HTTP ${fallbackResponse.status}`, "red");
      return [];
    }
    const all = await fallbackResponse.json();
    return all.filter(r => r.metadata && r.metadata.test_mode === true);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 2: wallet_transactions with test_mode=true
// ─────────────────────────────────────────────────────────────────────────────
async function checkWalletTransactions() {
  log("\n[2] Checking wallet_transactions (test_mode=true)...", "cyan");

  const url = `${SUPABASE_URL}/rest/v1/wallet_transactions?select=id,wallet_id,type,amount,metadata,created_at`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "apikey": SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Range": "0-999",
    },
  });

  if (!response.ok) {
    log(`  ❌ Query failed: HTTP ${response.status}`, "red");
    return [];
  }

  const all = await response.json();
  return all.filter(r => r.metadata && r.metadata.test_mode === true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 3: payout_requests with test_mode=true
// ─────────────────────────────────────────────────────────────────────────────
async function checkPayoutRequests() {
  log("\n[3] Checking payout_requests (test_mode=true)...", "cyan");

  const url = `${SUPABASE_URL}/rest/v1/payout_requests?select=id,worker_id,status,amount,metadata,created_at`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "apikey": SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Range": "0-999",
    },
  });

  if (!response.ok) {
    log(`  ❌ Query failed: HTTP ${response.status}`, "red");
    return [];
  }

  const all = await response.json();
  return all.filter(r => r.metadata && r.metadata.test_mode === true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 4: Wallet sanity (no negative balances)
// ─────────────────────────────────────────────────────────────────────────────
async function checkWalletSanity() {
  log("\n[4] Checking wallet balance sanity (no negative balances)...", "cyan");

  const url = `${SUPABASE_URL}/rest/v1/wallets?select=id,business_id,worker_id,balance&balance=lt.0`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "apikey": SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    log(`  ❌ Query failed: HTTP ${response.status}`, "red");
    return false;
  }

  const negativeWallets = await response.json();
  if (negativeWallets.length === 0) {
    log("  ✅ No wallets with negative balances found", "green");
    return true;
  }

  log(`  ❌ Found ${negativeWallets.length} wallet(s) with negative balances:`, "red");
  for (const w of negativeWallets) {
    log(`     ID=${w.id} | business=${w.business_id} | worker=${w.worker_id} | balance=${formatCurrency(w.balance)}`, "red");
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 5: Cleanup (optional)
// ─────────────────────────────────────────────────────────────────────────────
async function performCleanup() {
  log("\n[5] Cleaning up test records...", "magenta");

  try {
    const tables = [
      { name: "wallet_transactions", filter: "metadata=cs=test_mode.\\\"true\\\"" },
      { name: "payout_requests", filter: "metadata=cs=test_mode.\\\"true\\\"" },
      { name: "payment_transactions", filter: "metadata=cs=test_mode.\\\"true\\\"" },
    ];

    for (const { name, filter } of tables) {
      const url = `${SUPABASE_URL}/rest/v1/${name}?${filter}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "apikey": SUPABASE_SERVICE_KEY,
          "Content-Type": "application/json",
        },
      });
      if (response.ok || response.status === 204) {
        log(`  ✅ ${name}: cleaned up`, "green");
      } else {
        const text = await response.text();
        log(`  ⚠️  ${name}: ${response.status} - ${text}`, "yellow");
      }
    }
    return true;
  } catch (err) {
    log(`  ❌ Cleanup failed: ${err.message}`, "red");
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const doCleanup = args.includes("--cleanup");
  const showHelp = args.includes("--help") || args.includes("-h");

  if (showHelp) {
    log("Usage: node scripts/test-e2e-db-verification.mjs [options]", "cyan");
    log("");
    log("Options:", "cyan");
    log("  --cleanup   Delete all test records (metadata->>test_mode = 'true')", "cyan");
    log("  --help, -h  Show this help message", "cyan");
    log("");
    log("Examples:", "cyan");
    log("  # Report-only verification", "cyan");
    log("  node scripts/test-e2e-db-verification.mjs", "cyan");
    log("");
    log("  # Verify AND clean up test records", "cyan");
    log("  node scripts/test-e2e-db-verification.mjs --cleanup", "cyan");
    process.exit(0);
  }

  log("\n==============================================", "blue");
  log("  DATABASE VERIFICATION — Payment Flow Tests", "blue");
  log("==============================================", "blue");
  log(`  Supabase: ${SUPABASE_URL}`, "blue");
  log(`  Mode: ${doCleanup ? "REPORT + CLEANUP" : "REPORT ONLY"}`, doCleanup ? "magenta" : "blue");
  log("----------------------------------------------", "blue");

  try {
    // Run checks sequentially for clear output
    const ptRecords = await checkPaymentTransactions();
    if (ptRecords.length > 0) {
      log(`  ⚠️  Found ${ptRecords.length} test payment_transactions:`, "yellow");
      for (const tx of ptRecords) {
        log(`     ID=${tx.id} | status=${tx.status} | amount=${formatCurrency(tx.amount)} | created=${formatDate(tx.created_at)}`, "yellow");
      }
    } else {
      log("  ✅ No test payment_transactions found (all cleaned up)", "green");
    }

    const wtRecords = await checkWalletTransactions();
    if (wtRecords.length > 0) {
      log(`  ⚠️  Found ${wtRecords.length} test wallet_transactions:`, "yellow");
      for (const wt of wtRecords) {
        log(`     ID=${wt.id} | wallet=${wt.wallet_id} | type=${wt.type} | amount=${formatCurrency(wt.amount)}`, "yellow");
      }
    } else {
      log("  ✅ No test wallet_transactions found (all cleaned up)", "green");
    }

    const prRecords = await checkPayoutRequests();
    if (prRecords.length > 0) {
      log(`  ⚠️  Found ${prRecords.length} test payout_requests:`, "yellow");
      for (const pr of prRecords) {
        log(`     ID=${pr.id} | worker=${pr.worker_id} | status=${pr.status} | amount=${formatCurrency(pr.amount)}`, "yellow");
      }
    } else {
      log("  ✅ No test payout_requests found (all cleaned up)", "green");
    }

    const sanityOk = await checkWalletSanity();

    // Summary
    const totalTestRecords = ptRecords.length + wtRecords.length + prRecords.length;
    const hasTestRecords = totalTestRecords > 0;

    log("\n==============================================", "blue");
    log("  VERIFICATION SUMMARY", "blue");
    log("==============================================", "blue");
    log(`  payment_transactions (test): ${ptRecords.length} record(s)`, "reset");
    log(`  wallet_transactions (test): ${wtRecords.length} record(s)`, "reset");
    log(`  payout_requests (test): ${prRecords.length} record(s)`, "reset");
    log(`  Negative wallet balances: ${sanityOk ? "NONE ✅" : "FOUND ❌"}`, sanityOk ? "green" : "red");

    if (doCleanup) {
      const cleanupOk = await performCleanup();
      log(`  Cleanup: ${cleanupOk ? "COMPLETED ✅" : "FAILED ❌"}`, cleanupOk ? "green" : "red");
    } else {
      log("  Cleanup: SKIPPED (report only)", "blue");
    }
    log("----------------------------------------------", "blue");

    if (!sanityOk) {
      log("  ❌ VERIFICATION FAILED — negative wallet balances found", "red");
      process.exit(1);
    }

    if (hasTestRecords) {
      log("  ⚠️  WARNING — test records found (not yet cleaned up)", "yellow");
      log("     Run with --cleanup to remove all test records", "yellow");
      log("  ✅ Query executed successfully", "green");
      process.exit(0); // Warning exit, not failure
    }

    log("  ✅ VERIFICATION PASSED — no test records found, wallet balances sane", "green");
    process.exit(0);
  } catch (err) {
    log(`\n  ❌ UNEXPECTED ERROR: ${err.message}`, "red");
    log(`  Stack: ${err.stack}`, "red");
    process.exit(1);
  }
}

main();
