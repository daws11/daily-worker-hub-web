#!/usr/bin/env -S node --loader ts-node/esm

/**
 * RLS Policy Verification Script
 *
 * Tests and audits Row Level Security (RLS) policies in the Supabase database.
 * Supports multiple modes:
 *   --help          Print usage instructions
 *   --check-config  Verify environment variables and test accounts
 *   --audit-only    Query pg_tables and pg_policies to audit RLS status
 *
 * Usage:
 *   npx ts-node scripts/test-rls-policies.ts --help
 *   npx ts-node scripts/test-rls-policies.ts --check-config
 *   npx ts-node scripts/test-rls-policies.ts --audit-only
 *   npx ts-node scripts/test-rls-policies.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join } from "path";

// Load environment variables from .env.local
const envPath = join(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

// =============================================================================
// CONFIGURATION
// =============================================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("\u274c Missing Supabase configuration");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Service role client (bypasses RLS — used for baseline comparisons)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Anon client (subject to RLS — used for authenticated user tests)
const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

// =============================================================================
// COLORS & LOGGING
// =============================================================================

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

function pad(str: string, width: number): string {
  return str.padEnd(width, " ");
}

// =============================================================================
// TEST ACCOUNTS CONFIGURATION
// =============================================================================

/** Role label for human-readable output. */
type RoleLabel = "worker" | "employer" | "admin" | "other_worker" | "other_employer";

interface TestAccountEntry {
  /** Display label used in logs */
  label: RoleLabel;
  /** .env.local variable name holding the user ID UUID */
  envVar: string;
  /** Resolved user ID (null if env var is not set) */
  userId: string | null;
}

interface TestAccountsConfig {
  worker: TestAccountEntry;
  employer: TestAccountEntry;
  admin: TestAccountEntry;
  otherWorker: TestAccountEntry;
  otherEmployer: TestAccountEntry;
}

interface AuthenticatedTestClient {
  /** Role label */
  role: RoleLabel;
  /** Authenticated client (subject to RLS) */
  client: SupabaseClient;
  /** Access token used for this client */
  accessToken: string | null;
}

/**
 * Loads test account user IDs from environment variables.
 * Missing env vars are tolerated — those accounts are simply skipped in checks.
 */
function loadTestAccounts(): TestAccountsConfig {
  return {
    worker: {
      label: "worker",
      envVar: "TEST_WORKER_USER_ID",
      userId: process.env.TEST_WORKER_USER_ID ?? null,
    },
    employer: {
      label: "employer",
      envVar: "TEST_EMPLOYER_USER_ID",
      userId: process.env.TEST_EMPLOYER_USER_ID ?? null,
    },
    admin: {
      label: "admin",
      envVar: "TEST_ADMIN_USER_ID",
      userId: process.env.TEST_ADMIN_USER_ID ?? null,
    },
    otherWorker: {
      label: "other_worker",
      envVar: "TEST_OTHER_WORKER_USER_ID",
      userId: process.env.TEST_OTHER_WORKER_USER_ID ?? null,
    },
    otherEmployer: {
      label: "other_employer",
      envVar: "TEST_OTHER_EMPLOYER_USER_ID",
      userId: process.env.TEST_OTHER_EMPLOYER_USER_ID ?? null,
    },
  };
}

/**
 * Creates an authenticated Supabase client for a given user ID by obtaining
 * a short-lived session via the admin API (service role). The resulting client
 * is subject to RLS policies as that user.
 *
 * Returns null if the user cannot be found or the session cannot be created.
 */
async function retrieveAuthenticatedClient(
  userId: string,
  roleLabel: RoleLabel,
): Promise<AuthenticatedTestClient | null> {
  // create_admin_user_session is a Supabase RPC function that creates a session
  // for the given user ID and returns { access_token, refresh_token }.
  // Fall back to querying auth.users + manual JWT construction if the RPC
  // is not available.
  const { data: rpcData, error: rpcError } = await supabaseService.rpc(
    "create_admin_user_session",
    { target_user_id: userId },
  );

  if (!rpcError && rpcData?.access_token) {
    const client = createClient(
      supabaseUrl!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        global: { headers: { Authorization: `Bearer ${rpcData.access_token}` } },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    return { role: roleLabel, client, accessToken: rpcData.access_token };
  }

  // Fallback: query auth.users directly and use admin createSession
  const { data: userData, error: userError } = await supabaseService
    .from("auth.users")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !userData) {
    // auth.users may not be exposed via PostgREST; silently return null
    return null;
  }

  const { data: sessionData, error: sessionError } =
    await supabaseService.auth.admin.createSession(userId);

  if (sessionError || !sessionData?.session) {
    return null;
  }

  const { access_token } = sessionData.session;

  const client = createClient(supabaseUrl!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", {
    global: { headers: { Authorization: `Bearer ${access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { role: roleLabel, client, accessToken: access_token };
}

// Cached authenticated clients — populated once during --check-config
let _cachedTestClients: AuthenticatedTestClient[] | null = null;

/**
 * Initialises and caches authenticated Supabase clients for every test account
 * that has a user ID configured. Safe to call multiple times; subsequent calls
 * return the cached result.
 */
async function getAuthenticatedTestClients(): Promise<AuthenticatedTestClient[]> {
  if (_cachedTestClients !== null) return _cachedTestClients;

  const config = loadTestAccounts();
  const entries = [
    config.worker,
    config.employer,
    config.admin,
    config.otherWorker,
    config.otherEmployer,
  ];

  _cachedTestClients = [];

  for (const entry of entries) {
    if (!entry.userId) continue; // not configured — skip

    const client = await retrieveAuthenticatedClient(entry.userId, entry.label);
    if (client) {
      _cachedTestClients.push(client);
    }
  }

  return _cachedTestClients;
}

// =============================================================================
// HELPERS
// =============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RlsTableRow {
  table_name: string;
  row_security: boolean;
}

interface RlsPolicyRow {
  schema_name: string;
  table_name: string;
  policy_name: string;
  permissive: boolean;
  roles: string[];
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

// =============================================================================
// PHASE 1: RLS AUDIT via pg_tables / pg_policies
// =============================================================================

async function runHealthCheck(): Promise<boolean> {
  log("\n\ud83d\udd0d Running health check...", "cyan");
  // Query a known application table as a simple connectivity check
  const { data, error } = await supabaseService
    .from("users")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (error) {
    log(`   \u274c Health check failed: ${error.message}`, "red");
    return false;
  }
  log(`   \u2705 Connected to Supabase successfully`, "green");
  return true;
}

async function auditRlsPolicies(): Promise<{
  tables: RlsTableRow[];
  policies: RlsPolicyRow[];
  overlyPermissive: string[];
  exitCode: number;
}> {
  log("\n" + "=".repeat(72), "cyan");
  log("\ud83d\udccb RLS POLICY AUDIT \u2014 pg_tables & pg_policies", "cyan");
  log("=".repeat(72) + "\n", "cyan");

  // The audit migration (20260330000001_rls_audit_helper.sql) creates two
  // PostgREST-accessible tables that mirror the PostgreSQL system catalogs.
  // If they don't exist yet, the migration has not been applied — guide the user.

  // 1. List all public tables and their RLS status
  log("1. All public tables (RLS status):", "magenta");
  log("\u2500".repeat(72), "magenta");

  const { data: allTables, error: tablesError } = await supabaseService
    .from("rls_audit_tables")
    .select("table_name, row_security")
    .eq("schema_name", "public")
    .order("table_name") as { data: any[] | null; error: any };

  if (tablesError) {
    if (tablesError.code === "PGRST204" || tablesError.message?.includes("not find the table")) {
      log("", "reset");
      log("   \u26a0\ufe0f Migration not yet applied!", "yellow");
      log("   \u2500".repeat(72), "yellow");
      log("   The audit helper tables (rls_audit_tables, rls_audit_policies)", "yellow");
      log("   do not exist. Apply the migration first:", "yellow");
      log("", "yellow");
      log("   Option 1 \u2014 Supabase Dashboard (recommended):", "yellow");
      log("   1. Open: https://supabase.com/dashboard/project/tqnlrqutnhxqbzfcmvpc/sql", "yellow");
      log("   2. Paste the contents of: supabase/migrations/20260330000001_rls_audit_helper.sql", "yellow");
      log("   3. Click Run", "yellow");
      log("", "yellow");
      log("   Option 2 \u2014 Supabase CLI:", "yellow");
      log("   supabase db push --project-ref tqnlrqutnhxqbzfcmvpc", "yellow");
      log("   (requires: supabase link --project-ref tqnlrqutnhxqbzfcmvpc)", "yellow");
      log("", "yellow");
      log("   After applying, re-run: npx ts-node scripts/test-rls-policies.ts --audit-only", "yellow");
      log("   \u2500".repeat(72), "yellow");
    } else {
      log(`   \u274c Failed to query rls_audit_tables: ${tablesError.message}`, "red");
    }
    return { tables: [], policies: [], overlyPermissive: [], exitCode: 1 };
  }

  const tables = (allTables || []) as RlsTableRow[];
  if (tables.length === 0) {
    log("   No tables found in public schema.", "yellow");
  } else {
    const maxLen = Math.max(...tables.map((t) => t.table_name.length), 20);
    const colWidth = maxLen + 2;
    const header1 = pad("Table", colWidth);
    const header2 = "RLS Enabled?";
    const header3 = "Has Policies?";
    log(
      `   ${header1} | ${pad(header2, 14)} | ${header3}`,
      "blue",
    );
    log(
      `   ${"\u2500".repeat(colWidth)}-+-${"\u2500".repeat(12)}-+-${"\u2500".repeat(12)}`,
      "blue",
    );

    // Collect policy counts per table
    const { data: policyCounts } = await supabaseService
      .from("rls_audit_policies")
      .select("table_name")
      .eq("schema_name", "public") as { data: { table_name: string }[] | null; error: any };

    const policyCountMap: Record<string, number> = {};
    for (const row of policyCounts || []) {
      policyCountMap[row.table_name] = (policyCountMap[row.table_name] || 0) + 1;
    }

    const sensitiveTables = [
      "bookings", "jobs", "workers", "businesses", "users",
      "wallet_transactions", "reviews", "disputes", "applications",
      "worker_wallets", "wallets", "payout_requests", "payment_transactions",
    ];

    for (const table of tables) {
      const hasRls = table.row_security === true;
      const policyCount = policyCountMap[table.table_name] || 0;
      const isSensitive = sensitiveTables.includes(table.table_name);

      const nameColor = hasRls ? "green" : isSensitive ? "red" : "yellow";
      const rlsStatus = hasRls ? "\u2705 YES" : isSensitive ? "\u274c NO" : "\u26a0\ufe0f NO";
      const policyStatus = policyCount > 0 ? `${policyCount} policy(ies)` : isSensitive ? "\u274c NONE" : "\u26a0\ufe0f NONE";

      log(
        `   ${pad(table.table_name, colWidth)} | ${pad(rlsStatus, 14)} | ${policyStatus}`,
        nameColor,
      );
    }
  }

  // 2. List all RLS policies
  log("\n2. RLS Policies (all):", "magenta");
  log("\u2500".repeat(72), "magenta");

  const { data: allPolicies, error: policiesError } = await supabaseService
    .from("rls_audit_policies")
    .select("*")
    .eq("schema_name", "public")
    .order("table_name")
    .order("policy_name") as { data: any[] | null; error: any };

  if (policiesError) {
    log(`   \u274c Failed to query rls_audit_policies: ${policiesError.message}`, "red");
    return { tables, policies: [], overlyPermissive: [], exitCode: 1 };
  }

  const policies = (allPolicies || []) as RlsPolicyRow[];

  const overlyPermissive: string[] = [];

  if (policies.length === 0) {
    log("   No RLS policies found in public schema.", "yellow");
  } else {
    // Group by table
    const byTable: Record<string, RlsPolicyRow[]> = {};
    for (const p of policies) {
      const tableName = (p as any).table_name || (p as any).tablename;
      if (!byTable[tableName]) byTable[tableName] = [];
      byTable[tableName].push(p);
    }

    const sensitiveTables = [
      "bookings", "jobs", "workers", "businesses", "users",
      "wallet_transactions", "reviews", "disputes", "applications",
      "worker_wallets", "wallets", "payout_requests", "payment_transactions",
    ];

    for (const [tableName, tablePolicies] of Object.entries(byTable)) {
      const isSensitive = sensitiveTables.includes(tableName);
      log(`\n   \ud83d\udce6 ${tableName}${isSensitive ? " (sensitive)" : ""}:`, isSensitive ? "yellow" : "blue");

      for (const policy of tablePolicies) {
        const cmd = pad(policy.cmd.toUpperCase(), 8);
        const permissive = policy.permissive ? "PERMISSIVE" : "RESTRICTIVE";
        const permColor = policy.permissive ? "yellow" : "green";

        const qual = policy.qual || "(none)";
        const withCheck = policy.with_check || "(none)";

        // Detect overly permissive
        const isOverlyPermissive =
          qual === "true" ||
          qual === "(true)" ||
          withCheck === "true" ||
          withCheck === "(true)" ||
          qual?.toLowerCase() === "true";

        if (isOverlyPermissive) {
          overlyPermissive.push(`${tableName}.${policy.policy_name}`);
        }

        const flag = isOverlyPermissive ? " \ud83d\udea8 OVERLY PERMISSIVE" : "";
        const flagColor = isOverlyPermissive ? "red" : "reset";

        log(`      [${cmd}] ${pad(policy.policy_name, 35)} (${permissive})${flag}`, permColor);
        if (qual !== "(none)") {
          log(`         USING:    ${qual.length > 80 ? qual.slice(0, 77) + "..." : qual}`, flagColor);
        }
        if (withCheck !== "(none)") {
          log(`         WITHCHK:  ${withCheck.length > 80 ? withCheck.slice(0, 77) + "..." : withCheck}`, flagColor);
        }
      }
    }
  }

  // 3. Summary
  log("\n" + "\u2500".repeat(72), "cyan");
  log("3. Audit Summary:", "magenta");

  const tablesWithRls = tables.filter((t) => t.row_security).length;
  const tablesWithoutRls = tables.filter((t) => !t.row_security).length;
  const totalPolicies = policies.length;
  const overlyPermCount = overlyPermissive.length;

  const sensitiveTables = [
    "bookings", "jobs", "workers", "businesses", "users",
    "wallet_transactions", "reviews", "disputes", "applications",
    "worker_wallets", "wallets", "payout_requests", "payment_transactions",
  ];
  const sensitiveWithoutRls = tables.filter(
    (t) => sensitiveTables.includes(t.table_name) && !t.row_security,
  );

  log(`   Total public tables:          ${tables.length}`, "blue");
  log(`   Tables with RLS enabled:     ${tablesWithRls}`, tablesWithRls > 0 ? "green" : "red");
  log(`   Tables WITHOUT RLS:          ${tablesWithoutRls}`, tablesWithoutRls > 0 ? "red" : "green");
  log(`   Total RLS policies:           ${totalPolicies}`, "blue");
  log(`   \ud83d\udea8 Overly permissive policies: ${overlyPermCount}`, overlyPermCount > 0 ? "red" : "green");

  if (sensitiveWithoutRls.length > 0) {
    log(`\n   \u26a0\ufe0f SENSITIVE TABLES WITHOUT RLS:`, "red");
    for (const t of sensitiveWithoutRls) {
      const name = (t as any).table_name || (t as any).tablename;
      log(`      - ${name}`, "red");
    }
  } else {
    log(`   \u2705 All sensitive tables have RLS enabled`, "green");
  }

  if (overlyPermissive.length > 0) {
    log(`\n   \ud83d\udea8 OVERLY PERMISSIVE POLICIES (qual = 'true'):`, "red");
    for (const p of overlyPermissive) {
      log(`      - ${p}`, "red");
    }
  } else {
    log(`   \u2705 No overly permissive policies found`, "green");
  }

  // Determine exit code
  const exitCode =
    sensitiveWithoutRls.length > 0 || overlyPermCount > 0 ? 1 : 0;

  return { tables, policies, overlyPermissive, exitCode };
}

// =============================================================================
// CHECK CONFIG
// =============================================================================

async function checkConfig(): Promise<number> {
  log("\n" + "=".repeat(72), "cyan");
  log("\u2699\ufe0f CONFIGURATION CHECK", "cyan");
  log("=".repeat(72) + "\n", "cyan");

  let ok = true;

  // Required env vars
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const optional = [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  log("Required environment variables:", "blue");
  for (const key of required) {
    const val = process.env[key];
    if (val) {
      const masked = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : "***";
      log(`   \u2705 ${key}: ${masked}`, "green");
    } else {
      log(`   \u274c ${key}: NOT SET`, "red");
      ok = false;
    }
  }

  log("\nOptional environment variables:", "blue");
  for (const key of optional) {
    const val = process.env[key];
    if (val) {
      const masked = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : "***";
      log(`   \u2705 ${key}: ${masked}`, "green");
    } else {
      log(`   \u26a0\ufe0f ${key}: not set (some tests may be skipped)`, "yellow");
    }
  }

  // Test accounts: display user IDs and attempt JWT retrieval
  log("\nTest account user IDs:", "blue");

  const testAccounts = loadTestAccounts();
  const entries = [
    testAccounts.worker,
    testAccounts.employer,
    testAccounts.admin,
    testAccounts.otherWorker,
    testAccounts.otherEmployer,
  ];

  let configuredCount = 0;
  let jwtSuccessCount = 0;

  for (const entry of entries) {
    if (entry.userId) {
      configuredCount++;
      log(`   \u2705 ${entry.envVar}: ${entry.userId}`, "green");

      // Attempt to retrieve JWT for this account
      const testClient = await retrieveAuthenticatedClient(entry.userId, entry.label);
      if (testClient?.accessToken) {
        const masked = `${testClient.accessToken.slice(0, 12)}...${testClient.accessToken.slice(-6)}`;
        log(`      \ud83d\udd11 JWT obtained (${entry.label})`, "green");
        log(`         Token: ${masked}`, "blue");
        jwtSuccessCount++;
      } else {
        log(`      \u26a0\ufe0f Could not retrieve JWT for ${entry.label} \u2014 session creation failed or RPC not available`, "yellow");
        log(`         (auth.users table may not be exposed via PostgREST)`, "yellow");
      }
    } else {
      log(`   \u26a0\ufe0f ${entry.envVar}: not set (${entry.label} tests will be skipped)`, "yellow");
    }
  }

  if (!ok) {
    log("\n\u274c Configuration incomplete \u2014 missing required env vars", "red");
    return 1;
  }

  log("\n" + "\u2500".repeat(72), "cyan");
  if (configuredCount === 0) {
    log("\u26a0\ufe0f No test account user IDs configured \u2014 set TEST_WORKER_USER_ID,", "yellow");
    log("    TEST_EMPLOYER_USER_ID, TEST_ADMIN_USER_ID in .env.local", "yellow");
    log("    RLS role tests will be skipped.", "yellow");
  } else {
    log(`   \u2705 ${configuredCount} test account(s) configured, ${jwtSuccessCount} JWT(s) obtained`, "green");
  }

  log("\n\u2705 Configuration check complete", "green");
  return 0;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args[0] || "";

  if (mode === "--help") {
    printHelp();
    process.exit(0);
  }

  if (mode === "--check-config") {
    const code = await checkConfig();
    process.exit(code);
  }

  if (mode === "--audit-only") {
    log("=".repeat(72), "magenta");
    log("\ud83d\udd12 RLS Policy Audit \u2014 Phase 1 (pg_tables / pg_policies)", "magenta");
    log("=".repeat(72), "magenta");

    const healthy = await runHealthCheck();
    if (!healthy) {
      log("\u274c Cannot connect to Supabase. Check environment variables.", "red");
      process.exit(1);
    }

    const { exitCode } = await auditRlsPolicies();

    log("\n" + "=".repeat(72), "magenta");
    if (exitCode === 0) {
      log("\u2705 Audit PASSED \u2014 No critical RLS issues found", "green");
    } else {
      log("\u274c Audit FAILED \u2014 Issues found (see above)", "red");
    }
    log("=".repeat(72), "magenta");

    process.exit(exitCode);
  }

  // Default: print help
  printHelp();
  process.exit(0);
}

function printHelp(): void {
  log("RLS Policy Verification Script", "magenta");
  log("=".repeat(50), "magenta");
  log("Usage: npx ts-node scripts/test-rls-policies.ts [mode]", "blue");
  log("");
  log("Modes:", "blue");
  log("  --check-config  Verify env vars, test account IDs, and retrieve JWTs for each role", "cyan");
  log("  --audit-only    Query pg_tables & pg_policies \u2014 audit RLS status", "cyan");
  log("  --help          Show this help message", "cyan");
  log("");
  log("Environment Variables Required:", "yellow");
  log("  NEXT_PUBLIC_SUPABASE_URL       Supabase project URL", "yellow");
  log("  SUPABASE_SERVICE_ROLE_KEY      Service role key (bypasses RLS)", "yellow");
  log("");
  log("Optional \u2014 Test Account User IDs (UUIDs from auth.users):", "yellow");
  log("  TEST_WORKER_USER_ID        Primary test worker", "yellow");
  log("  TEST_EMPLOYER_USER_ID       Primary test employer (business)", "yellow");
  log("  TEST_ADMIN_USER_ID          Admin user (member of admin_users table)", "yellow");
  log("  TEST_OTHER_WORKER_USER_ID   Second worker (cross-user isolation tests)", "yellow");
  log("  TEST_OTHER_EMPLOYER_USER_ID Second employer (cross-business isolation tests)", "yellow");
  log("");
  log("JWT Retrieval:", "cyan");
  log("  --check-config attempts to obtain short-lived JWTs for each configured", "cyan");
  log("  test account via create_admin_user_session RPC or admin createSession.", "cyan");
  log("  These tokens are cached and used to create RLS-aware authenticated clients", "cyan");
  log("  for worker, employer, and admin role tests.", "cyan");
}

// CLI entry point
main().catch((err) => {
  log(`\n\u274c Unexpected error: ${err instanceof Error ? err.message : String(err)}`, "red");
  process.exit(1);
});

export {
  auditRlsPolicies,
  checkConfig,
  runHealthCheck,
  loadTestAccounts,
  retrieveAuthenticatedClient,
  getAuthenticatedTestClients,
};
export type { TestAccountsConfig, AuthenticatedTestClient, RoleLabel };
