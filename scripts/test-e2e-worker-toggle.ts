#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: Worker Toggle Online/Offline
 *
 * Tests the worker online/offline toggle functionality:
 * 1. Worker toggle ON - verify is_online, online_since, current_lat/lng
 * 2. Worker toggle OFF - verify fields are cleared
 * 3. Update location - verify current_lat/lng updated
 * 4. Heartbeat - verify auto_offline_at extended
 * 5. Auto-offline - verify workers with expired auto_offline_at go offline
 *
 * Usage:
 *   npx tsx scripts/test-e2e-worker-toggle.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Track test data for cleanup
const cleanup = {
  userIds: [] as string[],
  workerIds: [] as string[],
};

async function cleanupAll() {
  log("\n🧹 Cleaning up test data...", "yellow");
  for (const wid of cleanup.workerIds) {
    await supabase.from("workers").delete().eq("id", wid);
  }
  for (const uid of cleanup.userIds) {
    await supabase.auth.admin.deleteUser(uid);
  }
  log("   ✅ Cleanup complete", "green");
}

// ============================================================================
// Setup
// ============================================================================

async function createTestWorker() {
  const email = `test-toggle-worker-${Date.now()}@test.dev`;

  const { data: authUser, error: authErr } =
    await supabase.auth.admin.createUser({
      email,
      password: "TestPass123!",
      email_confirm: true,
      user_metadata: { role: "worker" },
    });

  if (authErr || !authUser?.user)
    throw new Error(`Auth create failed: ${authErr?.message}`);

  cleanup.userIds.push(authUser.user.id);

  const { data: worker, error: workerErr } = await supabase
    .from("workers")
    .insert({
      user_id: authUser.user.id,
      full_name: "Toggle Test Worker",
      phone: "6281111111111",
      lat: -8.6705,
      lng: 115.2126,
      reliability_score: 90,
      tier: "pro",
      kyc_status: "verified",
      jobs_completed: 5,
      rating: 4.5,
      area: "Denpasar",
    })
    .select()
    .single();

  if (workerErr || !worker)
    throw new Error(`Worker create failed: ${workerErr?.message}`);

  // Set dispatch fields to defaults
  await supabase
    .from("workers")
    .update({
      is_online: false,
      online_since: null,
      auto_offline_at: null,
      current_lat: null,
      current_lng: null,
    } as any)
    .eq("id", worker.id);

  cleanup.workerIds.push(worker.id);
  return worker;
}

// ============================================================================
// Test 1: Worker Toggle ON
// ============================================================================

async function testToggleOn(workerId: string) {
  log("\n📋 Test 1: Worker Toggle ON", "cyan");

  const lat = -8.6705;
  const lng = 115.2126;
  const now = new Date().toISOString();
  const autoOfflineAt = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString();

  // Simulate toggle-online action
  const { data: updated, error } = await supabase
    .from("workers")
    .update({
      is_online: true,
      online_since: now,
      auto_offline_at: autoOfflineAt,
      current_lat: lat,
      current_lng: lng,
      last_location_update: now,
    } as any)
    .eq("id", workerId)
    .select()
    .single();

  if (error) throw new Error(`Toggle ON failed: ${error.message}`);

  // Verify
  const verifyResult = await (supabase as any)
    .from("workers")
    .select("*")
    .eq("id", workerId)
    .single();

  const w = verifyResult.data;
  if (!w.is_online) throw new Error("is_online should be true");
  if (!w.online_since) throw new Error("online_since should be set");
  if (!w.auto_offline_at) throw new Error("auto_offline_at should be set");
  if (w.current_lat !== lat)
    throw new Error(`current_lat should be ${lat}, got ${w.current_lat}`);
  if (w.current_lng !== lng)
    throw new Error(`current_lng should be ${lng}, got ${w.current_lng}`);

  log("   ✅ Worker toggle ON verified", "green");
  log(`   is_online: ${w.is_online}`, "blue");
  log(`   online_since: ${w.online_since}`, "blue");
  log(`   auto_offline_at: ${w.auto_offline_at}`, "blue");
  log(`   current_lat: ${w.current_lat}`, "blue");
  log(`   current_lng: ${w.current_lng}`, "blue");
}

// ============================================================================
// Test 2: Worker Toggle OFF
// ============================================================================

async function testToggleOff(workerId: string) {
  log("\n📋 Test 2: Worker Toggle OFF", "cyan");

  // Simulate toggle-offline action
  const { error } = await supabase
    .from("workers")
    .update({
      is_online: false,
      online_since: null,
      auto_offline_at: null,
      current_lat: null,
      current_lng: null,
    } as any)
    .eq("id", workerId);

  if (error) throw new Error(`Toggle OFF failed: ${error.message}`);

  // Verify
  const { data: w } = await (supabase as any)
    .from("workers")
    .select("*")
    .eq("id", workerId)
    .single();

  if (w.is_online) throw new Error("is_online should be false");
  if (w.online_since !== null)
    throw new Error("online_since should be null");
  if (w.auto_offline_at !== null)
    throw new Error("auto_offline_at should be null");
  if (w.current_lat !== null)
    throw new Error("current_lat should be null");
  if (w.current_lng !== null)
    throw new Error("current_lng should be null");

  log("   ✅ Worker toggle OFF verified", "green");
  log(`   is_online: ${w.is_online}`, "blue");
  log(`   online_since: ${w.online_since}`, "blue");
  log(`   current_lat: ${w.current_lat}`, "blue");
  log(`   current_lng: ${w.current_lng}`, "blue");
}

// ============================================================================
// Test 3: Update Location
// ============================================================================

async function testUpdateLocation(workerId: string) {
  log("\n📋 Test 3: Update Location", "cyan");

  // First set worker online
  const now = new Date().toISOString();
  await supabase
    .from("workers")
    .update({
      is_online: true,
      online_since: now,
      auto_offline_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      current_lat: -8.6705,
      current_lng: 115.2126,
      last_location_update: now,
    } as any)
    .eq("id", workerId);

  // Simulate update-location
  const newLat = -8.7000;
  const newLng = 115.2500;
  const updateTime = new Date().toISOString();

  await supabase
    .from("workers")
    .update({
      current_lat: newLat,
      current_lng: newLng,
      last_location_update: updateTime,
    } as any)
    .eq("id", workerId);

  // Verify
  const { data: w } = await (supabase as any)
    .from("workers")
    .select("*")
    .eq("id", workerId)
    .single();

  if (w.current_lat !== newLat)
    throw new Error(`current_lat should be ${newLat}, got ${w.current_lat}`);
  if (w.current_lng !== newLng)
    throw new Error(`current_lng should be ${newLng}, got ${w.current_lng}`);
  if (!w.last_location_update)
    throw new Error("last_location_update should be set");

  log("   ✅ Update location verified", "green");
  log(`   current_lat: ${w.current_lat}`, "blue");
  log(`   current_lng: ${w.current_lng}`, "blue");
  log(`   last_location_update: ${w.last_location_update}`, "blue");
}

// ============================================================================
// Test 4: Heartbeat
// ============================================================================

async function testHeartbeat(workerId: string) {
  log("\n📋 Test 4: Heartbeat", "cyan");

  // Set worker online with a specific auto_offline_at
  const originalAutoOffline = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
  const now = new Date().toISOString();

  await supabase
    .from("workers")
    .update({
      is_online: true,
      online_since: now,
      auto_offline_at: originalAutoOffline,
    } as any)
    .eq("id", workerId);

  // Wait a moment
  await sleep(100);

  // Simulate heartbeat - extend auto_offline_at
  const newAutoOffline = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString();

  await supabase
    .from("workers")
    .update({
      auto_offline_at: newAutoOffline,
    } as any)
    .eq("id", workerId);

  // Verify
  const { data: w } = await (supabase as any)
    .from("workers")
    .select("*")
    .eq("id", workerId)
    .single();

  const originalTime = new Date(originalAutoOffline).getTime();
  const newTime = new Date(w.auto_offline_at).getTime();

  if (newTime <= originalTime) {
    throw new Error("auto_offline_at should be extended after heartbeat");
  }

  log("   ✅ Heartbeat verified", "green");
  log(`   original auto_offline_at: ${originalAutoOffline}`, "blue");
  log(`   new auto_offline_at: ${w.auto_offline_at}`, "blue");
}

// ============================================================================
// Test 5: Auto-offline
// ============================================================================

async function testAutoOffline(workerId: string) {
  log("\n📋 Test 5: Auto-offline (cron simulation)", "cyan");

  // Set worker online with auto_offline_at in the past
  const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
  const now = new Date().toISOString();

  await supabase
    .from("workers")
    .update({
      is_online: true,
      online_since: now,
      auto_offline_at: pastTime,
    } as any)
    .eq("id", workerId);

  // Simulate auto-offline cron: find workers where auto_offline_at < NOW()
  const { data: expiredWorkers } = await (supabase as any)
    .from("workers")
    .select("id")
    .eq("is_online", true)
    .lt("auto_offline_at", new Date().toISOString());

  if (!expiredWorkers || expiredWorkers.length === 0) {
    throw new Error("Should find workers with expired auto_offline_at");
  }

  // Auto-offline them
  for (const w of expiredWorkers) {
    await supabase
      .from("workers")
      .update({
        is_online: false,
        online_since: null,
        auto_offline_at: null,
      } as any)
      .eq("id", w.id);
  }

  // Verify
  const { data: verified } = await (supabase as any)
    .from("workers")
    .select("*")
    .eq("id", workerId)
    .single();

  if (verified.is_online)
    throw new Error("Worker should be offline after auto-offline");

  log("   ✅ Auto-offline verified", "green");
  log(`   is_online: ${verified.is_online}`, "blue");
}

// ============================================================================
// Main
// ============================================================================

async function runTests() {
  log("\n" + "=".repeat(60), "cyan");
  log("🧪 E2E TEST: Worker Toggle Online/Offline", "cyan");
  log("=".repeat(60), "cyan");

  let passed = 0;
  let failed = 0;
  const results: { name: string; status: string; error?: string }[] = [];

  try {
    // Setup
    log("\n📋 Setting up test worker...", "cyan");
    const worker = await createTestWorker();
    log(`   ✅ Test worker created: ${worker.id}`, "green");

    // Test 1
    try {
      await testToggleOn(worker.id);
      results.push({ name: "Test 1: Toggle ON", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({
        name: "Test 1: Toggle ON",
        status: "FAIL",
        error: e.message,
      });
      failed++;
    }

    // Test 2
    try {
      await testToggleOff(worker.id);
      results.push({ name: "Test 2: Toggle OFF", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({
        name: "Test 2: Toggle OFF",
        status: "FAIL",
        error: e.message,
      });
      failed++;
    }

    // Test 3
    try {
      await testUpdateLocation(worker.id);
      results.push({ name: "Test 3: Update Location", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({
        name: "Test 3: Update Location",
        status: "FAIL",
        error: e.message,
      });
      failed++;
    }

    // Test 4
    try {
      await testHeartbeat(worker.id);
      results.push({ name: "Test 4: Heartbeat", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({
        name: "Test 4: Heartbeat",
        status: "FAIL",
        error: e.message,
      });
      failed++;
    }

    // Test 5
    try {
      await testAutoOffline(worker.id);
      results.push({ name: "Test 5: Auto-offline", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({
        name: "Test 5: Auto-offline",
        status: "FAIL",
        error: e.message,
      });
      failed++;
    }
  } finally {
    await cleanupAll();
  }

  // Summary
  log("\n" + "=".repeat(60), "cyan");
  log("📊 Test Results Summary", "cyan");
  log("=".repeat(60), "cyan");

  for (const r of results) {
    const color = r.status === "PASS" ? "green" : "red";
    log(
      `   ${r.status === "PASS" ? "✅" : "❌"} ${r.name}: ${r.status}`,
      color,
    );
    if (r.error) log(`      Error: ${r.error}`, "red");
  }

  log(`\n   Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, passed === results.length ? "green" : "red");
  log("=".repeat(60), "cyan");

  return { success: failed === 0, passed, failed, results };
}

runTests()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    log(`\n❌ Unexpected error: ${err.message}`, "red");
    process.exit(1);
  });

export { runTests };
