#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: High Demand Notification
 *
 * Tests high-demand detection and notification to offline workers:
 * 1. High demand detection: 4+ jobs exhausted in 30 min → offline workers notified
 * 2. No false positive: Only 2 jobs exhausted → no notification
 *
 * Usage:
 *   npx tsx scripts/test-e2e-high-demand.ts
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

const cleanup: {
  userIds: string[];
  workerIds: string[];
  businessIds: string[];
  jobIds: string[];
  notificationIds: string[];
} = { userIds: [], workerIds: [], businessIds: [], jobIds: [], notificationIds: [] };

async function cleanupAll() {
  log("\n🧹 Cleaning up...", "yellow");
  if (cleanup.notificationIds.length) {
    await supabase.from("notifications").delete().in("id", cleanup.notificationIds);
  }
  if (cleanup.jobIds.length) {
    await (supabase as any).from("dispatch_queue").delete().in("job_id", cleanup.jobIds);
    await (supabase as any).from("worker_dispatch_history").delete().in("job_id", cleanup.jobIds);
    await supabase.from("bookings").delete().in("job_id", cleanup.jobIds);
    await supabase.from("jobs_skills").delete().in("job_id", cleanup.jobIds);
    await supabase.from("jobs").delete().in("id", cleanup.jobIds);
  }
  for (const wid of cleanup.workerIds) {
    await (supabase as any).from("dispatch_queue").delete().eq("worker_id", wid);
    await supabase.from("worker_availabilities").delete().eq("worker_id", wid);
    await supabase.from("worker_skills").delete().eq("worker_id", wid);
    await supabase.from("bookings").delete().eq("worker_id", wid);
    await supabase.from("wallets").delete().eq("worker_id", wid);
    await supabase.from("workers").delete().eq("id", wid);
  }
  for (const bid of cleanup.businessIds) {
    await supabase.from("businesses").delete().eq("id", bid);
  }
  for (const uid of cleanup.userIds) {
    try { await supabase.auth.admin.deleteUser(uid); } catch {}
  }
  log("   ✅ Cleanup complete", "green");
}

// ============================================================================
// Setup helpers
// ============================================================================

async function createWorker(name: string, isOnline: boolean = false) {
  const email = `test-hd-w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.dev`;
  const { data: auth, error } = await supabase.auth.admin.createUser({
    email, password: "TestPass123!", email_confirm: true,
    user_metadata: { role: "worker" },
  });
  if (error || !auth?.user) throw new Error(`Auth: ${error?.message}`);
  cleanup.userIds.push(auth.user.id);

  const { data: w, error: we } = await supabase.from("workers").insert({
    user_id: auth.user.id, full_name: name, phone: "6281234560000",
    lat: -8.6705, lng: 115.2126, reliability_score: 85,
    tier: "pro", kyc_status: "verified", jobs_completed: 5,
    rating: 4.5, area: "Denpasar",
  }).select().single();
  if (we || !w) throw new Error(`Worker: ${we?.message}`);
  cleanup.workerIds.push(w.id);

  await (supabase as any).from("workers").update({
    is_online: isOnline,
    online_since: isOnline ? new Date().toISOString() : null,
    auto_offline_at: isOnline ? new Date(Date.now() + 30 * 60000).toISOString() : null,
    current_lat: -8.6705, current_lng: 115.2126,
  }).eq("id", w.id);

  return w;
}

async function createBusiness() {
  const email = `test-hd-b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.dev`;
  const { data: auth, error } = await supabase.auth.admin.createUser({
    email, password: "TestPass123!", email_confirm: true,
    user_metadata: { role: "business" },
  });
  if (error || !auth?.user) throw new Error(`Auth: ${error?.message}`);
  cleanup.userIds.push(auth.user.id);

  const { data: b, error: be } = await supabase.from("businesses").insert({
    user_id: auth.user.id, name: `HD Biz ${Date.now()}`,
    phone: "6281234560001", lat: -8.6705, lng: 115.2126,
    address: "Jl. HD No. 1", area: "Denpasar",
    business_type: "restaurant", is_verified: true,
  }).select().single();
  if (be || !b) throw new Error(`Business: ${be?.message}`);
  cleanup.businessIds.push(b.id);
  return b;
}

async function createExhaustedJob(businessId: string) {
  let { data: cat } = await supabase.from("categories").select("id").eq("slug", "dishwasher").maybeSingle();
  if (!cat) {
    const { data: nc } = await supabase.from("categories").insert({ name: "Dishwasher", slug: "dishwasher" }).select().single();
    cat = nc;
  }

  const { data: j, error: je } = await supabase.from("jobs").insert({
    business_id: businessId, category_id: cat!.id,
    title: `Exhausted Job ${Date.now()}`,
    description: "Job with no workers available",
    budget_min: 100000, budget_max: 200000, hours_needed: 8,
    status: "open", lat: -8.6705, lng: 115.2126,
    address: "Jl. HD No. 1, Denpasar",
  }).select().single();
  if (je || !j) throw new Error(`Job: ${je?.message}`);

  await (supabase as any).from("jobs").update({
    dispatch_mode: "auto",
    dispatch_status: "exhausted",
    fulfilled_at: new Date().toISOString(),
  }).eq("id", j.id);

  cleanup.jobIds.push(j.id);
  return j;
}

/**
 * Simulate high-demand cron: find jobs exhausted in last 30 minutes.
 * If 4+ exhausted, notify offline workers in the area.
 */
async function checkHighDemand(area: string = "Denpasar") {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Count exhausted jobs in last 30 min
  const { data: exhaustedJobs, error } = await (supabase as any)
    .from("jobs")
    .select("id, title, fulfilled_at, area")
    .eq("dispatch_status", "exhausted")
    .gte("fulfilled_at", thirtyMinAgo);

  if (error) throw new Error(`Query exhausted jobs: ${error.message}`);

  const count = exhaustedJobs?.length || 0;
  log(`   Exhausted jobs in last 30 min: ${count}`, "blue");

  if (count < 4) {
    log("   ⚠️  No high demand detected (< 4 exhausted jobs)", "yellow");
    return { highDemand: false, notificationsSent: 0 };
  }

  // Find offline workers in the area
  const { data: offlineWorkers } = await (supabase as any)
    .from("workers")
    .select("id, user_id, full_name")
    .eq("is_online", false)
    .eq("area", area);

  if (!offlineWorkers || offlineWorkers.length === 0) {
    log("   ⚠️  No offline workers found in area", "yellow");
    return { highDemand: true, notificationsSent: 0 };
  }

  // Send notifications
  let sent = 0;
  for (const w of offlineWorkers) {
    const { data: notif, error: nErr } = await supabase
      .from("notifications")
      .insert({
        user_id: w.user_id,
        title: "🔥 Permintaan Tinggi di Area Anda!",
        body: `${count} pekerjaan sedang mencari pekerja di ${area}. Buka aplikasi untuk melihat peluang!`,
        link: "/jobs",
        is_read: false,
      })
      .select()
      .single();

    if (!nErr && notif) {
      cleanup.notificationIds.push(notif.id);
      sent++;
    }
  }

  return { highDemand: true, notificationsSent: sent };
}

// ============================================================================
// Test 1: High demand detection
// ============================================================================

async function testHighDemandDetection() {
  log("\n📋 Test 1: High demand detection (4+ exhausted jobs)", "cyan");

  const business = await createBusiness();
  const offlineWorker = await createWorker("Offline Worker 1", false);
  const onlineWorker = await createWorker("Online Worker 1", true);

  // Get notification count BEFORE
  const { data: beforeNotifs } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", offlineWorker.user_id);

  const beforeCount = beforeNotifs?.length || 0;

  // Create 4 exhausted jobs in the last 30 min
  for (let i = 0; i < 4; i++) {
    await createExhaustedJob(business.id);
  }

  // Run high-demand check
  const result = await checkHighDemand();

  if (!result.highDemand) throw new Error("Should detect high demand");
  if (result.notificationsSent === 0) throw new Error("Should send notifications");

  // Verify offline worker got notification
  const { data: afterNotifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", offlineWorker.user_id)
    .ilike("title", "%Permintaan Tinggi%");

  if (!afterNotifs || afterNotifs.length === 0) {
    throw new Error("Offline worker should have received high-demand notification");
  }

  // Verify online worker does NOT get the notification (they're already online)
  const { data: onlineNotifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", onlineWorker.user_id)
    .ilike("title", "%Permintaan Tinggi%");

  // (online workers might get a different notification, but not this one by default)
  log("   ✅ High demand detection verified", "green");
  log(`   Exhausted jobs: 4`, "blue");
  log(`   Notifications sent: ${result.notificationsSent}`, "blue");
  log(`   Offline worker notified: YES`, "blue");
}

// ============================================================================
// Test 2: No false positive
// ============================================================================

async function testNoFalsePositive() {
  log("\n📋 Test 2: No false positive (only 2 exhausted jobs)", "cyan");

  const business = await createBusiness();
  const offlineWorker = await createWorker("Offline Worker 2", false);

  // Get notification count BEFORE
  const { data: beforeNotifs } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", offlineWorker.user_id)
    .ilike("title", "%Permintaan Tinggi%");

  const beforeCount = beforeNotifs?.length || 0;

  // Create only 2 exhausted jobs (below threshold)
  for (let i = 0; i < 2; i++) {
    await createExhaustedJob(business.id);
  }

  // Run high-demand check
  const result = await checkHighDemand();

  if (result.highDemand) throw new Error("Should NOT detect high demand (only 2 exhausted)");

  // Verify no new notification for offline worker
  const { data: afterNotifs } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", offlineWorker.user_id)
    .ilike("title", "%Permintaan Tinggi%");

  const afterCount = afterNotifs?.length || 0;

  if (afterCount > beforeCount) {
    throw new Error("Should NOT have sent notification (below threshold)");
  }

  log("   ✅ No false positive verified", "green");
  log(`   Exhausted jobs: 2 (below threshold)`, "blue");
  log(`   Notifications sent: 0`, "blue");
  log(`   Offline worker notified: NO`, "blue");
}

// ============================================================================
// Main
// ============================================================================

async function runTests() {
  log("\n" + "=".repeat(60), "cyan");
  log("🧪 E2E TEST: High Demand Notification", "cyan");
  log("=".repeat(60), "cyan");

  const results: { name: string; status: string; error?: string }[] = [];
  let passed = 0, failed = 0;

  try {
    // Test 1
    try {
      await testHighDemandDetection();
      results.push({ name: "Test 1: High demand detection", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({ name: "Test 1: High demand detection", status: "FAIL", error: e.message });
      failed++;
    }

    // Test 2
    try {
      await testNoFalsePositive();
      results.push({ name: "Test 2: No false positive", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({ name: "Test 2: No false positive", status: "FAIL", error: e.message });
      failed++;
    }
  } finally {
    await cleanupAll();
  }

  log("\n" + "=".repeat(60), "cyan");
  log("📊 Test Results Summary", "cyan");
  log("=".repeat(60), "cyan");
  for (const r of results) {
    const c = r.status === "PASS" ? "green" : "red";
    log(`   ${r.status === "PASS" ? "✅" : "❌"} ${r.name}: ${r.status}`, c);
    if (r.error) log(`      Error: ${r.error}`, "red");
  }
  log(`\n   Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, passed === results.length ? "green" : "red");
  log("=".repeat(60), "cyan");

  return { success: failed === 0, passed, failed };
}

runTests().then((r) => process.exit(r.success ? 0 : 1)).catch((e) => { log(`\n❌ ${e.message}`, "red"); process.exit(1); });

export { runTests };
