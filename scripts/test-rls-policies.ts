#!/usr/bin/env -S node --loader ts-node/esm
/// <reference path="./dotenv-shim.d.ts" />

/**
 * RLS Policy Verification Script
 *
 * Tests and audits Row Level Security (RLS) policies in the Supabase database.
 * Supports multiple modes:
 *   --help          Print usage instructions
 *   --check-config  Verify environment variables and test accounts
 *   --audit-only    Query pg_tables and pg_policies to audit RLS status
 *   --role=worker   Run worker role RLS tests
 *   --role=employer Run employer role RLS tests
 *   --role=admin    Run admin role RLS tests
 *   --role=unauthenticated  Run unauthenticated access denial tests
 *
 * Usage:
 *   npx ts-node scripts/test-rls-policies.ts --help
 *   npx ts-node scripts/test-rls-policies.ts --check-config
 *   npx ts-node scripts/test-rls-policies.ts --audit-only
 *   npx ts-node scripts/test-rls-policies.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { join } from "path";
// dotenv is resolved at runtime via pnpm virtual store; suppress tsc-only resolution error
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require("dotenv") as typeof import("dotenv");

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseService.auth.admin as any).createSession(userId);

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
// WORKER ROLE RLS TESTS
// =============================================================================

interface TestResult {
  passed: boolean;
  count: number;
  error: string | null;
}

/** Result of a single RLS policy test case. */
interface RlsTestCase {
  description: string;
  result: TestResult;
  expected: "pass" | "fail";
  details?: string;
}

/** Overall result of a role test suite. */
interface RoleTestSuiteResult {
  role: string;
  tests: RlsTestCase[];
  passedCount: number;
  failedCount: number;
  exitCode: number;
}

/**
 * Resolves a user's auth.uid to a worker_id by querying the workers table
 * using the service role client (bypasses RLS so it always works).
 *
 * Returns null when the user is not a worker or the worker record is absent.
 */
async function resolveWorkerId(userId: string): Promise<string | null> {
  const { data, error } = await supabaseService
    .from("workers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle() as { data: { id: string } | null; error: any };

  if (error || !data) return null;
  return data.id;
}

/**
 * Resolves a user's auth.uid to a business_id by querying the businesses table
 * using the service role client (bypasses RLS so it always works).
 */
async function resolveBusinessId(userId: string): Promise<string | null> {
  const { data, error } = await supabaseService
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle() as { data: { id: string } | null; error: any };

  if (error || !data) return null;
  return data.id;
}

/**
 * Runs the worker role RLS test suite.
 *
 * Tests:
 *   1. Worker SELECT own bookings  — should return rows (auth.uid → worker_id match)
 *   2. Cross-worker blocking       — bookings belonging to other workers must not appear
 *   3. wallet_transactions access  — worker can see transactions on their own wallet
 *
 * Baseline counts are obtained via the service-role client (RLS bypassed) so
 * the test can distinguish "RLS filtered correctly" from "no data exists".
 */
async function runWorkerRoleTests(): Promise<RoleTestSuiteResult> {
  const tests: RlsTestCase[] = [];
  let passedCount = 0;
  let failedCount = 0;

  // ── Load authenticated worker client ────────────────────────────────────
  const testAccounts = loadTestAccounts();
  const workerAccount = testAccounts.worker;

  if (!workerAccount.userId) {
    log("\n\u274c TEST_WORKER_USER_ID is not set \u2014 worker role tests skipped.", "red");
    log("   Set TEST_WORKER_USER_ID in .env.local to run worker RLS tests.", "yellow");
    return {
      role: "worker",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      exitCode: 1,
    };
  }

  const workerClient = await retrieveAuthenticatedClient(
    workerAccount.userId,
    workerAccount.label,
  );

  if (!workerClient?.client) {
    log("\n\u274c Could not create authenticated worker client \u2014 session creation failed.", "red");
    log("   Worker role tests skipped.", "yellow");
    return {
      role: "worker",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      exitCode: 1,
    };
  }

  const otherWorkerAccount = testAccounts.otherWorker;

  // ── Resolve worker IDs via service role ──────────────────────────────────
  const workerId = await resolveWorkerId(workerAccount.userId);
  const otherWorkerId = otherWorkerAccount.userId
    ? await resolveWorkerId(otherWorkerAccount.userId)
    : null;

  if (!workerId) {
    log("\n\u274c No worker record found for TEST_WORKER_USER_ID.", "red");
    log("   Ensure the user has a corresponding entry in the workers table.", "yellow");
    return {
      role: "worker",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      exitCode: 1,
    };
  }

  // ── TEST 1: Worker SELECT own bookings ───────────────────────────────────
  {
    const label = "Worker SELECT own bookings";

    // Service-role baseline
    const { data: serviceData, error: serviceError } = await supabaseService
      .from("bookings")
      .select("id, worker_id")
      .eq("worker_id", workerId) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    // Authenticated (RLS-bound) query
    const { data: rlsData, error: rlsError } = await workerClient.client
      .from("bookings")
      .select("id, worker_id")
      .eq("worker_id", workerId) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount && rlsCount > 0;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match" : "MISMATCH"}`
          : `No bookings exist for worker_id=${workerId} (service count=0)`,
    });
  }

  // ── TEST 2: Cross-worker blocking ──────────────────────────────────────
  {
    const label = "Cross-worker blocking";

    if (otherWorkerId) {
      // Service-role: how many bookings does the OTHER worker have?
      const { data: serviceData, error: serviceError } = await supabaseService
        .from("bookings")
        .select("id, worker_id")
        .eq("worker_id", otherWorkerId) as { data: any[] | null; error: any };

      const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

      // Authenticated as worker1: query the same other_worker's bookings
      const { data: rlsData, error: rlsError } = await workerClient.client
        .from("bookings")
        .select("id, worker_id")
        .eq("worker_id", otherWorkerId) as { data: any[] | null; error: any };

      const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

      // Pass if RLS count is 0 (correctly blocked) OR service count is 0 (no cross-user data)
      const passed = !rlsError && rlsCount === 0;
      if (passed) passedCount++;
      else failedCount++;

      tests.push({
        description: label,
        result: {
          passed,
          count: rlsCount,
          error: rlsError ? rlsError.message : null,
        },
        expected: "pass",
        details:
          serviceCount > 0
            ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === 0 ? "BLOCKED \u2705" : "LEAKED \u274c"}`
            : `No cross-user bookings exist (service count=0) \u2014 test inconclusive`,
      });
    } else {
      // Cannot run cross-worker test without other_worker data
      tests.push({
        description: label,
        result: { passed: false, count: -1, error: "TEST_OTHER_WORKER_USER_ID not set" },
        expected: "pass",
        details: "Skipped \u2014 TEST_OTHER_WORKER_USER_ID not configured",
      });
      failedCount++;
    }
  }

  // ── TEST 3: wallet_transactions access ──────────────────────────────────
  {
    const label = "Worker wallet_transactions access";

    // Resolve the worker's wallet_id via service role
    const { data: walletData, error: walletError } = await supabaseService
      .from("wallets")
      .select("id")
      .eq("user_id", workerAccount.userId)
      .maybeSingle() as { data: { id: string } | null; error: any };

    if (walletError || !walletData) {
      tests.push({
        description: label,
        result: {
          passed: false,
          count: -1,
          error: walletError ? walletError.message : "No wallet found for worker",
        },
        expected: "pass",
        details: "Skipped \u2014 worker has no wallet record",
      });
      failedCount++;
    } else {
      const walletId = walletData.id;

      // Service-role baseline
      const { data: serviceData, error: serviceError } = await supabaseService
        .from("wallet_transactions")
        .select("id, wallet_id")
        .eq("wallet_id", walletId) as { data: any[] | null; error: any };

      const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

      // Authenticated (RLS-bound) query via wallet join
      const { data: rlsData, error: rlsError } = await workerClient.client
        .from("wallet_transactions")
        .select("id, wallet_id")
        .eq("wallet_id", walletId) as { data: any[] | null; error: any };

      const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

      const passed = !rlsError && rlsCount === serviceCount && rlsCount > 0;
      if (passed) passedCount++;
      else failedCount++;

      tests.push({
        description: label,
        result: {
          passed,
          count: rlsCount,
          error: rlsError ? rlsError.message : null,
        },
        expected: "pass",
        details:
          serviceCount > 0
            ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match" : "MISMATCH"}`
            : `No transactions exist for wallet_id=${walletId} (service count=0)`,
      });
    }
  }

  return {
    role: "worker",
    tests,
    passedCount,
    failedCount,
    exitCode: failedCount > 0 ? 1 : 0,
  };
}

/**
 * Prints a formatted test suite result to the console.
 */
function printRoleTestSuiteResult(result: RoleTestSuiteResult): void {
  const roleLabel = result.role.toUpperCase();
  log(`\n\ud83d\udcbb ${roleLabel} ROLE RLS TESTS`, "cyan");
  log("\u2500".repeat(72), "cyan");

  for (const tc of result.tests) {
    const icon = tc.result.passed ? "\u2705" : "\u274c";
    const color = tc.result.passed ? "green" : "red";
    const countStr =
      tc.result.count < 0 ? "(error)" : `count=${tc.result.count}`;

    log(`  ${icon} [${countStr}] ${tc.description}`, color);

    if (tc.details) {
      const indent = "         ";
      log(`${indent}${tc.details}`, tc.result.passed ? "blue" : "yellow");
    }

    if (tc.result.error) {
      log(`         Error: ${tc.result.error}`, "red");
    }
  }

  log("\u2500".repeat(72), "cyan");
  log(
    `  Results: ${result.passedCount} passed, ${result.failedCount} failed`,
    result.failedCount === 0 ? "green" : "red",
  );
}

// =============================================================================
// EMPLOYER ROLE RLS TESTS
// =============================================================================

/**
 * Runs the employer role RLS test suite.
 *
 * Tests:
 *   1. Employer SELECT own jobs      — should return rows (businesses.user_id = auth.uid())
 *   2. Cross-employer blocking       — jobs belonging to other businesses must not appear
 *   3. Own bookings on own jobs       — employer can see bookings made on their own jobs
 *
 * Baseline counts are obtained via the service-role client (RLS bypassed) so
 * the test can distinguish "RLS filtered correctly" from "no data exists".
 */
async function runEmployerRoleTests(): Promise<RoleTestSuiteResult> {
  const tests: RlsTestCase[] = [];
  let passedCount = 0;
  let failedCount = 0;

  // ── Load authenticated employer client ─────────────────────────────────────
  const testAccounts = loadTestAccounts();
  const employerAccount = testAccounts.employer;

  if (!employerAccount.userId) {
    log("\n\u274c TEST_EMPLOYER_USER_ID is not set \u2014 employer role tests skipped.", "red");
    log("   Set TEST_EMPLOYER_USER_ID in .env.local to run employer RLS tests.", "yellow");
    return {
      role: "employer",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      exitCode: 1,
    };
  }

  const employerClient = await retrieveAuthenticatedClient(
    employerAccount.userId,
    employerAccount.label,
  );

  if (!employerClient?.client) {
    log("\n\u274c Could not create authenticated employer client \u2014 session creation failed.", "red");
    log("   Employer role tests skipped.", "yellow");
    return {
      role: "employer",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      exitCode: 1,
    };
  }

  const otherEmployerAccount = testAccounts.otherEmployer;

  // ── Resolve business IDs via service role ─────────────────────────────────
  const businessId = await resolveBusinessId(employerAccount.userId);
  const otherBusinessId = otherEmployerAccount.userId
    ? await resolveBusinessId(otherEmployerAccount.userId)
    : null;

  if (!businessId) {
    log("\n\u274c No business record found for TEST_EMPLOYER_USER_ID.", "red");
    log("   Ensure the user has a corresponding entry in the businesses table", "yellow");
    log("   with user_id = TEST_EMPLOYER_USER_ID.", "yellow");
    return {
      role: "employer",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      exitCode: 1,
    };
  }

  // ── TEST 1: Employer SELECT own jobs ─────────────────────────────────────
  {
    const label = "Employer SELECT own jobs";

    // Service-role baseline — how many jobs does this business have?
    const { data: serviceData, error: serviceError } = await supabaseService
      .from("jobs")
      .select("id, business_id")
      .eq("business_id", businessId) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    // Authenticated (RLS-bound) query — should return same jobs via business.user_id = auth.uid()
    const { data: rlsData, error: rlsError } = await employerClient.client
      .from("jobs")
      .select("id, business_id")
      .eq("business_id", businessId) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount && rlsCount > 0;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match" : "MISMATCH"}`
          : `No jobs exist for business_id=${businessId} (service count=0)`,
    });
  }

  // ── TEST 2: Cross-employer blocking ───────────────────────────────────────
  {
    const label = "Cross-employer blocking";

    if (otherBusinessId) {
      // Service-role: how many jobs does the OTHER business have?
      const { data: serviceData, error: serviceError } = await supabaseService
        .from("jobs")
        .select("id, business_id")
        .eq("business_id", otherBusinessId) as { data: any[] | null; error: any };

      const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

      // Authenticated as employer1: query the other business's jobs
      const { data: rlsData, error: rlsError } = await employerClient.client
        .from("jobs")
        .select("id, business_id")
        .eq("business_id", otherBusinessId) as { data: any[] | null; error: any };

      const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

      // Pass if RLS count is 0 (correctly blocked) OR service count is 0 (no cross-business data)
      const passed = !rlsError && rlsCount === 0;
      if (passed) passedCount++;
      else failedCount++;

      tests.push({
        description: label,
        result: {
          passed,
          count: rlsCount,
          error: rlsError ? rlsError.message : null,
        },
        expected: "pass",
        details:
          serviceCount > 0
            ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === 0 ? "BLOCKED \u2705" : "LEAKED \u274c"}`
            : `No cross-business jobs exist (service count=0) \u2014 test inconclusive`,
      });
    } else {
      // Cannot run cross-employer test without other employer data
      tests.push({
        description: label,
        result: { passed: false, count: -1, error: "TEST_OTHER_EMPLOYER_USER_ID not set" },
        expected: "pass",
        details: "Skipped \u2014 TEST_OTHER_EMPLOYER_USER_ID not configured",
      });
      failedCount++;
    }
  }

  // ── TEST 3: Own bookings on own jobs ────────────────────────────────────────
  {
    const label = "Employer sees own bookings on own jobs";

    if (!businessId) {
      tests.push({
        description: label,
        result: { passed: false, count: -1, error: "No business_id resolved" },
        expected: "pass",
        details: "Skipped \u2014 employer has no business record",
      });
      failedCount++;
    } else {
      // Service-role: how many bookings exist for this business's jobs?
      // bookings table has business_id (and job_id → jobs → business_id)
      const { data: serviceData, error: serviceError } = await supabaseService
        .from("bookings")
        .select("id, business_id, job_id")
        .eq("business_id", businessId) as { data: any[] | null; error: any };

      const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

      // Authenticated (RLS-bound) query — employer should see bookings on their own jobs
      const { data: rlsData, error: rlsError } = await employerClient.client
        .from("bookings")
        .select("id, business_id, job_id")
        .eq("business_id", businessId) as { data: any[] | null; error: any };

      const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

      const passed = !rlsError && rlsCount === serviceCount && rlsCount > 0;
      if (passed) passedCount++;
      else failedCount++;

      tests.push({
        description: label,
        result: {
          passed,
          count: rlsCount,
          error: rlsError ? rlsError.message : null,
        },
        expected: "pass",
        details:
          serviceCount > 0
            ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match" : "MISMATCH"}`
            : `No bookings exist for business_id=${businessId} (service count=0)`,
      });
    }
  }

  return {
    role: "employer",
    tests,
    passedCount,
    failedCount,
    exitCode: failedCount > 0 ? 1 : 0,
  };
}

// =============================================================================
// ADMIN ROLE RLS TESTS
// =============================================================================

/**
 * Runs the admin role RLS test suite.
 *
 * Tests:
 *   1. Admin SELECT all bookings    — should return all rows in bookings table
 *   2. Admin SELECT all jobs        — should return all rows in jobs table
 *   3. Admin SELECT all workers     — should return all rows in workers table
 *   4. Admin SELECT all businesses   — should return all rows in businesses table
 *   5. Admin SELECT wallet_transactions — should return all wallet_transactions rows
 *
 * Baseline counts are obtained via the service-role client (RLS bypassed).
 * Admin RLS counts must exactly match service counts (admin has full SELECT).
 */
async function runAdminRoleTests(): Promise<RoleTestSuiteResult> {
  const tests: RlsTestCase[] = [];
  let passedCount = 0;
  let failedCount = 0;

  // ── Load authenticated admin client ──────────────────────────────────────────
  const testAccounts = loadTestAccounts();
  const adminAccount = testAccounts.admin;

  if (!adminAccount.userId) {
    log("\u274c TEST_ADMIN_USER_ID is not set \u2014 admin role tests skipped.", "red");
    log("   Set TEST_ADMIN_USER_ID in .env.local to run admin RLS tests.", "yellow");
    return {
      role: "admin",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      exitCode: 1,
    };
  }

  const adminClient = await retrieveAuthenticatedClient(
    adminAccount.userId,
    adminAccount.label,
  );

  if (!adminClient?.client) {
    log("\u274c Could not create authenticated admin client \u2014 session creation failed.", "red");
    log("   Admin role tests skipped.", "yellow");
    return {
      role: "admin",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      exitCode: 1,
    };
  }

  // ── TEST 1: Admin SELECT all bookings ────────────────────────────────────────
  {
    const label = "Admin SELECT all bookings";

    // Service-role baseline — total bookings in the database
    const { data: serviceData, error: serviceError } = await supabaseService
      .from("bookings")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    // Authenticated (RLS-bound) query — admin should see all bookings
    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("bookings")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    // Admin should see everything the service role sees (counts match)
    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no bookings in database (pass = RLS returned 0, no error)`,
    });
  }

  // ── TEST 2: Admin SELECT all jobs ──────────────────────────────────────────────
  {
    const label = "Admin SELECT all jobs";

    // Service-role baseline — total jobs in the database
    const { data: serviceData, error: serviceError } = await supabaseService
      .from("jobs")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    // Authenticated (RLS-bound) query — admin should see all jobs
    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("jobs")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no jobs in database (pass = RLS returned 0, no error)`,
    });
  }

  // ── TEST 3: Admin SELECT all workers ─────────────────────────────────────────
  {
    const label = "Admin SELECT all workers";

    // Service-role baseline
    const { data: serviceData, error: serviceError } = await supabaseService
      .from("workers")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    // Authenticated (RLS-bound) query — admin should see all workers
    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("workers")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no workers in database (pass = RLS returned 0, no error)`,
    });
  }

  // ── TEST 4: Admin SELECT all businesses ───────────────────────────────────────
  {
    const label = "Admin SELECT all businesses";

    // Service-role baseline
    const { data: serviceData, error: serviceError } = await supabaseService
      .from("businesses")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    // Authenticated (RLS-bound) query — admin should see all businesses
    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("businesses")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no businesses in database (pass = RLS returned 0, no error)`,
    });
  }

  // ── TEST 5: Admin SELECT all wallet_transactions ──────────────────────────────
  {
    const label = "Admin SELECT all wallet_transactions";

    // Service-role baseline
    const { data: serviceData, error: serviceError } = await supabaseService
      .from("wallet_transactions")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    // Authenticated (RLS-bound) query — admin should see all wallet_transactions
    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("wallet_transactions")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no wallet_transactions in database (pass = RLS returned 0, no error)`,
    });
  }

  // ── TEST 6: Admin SELECT all reviews ──────────────────────────────────────────
  {
    const label = "Admin SELECT all reviews";

    const { data: serviceData, error: serviceError } = await supabaseService
      .from("reviews")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("reviews")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no reviews in database (pass = RLS returned 0, no error)`,
    });
  }

  // ── TEST 7: Admin SELECT all disputes ────────────────────────────────────────
  {
    const label = "Admin SELECT all disputes";

    const { data: serviceData, error: serviceError } = await supabaseService
      .from("disputes")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("disputes")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no disputes in database (pass = RLS returned 0, no error)`,
    });
  }

  // ── TEST 8: Admin SELECT all applications ────────────────────────────────────
  {
    const label = "Admin SELECT all applications";

    const { data: serviceData, error: serviceError } = await supabaseService
      .from("applications")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("applications")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no applications in database (pass = RLS returned 0, no error)`,
    });
  }

  // ── TEST 9: Admin SELECT all worker_wallets ──────────────────────────────────
  {
    const label = "Admin SELECT all worker_wallets";

    const { data: serviceData, error: serviceError } = await supabaseService
      .from("worker_wallets")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    const { data: rlsData, error: rlsError } = await adminClient.client
      .from("worker_wallets")
      .select("id")
      .limit(1000) as { data: any[] | null; error: any };

    const rlsCount = rlsError ? -1 : (rlsData?.length ?? 0);

    const passed = !rlsError && rlsCount === serviceCount;
    if (passed) passedCount++;
    else failedCount++;

    tests.push({
      description: label,
      result: {
        passed,
        count: rlsCount,
        error: rlsError ? rlsError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, rls=${rlsCount} \u2014 ${rlsCount === serviceCount ? "match \u2705" : "MISMATCH \u274c"}`
          : `service=${serviceCount}, rls=${rlsCount} \u2014 no worker_wallets in database (pass = RLS returned 0, no error)`,
    });
  }

  return {
    role: "admin",
    tests,
    passedCount,
    failedCount,
    exitCode: failedCount > 0 ? 1 : 0,
  };
}

// =============================================================================
// UNAUTHENTICATED ROLE RLS TESTS
// =============================================================================

/**
 * Runs the unauthenticated (anon key) RLS test suite.
 *
 * Uses the public anon client (no JWT attached) to verify that protected tables
 * deny access — queries should return empty results or trigger errors.
 *
 * Tests SELECT on: bookings, jobs, workers, businesses, users,
 *                  wallet_transactions, reviews, disputes, applications,
 *                  worker_wallets, wallets, payout_requests, payment_transactions
 *
 * A "pass" means the unauthenticated client correctly received zero rows or
 * an error (empty result is preferred; 401/403 is also acceptable).
 */
async function runUnauthenticatedRoleTests(): Promise<RoleTestSuiteResult> {
  const tests: RlsTestCase[] = [];
  let passedCount = 0;
  let failedCount = 0;

  /**
   * Helper: tests that an unauthenticated SELECT on a table returns 0 rows
   * (or an error). The test "passes" when no data leaks to unauthenticated users.
   */
  async function testUnauthenticatedSelect(
    label: string,
    table: string,
    selectColumns = "id",
  ): Promise<void> {
    // Service-role baseline — how many rows exist in the table?
    const { data: serviceData, error: serviceError } = await supabaseService
      .from(table as keyof typeof supabaseService.from)
      .select(selectColumns)
      .limit(1000) as { data: any[] | null; error: any };

    const serviceCount = serviceError ? -1 : (serviceData?.length ?? 0);

    // Unauthenticated (anon key) query — should return 0 rows
    const { data: anonData, error: anonError } = await supabaseAnon
      .from(table as keyof typeof supabaseAnon.from)
      .select(selectColumns)
      .limit(1000) as { data: any[] | null; error: any };

    const anonCount = anonError ? -1 : (anonData?.length ?? 0);

    // Pass: zero rows returned — the correct response for an unauthenticated query.
    // An error means the query was attempted but the server returned an error response,
    // which can still leak schema information (e.g. ambiguous table references in views);
    // treat errors as failures for unauthenticated tests.
    const passed = !anonError && anonCount === 0;
    if (passed) passedCount++;
    else failedCount++;

    const errorDetail = anonError ? ` [error: ${anonError.message}]` : "";
    tests.push({
      description: label,
      result: {
        passed,
        count: anonError ? -1 : anonCount,
        error: anonError ? anonError.message : null,
      },
      expected: "pass",
      details:
        serviceCount > 0
          ? `service=${serviceCount}, anon=${anonError ? "ERROR" : anonCount}${errorDetail} — ${
              anonCount === 0 ? "BLOCKED \u2705" : "LEAKED \u274c"
            }`
          : `service=${serviceCount}, anon=${anonError ? "ERROR" : anonCount} — table empty (no data to leak)${errorDetail}`,
    });
  }

  // ── Protected table coverage ────────────────────────────────────────────────
  await testUnauthenticatedSelect("Unauthenticated SELECT bookings", "bookings");
  await testUnauthenticatedSelect("Unauthenticated SELECT jobs", "jobs");
  await testUnauthenticatedSelect("Unauthenticated SELECT workers", "workers");
  await testUnauthenticatedSelect("Unauthenticated SELECT businesses", "businesses");
  await testUnauthenticatedSelect("Unauthenticated SELECT users", "users");
  await testUnauthenticatedSelect("Unauthenticated SELECT wallet_transactions", "wallet_transactions");
  await testUnauthenticatedSelect("Unauthenticated SELECT reviews", "reviews");
  await testUnauthenticatedSelect("Unauthenticated SELECT disputes", "disputes");
  await testUnauthenticatedSelect("Unauthenticated SELECT applications", "applications");
  await testUnauthenticatedSelect("Unauthenticated SELECT worker_wallets", "worker_wallets");
  await testUnauthenticatedSelect("Unauthenticated SELECT wallets", "wallets");
  await testUnauthenticatedSelect("Unauthenticated SELECT payout_requests", "payout_requests");
  await testUnauthenticatedSelect("Unauthenticated SELECT payment_transactions", "payment_transactions");

  return {
    role: "unauthenticated",
    tests,
    passedCount,
    failedCount,
    exitCode: failedCount > 0 ? 1 : 0,
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args[0] || "";
  const roleArg = args.find((a) => a.startsWith("--role="));
  const roleMode = roleArg ? roleArg.replace("--role=", "") : null;

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

  // Role-specific RLS tests
  if (roleMode === "worker") {
    const healthy = await runHealthCheck();
    if (!healthy) {
      log("\u274c Cannot connect to Supabase. Check environment variables.", "red");
      process.exit(1);
    }

    const result = await runWorkerRoleTests();
    printRoleTestSuiteResult(result);

    log("\n" + "=".repeat(72), "cyan");
    if (result.exitCode === 0) {
      log("\u2705 Worker RLS tests PASSED", "green");
    } else {
      log("\u274c Worker RLS tests FAILED", "red");
    }
    log("=".repeat(72), "cyan");

    process.exit(result.exitCode);
  }

  if (roleMode === "employer") {
    const healthy = await runHealthCheck();
    if (!healthy) {
      log("\u274c Cannot connect to Supabase. Check environment variables.", "red");
      process.exit(1);
    }

    const result = await runEmployerRoleTests();
    printRoleTestSuiteResult(result);

    log("\n" + "=".repeat(72), "cyan");
    if (result.exitCode === 0) {
      log("\u2705 Employer RLS tests PASSED", "green");
    } else {
      log("\u274c Employer RLS tests FAILED", "red");
    }
    log("=".repeat(72), "cyan");

    process.exit(result.exitCode);
  }

  if (roleMode === "admin") {
    const healthy = await runHealthCheck();
    if (!healthy) {
      log("\u274c Cannot connect to Supabase. Check environment variables.", "red");
      process.exit(1);
    }

    const result = await runAdminRoleTests();
    printRoleTestSuiteResult(result);

    log("\n" + "=".repeat(72), "cyan");
    if (result.exitCode === 0) {
      log("\u2705 Admin RLS tests PASSED", "green");
    } else {
      log("\u274c Admin RLS tests FAILED", "red");
    }
    log("=".repeat(72), "cyan");

    process.exit(result.exitCode);
  }

  if (roleMode === "unauthenticated") {
    const healthy = await runHealthCheck();
    if (!healthy) {
      log("\u274c Cannot connect to Supabase. Check environment variables.", "red");
      process.exit(1);
    }

    const result = await runUnauthenticatedRoleTests();
    printRoleTestSuiteResult(result);

    log("\n" + "=".repeat(72), "cyan");
    if (result.exitCode === 0) {
      log("\u2705 Unauthenticated RLS tests PASSED \u2014 all protected tables blocked", "green");
    } else {
      log("\u274c Unauthenticated RLS tests FAILED \u2014 data leaked to unauthenticated users", "red");
    }
    log("=".repeat(72), "cyan");

    process.exit(result.exitCode);
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
  log("  --role=worker   Run worker role RLS tests (own bookings SELECT, cross-worker", "cyan");
  log("                  blocking, wallet_transactions access)", "cyan");
  log("  --role=employer Run employer role RLS tests (own jobs SELECT, cross-employer", "cyan");
  log("                  blocking, own bookings on own jobs)", "cyan");
  log("  --role=admin    Run admin role RLS tests (full SELECT on bookings, jobs,", "cyan");
  log("                  workers, businesses, wallet_transactions, reviews,", "cyan");
  log("                  disputes, applications, worker_wallets)", "cyan");
  log("  --role=unauthenticated  Run unauthenticated RLS tests \u2014 verifies protected tables", "cyan");
  log("                  deny SELECT to unauthenticated users (no JWT)", "cyan");
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
  log("  Note: --role=unauthenticated requires no JWT (uses the anon key only).", "cyan");
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
  runWorkerRoleTests,
  runEmployerRoleTests,
  runAdminRoleTests,
  runUnauthenticatedRoleTests,
  printRoleTestSuiteResult,
};
export type {
  TestAccountsConfig,
  AuthenticatedTestClient,
  RoleLabel,
  RlsTestCase,
  RoleTestSuiteResult,
  TestResult,
};
