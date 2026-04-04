/**
 * E2E Performance Tests - Dispatch System
 *
 * Tests concurrent dispatch creation, concurrent accept (race condition), and timeout cascade.
 *
 * Usage:
 *   npx tsx scripts/test-e2e-performance-dispatch.ts
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Dispatch system tables must exist (dispatch_queue, worker_dispatch_history)
 */

import {
  createTestSupabaseClient,
  createTestWorker,
  createTestBusiness,
  createTestJob,
  setWorkerOnline,
  createTestDispatch,
  cleanupTestData,
  log,
  colors,
  sleep,
} from "../lib/test-helpers/dispatch-test-helpers";

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, any>;
}

interface TestContext {
  supabase: ReturnType<typeof createTestSupabaseClient>;
  workers: Array<{ id: string; user_id: string }>;
  businesses: Array<{ id: string; user_id: string }>;
  jobs: string[];
  userIds: string[];
  dispatchIds: string[];
}

// ============================================================================
// Test Cases
// ============================================================================

/**
 * Test 1: Concurrent Dispatch Creation
 * - Create 10 jobs
 * - Trigger dispatch for all
 * - Verify: All dispatch_queue records created without error
 * - Verify: No duplicate dispatches
 */
async function testConcurrentDispatchCreation(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  const dispatchIds: string[] = [];

  try {
    log(`\n  Creating 10 test workers for dispatch test...`, "cyan");
    const testWorkers = await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        const worker = await createTestWorker(ctx.supabase, {
          full_name: `Dispatch Test Worker ${i + 1}`,
          is_online: true,
          reliability_score: 85 + i,
        });
        await setWorkerOnline(ctx.supabase, worker.id, -8.6705 + (i * 0.01), 115.2126 + (i * 0.01));
        return worker;
      })
    );

    testWorkers.forEach((w) => {
      ctx.workers.push({ id: w.id, user_id: w.user_id });
      ctx.userIds.push(w.user_id);
    });

    log(`  Created ${testWorkers.length} workers`, "green");

    // Create 10 jobs
    log(`  Creating 10 test jobs...`, "cyan");
    const testJobs = await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        const business = ctx.businesses[0];
        const job = await createTestJob(ctx.supabase, business.id, {
          title: `Concurrent Test Job ${i + 1}`,
          dispatch_mode: "auto",
        });
        ctx.jobs.push(job.id);
        return job;
      })
    );
    log(`  Created ${testJobs.length} jobs`, "green");

    // Create dispatch records for all workers for all jobs
    log(`  Creating dispatch records for all combinations...`, "cyan");
    const dispatchPromises = testWorkers.flatMap((worker, wi) =>
      testJobs.map(async (job, ji) => {
        const dispatch = await createTestDispatch(ctx.supabase, job.id, worker.id, ctx.businesses[0].id, {
          status: "pending",
          matching_score: 70 + wi,
          dispatch_order: wi + 1,
        });
        dispatchIds.push(dispatch.id);
        ctx.dispatchIds.push(dispatch.id);
        return dispatch;
      })
    );

    const dispatches = await Promise.all(dispatchPromises);
    log(`  Created ${dispatches.length} dispatch records`, "green");

    // Verify no duplicates
    const uniqueIds = new Set(dispatches.map((d) => d.id));
    const hasDuplicates = uniqueIds.size !== dispatches.length;

    // Verify all dispatches exist in database
    const { data: verifyDispatches } = await (ctx.supabase as any)
      .from("dispatch_queue")
      .select("id, job_id, worker_id")
      .in("id", dispatchIds);

    const duration = Date.now() - startTime;

    return {
      name: "Concurrent Dispatch Creation",
      passed: !hasDuplicates && verifyDispatches?.length === dispatches.length,
      duration,
      details: {
        totalDispatches: dispatches.length,
        uniqueIds: uniqueIds.size,
        dbRecords: verifyDispatches?.length || 0,
        hasDuplicates,
      },
    };
  } catch (error) {
    return {
      name: "Concurrent Dispatch Creation",
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 2: Concurrent Accept (Race Condition)
 * - Create 1 dispatch
 * - Simulate 2 workers trying to accept concurrently
 * - Verify: Only 1 succeeds, 1 gets error
 * - Verify: Only 1 booking created
 */
async function testConcurrentAcceptRaceCondition(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Create 2 workers and 1 business
    log(`  Creating test workers for concurrent accept test...`, "cyan");
    const [worker1, worker2] = await Promise.all([
      createTestWorker(ctx.supabase, { full_name: "Race Worker 1", is_online: true }),
      createTestWorker(ctx.supabase, { full_name: "Race Worker 2", is_online: true }),
    ]);

    await Promise.all([
      setWorkerOnline(ctx.supabase, worker1.id, -8.6705, 115.2126),
      setWorkerOnline(ctx.supabase, worker2.id, -8.6705, 115.2126),
    ]);

    ctx.workers.push({ id: worker1.id, user_id: worker1.user_id });
    ctx.workers.push({ id: worker2.id, user_id: worker2.user_id });
    ctx.userIds.push(worker1.user_id, worker2.user_id);

    const business = ctx.businesses[0];

    // Create a job
    log(`  Creating test job...`, "cyan");
    const job = await createTestJob(ctx.supabase, business.id, {
      title: "Race Condition Test Job",
      dispatch_mode: "auto",
    });
    ctx.jobs.push(job.id);

    // Create 2 dispatch records
    const [dispatch1, dispatch2] = await Promise.all([
      createTestDispatch(ctx.supabase, job.id, worker1.id, business.id, { status: "pending" }),
      createTestDispatch(ctx.supabase, job.id, worker2.id, business.id, { status: "pending" }),
    ]);

    ctx.dispatchIds.push(dispatch1.id, dispatch2.id);
    log(`  Created 2 dispatches`, "green");

    // Simulate concurrent accept - update dispatch statuses concurrently
    // In real scenario, both workers would call /api/dispatch/[id]/accept
    // Here we simulate by updating status in parallel

    const acceptResults = await Promise.allSettled([
      (async () => {
        // First "accept" - simulates worker 1 accepting
        const { data: updated1, error: err1 } = await (ctx.supabase as any)
          .from("dispatch_queue")
          .update({ status: "accepted", responded_at: new Date().toISOString() })
          .eq("id", dispatch1.id)
          .select()
          .single();
        return { success: !err1, data: updated1, worker: "worker1" };
      })(),
      (async () => {
        // Second "accept" - simulates worker 2 accepting (should fail because job is fulfilled)
        const { data: updated2, error: err2 } = await (ctx.supabase as any)
          .from("dispatch_queue")
          .update({ status: "accepted", responded_at: new Date().toISOString() })
          .eq("id", dispatch2.id)
          .select()
          .single();
        return { success: !err2, data: updated2, worker: "worker2" };
      })(),
    ]);

    // Now verify the job is marked as in_progress (only one booking should exist)
    const { data: bookings } = await (ctx.supabase as any)
      .from("bookings")
      .select("id, worker_id")
      .eq("job_id", job.id);

    // Verify dispatches status
    const { data: dispatchStatuses } = await (ctx.supabase as any)
      .from("dispatch_queue")
      .select("id, status")
      .in("id", [dispatch1.id, dispatch2.id]);

    const duration = Date.now() - startTime;

    const acceptedDispatches = dispatchStatuses?.filter((d: any) => d.status === "accepted") || [];
    const cancelledDispatches = dispatchStatuses?.filter((d: any) => d.status === "cancelled") || [];

    // The test passes if:
    // 1. Only 1 dispatch is marked accepted (race condition handled)
    // 2. Other dispatch is cancelled
    // 3. Only 1 booking exists
    const passed = acceptedDispatches.length === 1 && bookings?.length === 1;

    return {
      name: "Concurrent Accept Race Condition",
      passed,
      duration,
      details: {
        acceptedDispatches: acceptedDispatches.length,
        cancelledDispatches: cancelledDispatches.length,
        bookingsCreated: bookings?.length || 0,
        acceptResults: acceptResults.map((r) => (r.status === "fulfilled" ? "success" : "failed")),
      },
    };
  } catch (error) {
    return {
      name: "Concurrent Accept Race Condition",
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 3: Timeout Cascade
 * - Create 5 workers with dispatch records that will timeout
 * - Verify all timeouts are processed correctly
 * - Verify job is marked as exhausted when all workers timeout
 */
async function testTimeoutCascade(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Create 5 workers
    log(`  Creating 5 test workers for timeout cascade test...`, "cyan");
    const workers = await Promise.all(
      Array.from({ length: 5 }, async (_, i) => {
        const worker = await createTestWorker(ctx.supabase, {
          full_name: `Timeout Worker ${i + 1}`,
          is_online: true,
        });
        await setWorkerOnline(ctx.supabase, worker.id, -8.6705 + (i * 0.01), 115.2126 + (i * 0.01));
        ctx.workers.push({ id: worker.id, user_id: worker.user_id });
        ctx.userIds.push(worker.user_id);
        return worker;
      })
    );

    const business = ctx.businesses[0];

    // Create a job with low timeout
    log(`  Creating test job with short timeout...`, "cyan");
    const job = await createTestJob(ctx.supabase, business.id, {
      title: "Timeout Cascade Test Job",
      dispatch_mode: "auto",
      dispatch_timeout_seconds: 1, // 1 second timeout
    });
    ctx.jobs.push(job.id);

    // Create dispatches with very short expiry
    log(`  Creating dispatch records with expired timestamps...`, "cyan");
    const pastTime = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
    const dispatches = await Promise.all(
      workers.map(async (worker, i) => {
        const dispatch = await createTestDispatch(ctx.supabase, job.id, worker.id, business.id, {
          status: "pending",
          expires_at: pastTime, // Already expired
          dispatch_order: i + 1,
        });
        ctx.dispatchIds.push(dispatch.id);
        return dispatch;
      })
    );
    log(`  Created ${dispatches.length} expired dispatches`, "green");

    // Simulate timeout processing - mark all as timed_out
    log(`  Processing timeouts...`, "cyan");
    const timeoutResults = await Promise.all(
      dispatches.map(async (dispatch) => {
        const { data, error } = await (ctx.supabase as any)
          .from("dispatch_queue")
          .update({ status: "timed_out", responded_at: new Date().toISOString() })
          .eq("id", dispatch.id)
          .select()
          .single();
        return { success: !error, dispatchId: dispatch.id };
      })
    );

    // Verify all dispatches are now timed_out
    const { data: verifyDispatches } = await (ctx.supabase as any)
      .from("dispatch_queue")
      .select("id, status")
      .in("id", dispatches.map((d) => d.id));

    // Verify job is marked as exhausted (dispatch_status = "exhausted")
    const { data: verifyJob } = await (ctx.supabase as any)
      .from("jobs")
      .select("id, dispatch_status")
      .eq("id", job.id)
      .single();

    const duration = Date.now() - startTime;

    const allTimedOut = verifyDispatches?.every((d: any) => d.status === "timed_out") || false;
    const jobExhausted = verifyJob?.dispatch_status === "exhausted";

    return {
      name: "Timeout Cascade",
      passed: allTimedOut && jobExhausted,
      duration,
      details: {
        totalDispatches: dispatches.length,
        timedOutCount: verifyDispatches?.filter((d: any) => d.status === "timed_out").length || 0,
        jobDispatchStatus: verifyJob?.dispatch_status,
        allTimedOut,
        jobExhausted,
      },
    };
  } catch (error) {
    return {
      name: "Timeout Cascade",
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log("\n" + "=".repeat(60));
  log("  E2E PERFORMANCE TESTS - DISPATCH SYSTEM", "cyan");
  console.log("=".repeat(60) + "\n");

  const supabase = createTestSupabaseClient();
  const ctx: TestContext = {
    supabase,
    workers: [],
    businesses: [],
    jobs: [],
    userIds: [],
    dispatchIds: [],
  };

  const results: TestResult[] = [];

  try {
    // Create initial business for tests
    log("Creating initial test business...", "cyan");
    const business = await createTestBusiness(supabase, { name: "Performance Test Business" });
    ctx.businesses.push({ id: business.id, user_id: business.user_id });
    ctx.userIds.push(business.user_id);
    log(`Business created: ${business.id}`, "green");

    // Run Test 1: Concurrent Dispatch Creation
    log("\n" + "-".repeat(50), "cyan");
    log("Running Test 1: Concurrent Dispatch Creation", "cyan");
    log("-".repeat(50), "cyan");
    const result1 = await testConcurrentDispatchCreation(ctx);
    results.push(result1);

    if (result1.passed) {
      log(`✓ Test 1 PASSED (${result1.duration}ms)`, "green");
      if (result1.details) {
        console.log(`  Details:`, JSON.stringify(result1.details, null, 2));
      }
    } else {
      log(`✗ Test 1 FAILED: ${result1.error || "Test failed"}`, "red");
    }

    // Run Test 2: Concurrent Accept
    log("\n" + "-".repeat(50), "cyan");
    log("Running Test 2: Concurrent Accept (Race Condition)", "cyan");
    log("-".repeat(50), "cyan");
    const result2 = await testConcurrentAcceptRaceCondition(ctx);
    results.push(result2);

    if (result2.passed) {
      log(`✓ Test 2 PASSED (${result2.duration}ms)`, "green");
      if (result2.details) {
        console.log(`  Details:`, JSON.stringify(result2.details, null, 2));
      }
    } else {
      log(`✗ Test 2 FAILED: ${result2.error || "Race condition not handled"}`, "red");
    }

    // Run Test 3: Timeout Cascade
    log("\n" + "-".repeat(50), "cyan");
    log("Running Test 3: Timeout Cascade", "cyan");
    log("-".repeat(50), "cyan");
    const result3 = await testTimeoutCascade(ctx);
    results.push(result3);

    if (result3.passed) {
      log(`✓ Test 3 PASSED (${result3.duration}ms)`, "green");
      if (result3.details) {
        console.log(`  Details:`, JSON.stringify(result3.details, null, 2));
      }
    } else {
      log(`✗ Test 3 FAILED: ${result3.error || "Timeout cascade failed"}`, "red");
    }

    // Cleanup
    log("\n" + "-".repeat(50), "cyan");
    log("Cleaning up test data...", "cyan");
    await cleanupTestData(supabase, {
      workerIds: ctx.workers.map((w) => w.id),
      businessIds: ctx.businesses.map((b) => b.id),
      jobIds: ctx.jobs,
      userIds: ctx.userIds,
      dispatchIds: ctx.dispatchIds,
    });
    log("Cleanup complete", "green");

  } catch (error) {
    log(`\nFATAL ERROR: ${error instanceof Error ? error.message : String(error)}`, "red");
    console.error(error);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  log("  TEST RESULTS SUMMARY", "cyan");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((r) => {
    const status = r.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const duration = `${r.duration}ms`;
    console.log(`  ${status} ${r.name} (${duration})`);
    if (r.error) {
      console.log(`    Error: ${r.error}`);
    }
  });

  console.log("");
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=".repeat(60) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  log(`\nUnhandled error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});