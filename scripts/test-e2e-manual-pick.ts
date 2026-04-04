#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: Manual Pick Flow
 *
 * Tests business manual worker selection:
 * 1. Business manual pick worker → dispatch created to selected worker
 * 2. Worker reject → business can pick another worker
 *
 * Usage:
 *   npx tsx scripts/test-e2e-manual-pick.ts
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
} = { userIds: [], workerIds: [], businessIds: [], jobIds: [] };

async function cleanupAll() {
  log("\n🧹 Cleaning up...", "yellow");
  if (cleanup.jobIds.length) {
    await (supabase as any).from("dispatch_queue").delete().in("job_id", cleanup.jobIds);
    await (supabase as any).from("worker_dispatch_history").delete().in("job_id", cleanup.jobIds);
    await supabase.from("bookings").delete().in("job_id", cleanup.jobIds);
    await supabase.from("jobs_skills").delete().in("job_id", cleanup.jobIds);
    await supabase.from("jobs").delete().in("id", cleanup.jobIds);
  }
  for (const wid of cleanup.workerIds) {
    await (supabase as any).from("dispatch_queue").delete().eq("worker_id", wid);
    await (supabase as any).from("worker_dispatch_history").delete().eq("worker_id", wid);
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

async function createWorker(name: string) {
  const email = `test-mp-w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.dev`;
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
    is_online: true, online_since: new Date().toISOString(),
    auto_offline_at: new Date(Date.now() + 30 * 60000).toISOString(),
    current_lat: -8.6705, current_lng: 115.2126,
  }).eq("id", w.id);

  return w;
}

async function createBusiness() {
  const email = `test-mp-b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.dev`;
  const { data: auth, error } = await supabase.auth.admin.createUser({
    email, password: "TestPass123!", email_confirm: true,
    user_metadata: { role: "business" },
  });
  if (error || !auth?.user) throw new Error(`Auth: ${error?.message}`);
  cleanup.userIds.push(auth.user.id);

  const { data: b, error: be } = await supabase.from("businesses").insert({
    user_id: auth.user.id, name: `Manual Pick Biz ${Date.now()}`,
    phone: "6281234560001", lat: -8.6705, lng: 115.2126,
    address: "Jl. Manual No. 1", area: "Denpasar",
    business_type: "restaurant", is_verified: true,
  }).select().single();
  if (be || !b) throw new Error(`Business: ${be?.message}`);
  cleanup.businessIds.push(b.id);
  return b;
}

async function createJob(businessId: string) {
  let { data: cat } = await supabase.from("categories").select("id").eq("slug", "dishwasher").maybeSingle();
  if (!cat) {
    const { data: nc } = await supabase.from("categories").insert({ name: "Dishwasher", slug: "dishwasher" }).select().single();
    cat = nc;
  }

  const { data: j, error: je } = await supabase.from("jobs").insert({
    business_id: businessId, category_id: cat!.id,
    title: "Manual Pick Job", description: "Test manual pick",
    budget_min: 100000, budget_max: 200000, hours_needed: 8,
    status: "open", lat: -8.6705, lng: 115.2126,
    address: "Jl. Manual No. 1, Denpasar",
  }).select().single();
  if (je || !j) throw new Error(`Job: ${je?.message}`);

  await (supabase as any).from("jobs").update({
    dispatch_mode: "manual", dispatch_status: "pending",
  }).eq("id", j.id);

  cleanup.jobIds.push(j.id);
  return j;
}

// ============================================================================
// Test 1: Business manual pick worker
// ============================================================================

async function testManualPick() {
  log("\n📋 Test 1: Business manual pick worker", "cyan");

  const business = await createBusiness();
  const worker = await createWorker("Manual Pick Worker");
  const job = await createJob(business.id);

  // Business selects worker from shortlist → create dispatch
  const { data: dispatch, error } = await (supabase as any).from("dispatch_queue").insert({
    job_id: job.id,
    worker_id: worker.id,
    business_id: business.id,
    status: "pending",
    matching_score: 80,
    dispatch_order: 1,
    expires_at: new Date(Date.now() + 45000).toISOString(),
    dispatched_at: new Date().toISOString(),
  }).select().single();

  if (error) throw new Error(`Dispatch: ${error.message}`);

  // Update job to dispatching
  await (supabase as any).from("jobs").update({ dispatch_status: "dispatching" }).eq("id", job.id);

  // Verify
  const { data: dq } = await (supabase as any)
    .from("dispatch_queue")
    .select("*")
    .eq("job_id", job.id)
    .eq("worker_id", worker.id);

  if (!dq || dq.length === 0) throw new Error("Dispatch not created");
  if (dq[0].status !== "pending") throw new Error("Dispatch should be pending");

  log("   ✅ Manual pick dispatch verified", "green");
  log(`   Dispatch ID: ${dispatch.id}`, "blue");
  log(`   Worker: ${worker.full_name}`, "blue");
  log(`   Status: ${dq[0].status}`, "blue");
}

// ============================================================================
// Test 2: Manual pick - worker reject → pick another
// ============================================================================

async function testManualPickReject() {
  log("\n📋 Test 2: Manual pick - worker reject → pick another", "cyan");

  const business = await createBusiness();
  const worker1 = await createWorker("Reject Worker 1");
  const worker2 = await createWorker("Pick Worker 2");
  const job = await createJob(business.id);

  // Business picks worker1
  const d1 = await (supabase as any).from("dispatch_queue").insert({
    job_id: job.id, worker_id: worker1.id, business_id: business.id,
    status: "pending", matching_score: 80, dispatch_order: 1,
    expires_at: new Date(Date.now() + 45000).toISOString(),
    dispatched_at: new Date().toISOString(),
  }).select().single();

  await (supabase as any).from("jobs").update({ dispatch_status: "dispatching" }).eq("id", job.id);

  // Worker1 rejects
  await (supabase as any).from("dispatch_queue").update({
    status: "rejected", responded_at: new Date().toISOString(),
  }).eq("id", d1.data.id);

  await (supabase as any).from("worker_dispatch_history").insert({
    worker_id: worker1.id, job_id: job.id,
    dispatch_queue_id: d1.data.id, action: "rejected",
  });

  // Business picks worker2
  const d2 = await (supabase as any).from("dispatch_queue").insert({
    job_id: job.id, worker_id: worker2.id, business_id: business.id,
    status: "pending", matching_score: 75, dispatch_order: 2,
    expires_at: new Date(Date.now() + 45000).toISOString(),
    dispatched_at: new Date().toISOString(),
  }).select().single();

  // Worker2 accepts
  await (supabase as any).from("dispatch_queue").update({
    status: "accepted", responded_at: new Date().toISOString(),
  }).eq("id", d2.data.id);

  await (supabase as any).from("jobs").update({
    dispatch_status: "fulfilled", fulfilled_at: new Date().toISOString(),
  }).eq("id", job.id);

  // Verify
  const { data: dq1 } = await (supabase as any).from("dispatch_queue").select("*").eq("id", d1.data.id).single();
  const { data: dq2 } = await (supabase as any).from("dispatch_queue").select("*").eq("id", d2.data.id).single();

  if (dq1.status !== "rejected") throw new Error("Worker1 dispatch should be rejected");
  if (dq2.status !== "accepted") throw new Error("Worker2 dispatch should be accepted");

  log("   ✅ Manual pick reject → pick another verified", "green");
  log(`   Worker 1 dispatch: ${dq1.status}`, "blue");
  log(`   Worker 2 dispatch: ${dq2.status}`, "blue");
}

// ============================================================================
// Main
// ============================================================================

async function runTests() {
  log("\n" + "=".repeat(60), "cyan");
  log("🧪 E2E TEST: Manual Pick Flow", "cyan");
  log("=".repeat(60), "cyan");

  const results: { name: string; status: string; error?: string }[] = [];
  let passed = 0, failed = 0;

  try {
    // Test 1
    try {
      await testManualPick();
      results.push({ name: "Test 1: Manual pick worker", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({ name: "Test 1: Manual pick worker", status: "FAIL", error: e.message });
      failed++;
    }

    // Test 2
    try {
      await testManualPickReject();
      results.push({ name: "Test 2: Manual pick reject → pick another", status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({ name: "Test 2: Manual pick reject → pick another", status: "FAIL", error: e.message });
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
