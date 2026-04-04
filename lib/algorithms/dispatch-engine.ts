/**
 * Dispatch Engine
 *
 * Auto-assigns jobs to online workers based on matching score.
 * Works with the dispatch_queue table to manage sequential dispatching.
 *
 * Flow:
 * 1. Business creates job with dispatch_mode = 'auto'
 * 2. initiateDispatch() finds top online workers and dispatches to the best match
 * 3. Worker has N seconds (default 45) to accept/reject
 * 4. On accept → create booking, mark job as fulfilled
 * 5. On reject/timeout → dispatch to next worker
 * 6. If no more workers → mark job as exhausted
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  calculateHaversineDistance,
  getMatchingScoreBreakdownWithDistance,
} from "./matching-score";
import { getTierBonus } from "./tier-classifier";
import { createNotification } from "@/lib/actions/notifications";
import { logger } from "@/lib/logger";

type WorkerTier = Database["public"]["Enums"]["worker_tier"];

// ─── Configuration

/** Dispatch configuration constants */
export const DISPATCH_CONFIG = {
  EXPIRY_SECONDS: 45,
  MAX_DISTANCE_KM: 25,
  MAX_CANDIDATES: 10,
  AUTO_OFFLINE_MINUTES: 5,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DispatchOptions {
  maxWorkers?: number;
  timeoutSeconds?: number;
  excludeWorkerIds?: string[];
}

export interface OnlineWorker {
  id: string;
  user_id: string;
  full_name: string;
  rating: number | null;
  tier: WorkerTier;
  current_lat: number | null;
  current_lng: number | null;
  max_distance_km: number;
  preferred_categories: string[] | null;
  reliability_score: number;
  workerSkills: string[];
  workerWage: number | null;
  matchingScore: number;
  distanceKm: number;
}

interface GenerateShortlistParams {
  jobLat: number;
  jobLng: number;
  jobSkills: string[];
  jobBudgetMax: number;
  jobCategoryId: string;
  jobId: string;
  maxResults?: number;
  excludeWorkerIds?: string[];
}

// ─── Dispatch Engine ─────────────────────────────────────────────────────────

const dispatchLogger = logger.createApiLogger("dispatch-engine");

/**
 * Generate a ranked shortlist of online workers for a job.
 * Only considers workers who are currently online with valid location.
 */
export async function generateOnlineWorkerShortlist(
  params: GenerateShortlistParams,
): Promise<OnlineWorker[]> {
  const supabase = await createClient();

  const {
    jobLat,
    jobLng,
    jobSkills,
    jobBudgetMax,
    jobCategoryId,
    jobId,
    maxResults = 20,
    excludeWorkerIds = [],
  } = params;

  // Fetch online workers with location
  const { data: workers, error } = await supabase
    .from("workers")
    .select(
      `
      id,
      user_id,
      full_name,
      rating,
      tier,
      current_lat,
      current_lng,
      max_distance_km,
      preferred_categories,
      reliability_score
    `,
    )
    .eq("is_online", true)
    .not("current_lat", "is", null)
    .not("current_lng", "is", null)
    .limit(100);

  if (error) {
    dispatchLogger.error("Failed to fetch online workers", error);
    return [];
  }

  if (!workers || workers.length === 0) {
    dispatchLogger.info("No online workers found");
    return [];
  }

  // Filter out excluded workers
  const filteredWorkers = workers.filter(
    (w) => !excludeWorkerIds.includes(w.id),
  );

  // Also exclude workers who already have a pending dispatch for this job
  const { data: pendingDispatches } = await supabase
    .from("dispatch_queue")
    .select("worker_id")
    .eq("job_id", jobId)
    .eq("status", "pending");

  const pendingWorkerIds = new Set(
    (pendingDispatches || []).map((d) => d.worker_id),
  );

  const availableWorkers = filteredWorkers.filter(
    (w) => !pendingWorkerIds.has(w.id),
  );

  // Fetch skills for each worker
  const workerIds = availableWorkers.map((w) => w.id);
  const { data: workerSkills } = await supabase
    .from("worker_skills")
    .select("worker_id, skill_id")
    .in("worker_id", workerIds);

  const skillsByWorker = new Map<string, string[]>();
  for (const ws of workerSkills || []) {
    const existing = skillsByWorker.get(ws.worker_id) || [];
    existing.push(ws.skill_id);
    skillsByWorker.set(ws.worker_id, existing);
  }

  // Score each worker
  const scoredWorkers: OnlineWorker[] = [];

  for (const worker of availableWorkers) {
    const distance = calculateHaversineDistance(
      jobLat,
      jobLng,
      worker.current_lat ?? 0,
      worker.current_lng ?? 0,
    );

    // Skip workers outside their max distance
    if (distance > (worker.max_distance_km || 20)) {
      continue;
    }

    const workerSkillList = skillsByWorker.get(worker.id) || [];

    const { matchingScore } = getMatchingScoreBreakdownWithDistance({
      workerSkills: workerSkillList,
      workerRating: worker.rating,
      workerTier: worker.tier,
      workerWage: null, // Will be enhanced when worker wage preferences are added
      workerCategories: worker.preferred_categories,
      jobSkills,
      jobBudgetMax,
      jobCategoryId,
      distanceKm: distance,
      isAvailable: true,
      isCompliant: true, // Simplified for dispatch; full compliance checked at booking
    });

    scoredWorkers.push({
      id: worker.id,
      user_id: worker.user_id,
      full_name: worker.full_name,
      rating: worker.rating,
      tier: worker.tier,
      current_lat: worker.current_lat,
      current_lng: worker.current_lng,
      max_distance_km: worker.max_distance_km,
      preferred_categories: worker.preferred_categories,
      reliability_score: worker.reliability_score,
      workerSkills: workerSkillList,
      workerWage: null,
      matchingScore,
      distanceKm: distance,
    });
  }

  // Sort by matching score (highest first), then by distance
  scoredWorkers.sort((a, b) => {
    if (b.matchingScore !== a.matchingScore) {
      return b.matchingScore - a.matchingScore;
    }
    return a.distanceKm - b.distanceKm;
  });

  return scoredWorkers.slice(0, maxResults);
}

/**
 * Initiate auto-dispatch for a job.
 * Finds the best online worker and creates a dispatch entry.
 */
export async function initiateDispatch(
  jobId: string,
  options: DispatchOptions = {},
): Promise<{ success: boolean; dispatchId?: string; error?: string }> {
  const supabase = await createClient();
  const { timeoutSeconds = 45, excludeWorkerIds = [] } = options;

  // Fetch job details
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(
      `
      id,
      business_id,
      category_id,
      title,
      lat,
      lng,
      budget_min,
      budget_max,
      dispatch_mode,
      dispatch_status,
      total_dispatched,
      dispatch_timeout_seconds
    `,
    )
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { success: false, error: "Job not found" };
  }

  if (job.dispatch_mode !== "auto") {
    return { success: false, error: "Job is not in auto dispatch mode" };
  }

  if (
    job.dispatch_status === "fulfilled" ||
    job.dispatch_status === "cancelled"
  ) {
    return {
      success: false,
      error: `Job dispatch already ${job.dispatch_status}`,
    };
  }

  // Fetch job skills
  const { data: jobSkills } = await supabase
    .from("jobs_skills")
    .select("skill_id")
    .eq("job_id", jobId);

  const jobSkillIds = (jobSkills || []).map((js) => js.skill_id);

  // Generate worker shortlist
  const shortlist = await generateOnlineWorkerShortlist({
    jobLat: job.lat ?? 0,
    jobLng: job.lng ?? 0,
    jobSkills: jobSkillIds,
    jobBudgetMax: job.budget_max,
    jobCategoryId: job.category_id,
    jobId,
    excludeWorkerIds,
  });

  if (shortlist.length === 0) {
    // No eligible workers
    await supabase
      .from("jobs")
      .update({ dispatch_status: "exhausted" })
      .eq("id", jobId);

    return { success: false, error: "No eligible online workers found" };
  }

  const bestWorker = shortlist[0];
  const timeout = job.dispatch_timeout_seconds || timeoutSeconds;
  const expiresAt = new Date(Date.now() + timeout * 1000).toISOString();
  const dispatchOrder = (job.total_dispatched || 0) + 1;

  // Create dispatch entry
  const { data: dispatch, error: dispatchError } = await supabase
    .from("dispatch_queue")
    .insert({
      job_id: jobId,
      worker_id: bestWorker.id,
      business_id: job.business_id,
      status: "pending",
      matching_score: bestWorker.matchingScore,
      expires_at: expiresAt,
      dispatch_order: dispatchOrder,
    })
    .select("id")
    .single();

  if (dispatchError || !dispatch) {
    dispatchLogger.error("Failed to create dispatch", dispatchError);
    return { success: false, error: "Failed to create dispatch entry" };
  }

  // Update job dispatch status
  await supabase
    .from("jobs")
    .update({
      dispatch_status: "dispatching",
      total_dispatched: dispatchOrder,
    })
    .eq("id", jobId);

  // Update worker stats
  const { data: dispatchWorker } = await supabase
    .from("workers")
    .select("total_dispatches")
    .eq("id", bestWorker.id)
    .single();

  await supabase
    .from("workers")
    .update({
      total_dispatches: (dispatchWorker?.total_dispatches || 0) + 1,
    })
    .eq("id", bestWorker.id);

  // Send notification to worker
  await createNotification(
    bestWorker.user_id,
    "Job Baru Untukmu! 🎯",
    `Kamu dapat job "${job.title}". Skor match: ${bestWorker.matchingScore}/130. Buka dalam ${timeout} detik!`,
    `/worker/jobs/${jobId}`,
  );

  dispatchLogger.info("Dispatch initiated", {
    dispatchId: dispatch.id,
    jobId,
    workerId: bestWorker.id,
    score: bestWorker.matchingScore,
  });

  return { success: true, dispatchId: dispatch.id };
}

/**
 * Handle dispatch acceptance by worker.
 * Creates a booking and marks dispatch as accepted.
 * 
 * RACE CONDITION PROTECTION:
 * Uses atomic update with status='pending' condition to ensure only one worker
 * can successfully accept a dispatch. If 0 rows are affected, it means
 * another worker already accepted or the dispatch was processed.
 */
export async function handleDispatchAccept(
  dispatchId: string,
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  const supabase = await createClient();

  // First check if dispatch exists and is still pending
  const { data: dispatch, error: fetchError } = await supabase
    .from("dispatch_queue")
    .select("*")
    .eq("id", dispatchId)
    .single();

  if (fetchError || !dispatch) {
    return {
      success: false,
      error: "Dispatch not found or already processed",
    };
  }

  // Check if job is already fulfilled (race condition check)
  const { data: jobData } = await supabase
    .from("jobs")
    .select("dispatch_status, id")
    .eq("id", dispatch.job_id)
    .single();

  if (jobData?.dispatch_status === "fulfilled") {
    dispatchLogger.warn("Job already fulfilled, reject accept", {
      dispatchId,
      jobId: dispatch.job_id,
    });
    return { success: false, error: "Job already fulfilled by another worker" };
  }

  // Check if already processed
  if (dispatch.status !== "pending") {
    return {
      success: false,
      error: `Dispatch already ${dispatch.status}`,
    };
  }

  // Check if expired
  if (new Date(dispatch.expires_at) < new Date()) {
    await handleDispatchTimeout(dispatchId);
    return { success: false, error: "Dispatch has expired" };
  }

  const respondedAt = new Date().toISOString();
  const responseTime =
    (new Date(respondedAt).getTime() -
      new Date(dispatch.dispatched_at).getTime()) /
    1000;

  // ATOMIC UPDATE: Only update if status is still 'pending'
  // This prevents race condition where two workers try to accept
  const { data: updateResult, error: updateError } = await supabase
    .from("dispatch_queue")
    .update({
      status: "accepted",
      responded_at: respondedAt,
      response_time_seconds: responseTime,
    })
    .eq("id", dispatchId)
    .eq("status", "pending") // Critical: only update if still pending
    .select("id")
    .single();

  // If no rows affected, another worker already accepted
  if (updateError || !updateResult) {
    dispatchLogger.warn("Dispatch already accepted by another worker", {
      dispatchId,
    });
    return { success: false, error: "Dispatch already accepted by another worker" };
  }

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      job_id: dispatch.job_id,
      worker_id: dispatch.worker_id,
      business_id: dispatch.business_id,
      status: "pending",
      matching_score: dispatch.matching_score,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    dispatchLogger.error("Failed to create booking from dispatch", bookingError, {
      dispatchId,
    });
    // Revert dispatch status
    await supabase
      .from("dispatch_queue")
      .update({ status: "pending" })
      .eq("id", dispatchId);
    return { success: false, error: "Failed to create booking" };
  }

  // Mark job as fulfilled
  await supabase
    .from("jobs")
    .update({
      dispatch_status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", dispatch.job_id);

  // Update worker stats
  const { data: acceptedWorker } = await supabase
    .from("workers")
    .select("total_accepted")
    .eq("id", dispatch.worker_id)
    .single();

  await supabase
    .from("workers")
    .update({
      total_accepted: (acceptedWorker?.total_accepted || 0) + 1,
    })
    .eq("id", dispatch.worker_id);

  // Record in dispatch history
  await supabase.from("worker_dispatch_history").insert({
    worker_id: dispatch.worker_id,
    job_id: dispatch.job_id,
    dispatch_queue_id: dispatchId,
    action: "accepted",
    response_time_seconds: responseTime,
    matching_score: dispatch.matching_score,
  });

  dispatchLogger.info("Dispatch accepted, booking created", {
    dispatchId,
    bookingId: booking.id,
  });

  return { success: true, bookingId: booking.id };
}

/**
 * Handle dispatch rejection by worker.
 * Dispatches to the next worker in the shortlist.
 */
export async function handleDispatchReject(
  dispatchId: string,
  reason?: string,
): Promise<{ success: boolean; nextDispatchId?: string; error?: string }> {
  const supabase = await createClient();

  // Fetch dispatch entry
  const { data: dispatch, error: fetchError } = await supabase
    .from("dispatch_queue")
    .select("*")
    .eq("id", dispatchId)
    .eq("status", "pending")
    .single();

  if (fetchError || !dispatch) {
    return {
      success: false,
      error: "Dispatch not found or already processed",
    };
  }

  const respondedAt = new Date().toISOString();
  const responseTime =
    (new Date(respondedAt).getTime() -
      new Date(dispatch.dispatched_at).getTime()) /
    1000;

  // Update dispatch status
  await supabase
    .from("dispatch_queue")
    .update({
      status: "rejected",
      responded_at: respondedAt,
      response_time_seconds: responseTime,
    })
    .eq("id", dispatchId);

  // Update job rejection count
  const { data: job } = await supabase
    .from("jobs")
    .select("total_rejected")
    .eq("id", dispatch.job_id)
    .single();

  await supabase
    .from("jobs")
    .update({
      total_rejected: (job?.total_rejected || 0) + 1,
    })
    .eq("id", dispatch.job_id);

  // Record in dispatch history
  await supabase.from("worker_dispatch_history").insert({
    worker_id: dispatch.worker_id,
    job_id: dispatch.job_id,
    dispatch_queue_id: dispatchId,
    action: "rejected",
    response_time_seconds: responseTime,
    matching_score: dispatch.matching_score,
  });

  // Dispatch to next worker
  const result = await initiateDispatch(dispatch.job_id, {
    excludeWorkerIds: [dispatch.worker_id],
  });

  if (!result.success) {
    // No more workers available
    await supabase
      .from("jobs")
      .update({ dispatch_status: "exhausted" })
      .eq("id", dispatch.job_id);
  }

  return {
    success: true,
    nextDispatchId: result.dispatchId,
  };
}

/**
 * Handle dispatch timeout.
 * Marks dispatch as timed out and dispatches to next worker.
 */
export async function handleDispatchTimeout(
  dispatchId: string,
): Promise<{ success: boolean; nextDispatchId?: string; error?: string }> {
  const supabase = await createClient();

  // Fetch dispatch entry
  const { data: dispatch, error: fetchError } = await supabase
    .from("dispatch_queue")
    .select("*")
    .eq("id", dispatchId)
    .single();

  if (fetchError || !dispatch) {
    return { success: false, error: "Dispatch not found" };
  }

  // Skip if already processed
  if (dispatch.status !== "pending") {
    return { success: false, error: `Dispatch already ${dispatch.status}` };
  }

  const now = new Date();
  const responseTime =
    (now.getTime() - new Date(dispatch.dispatched_at).getTime()) / 1000;

  // Update dispatch status
  await supabase
    .from("dispatch_queue")
    .update({
      status: "timed_out",
      responded_at: now.toISOString(),
      response_time_seconds: responseTime,
    })
    .eq("id", dispatchId);

  // Update worker stats
  const { data: worker } = await supabase
    .from("workers")
    .select("total_timed_out")
    .eq("id", dispatch.worker_id)
    .single();

  await supabase
    .from("workers")
    .update({
      total_timed_out: (worker?.total_timed_out || 0) + 1,
    })
    .eq("id", dispatch.worker_id);

  // Record in dispatch history
  await supabase.from("worker_dispatch_history").insert({
    worker_id: dispatch.worker_id,
    job_id: dispatch.job_id,
    dispatch_queue_id: dispatchId,
    action: "timed_out",
    response_time_seconds: responseTime,
    matching_score: dispatch.matching_score,
  });

  // Dispatch to next worker
  const result = await initiateDispatch(dispatch.job_id, {
    excludeWorkerIds: [dispatch.worker_id],
  });

  if (!result.success) {
    await supabase
      .from("jobs")
      .update({ dispatch_status: "exhausted" })
      .eq("id", dispatch.job_id);
  }

  return {
    success: true,
    nextDispatchId: result.dispatchId,
  };
}

/**
 * Cancel all pending dispatches for a job.
 */
export async function cancelJobDispatches(
  jobId: string,
): Promise<{ success: boolean; cancelledCount: number; error?: string }> {
  const supabase = await createClient();

  // Find all pending dispatches
  const { data: pendingDispatches, error: fetchError } = await supabase
    .from("dispatch_queue")
    .select("id, worker_id")
    .eq("job_id", jobId)
    .eq("status", "pending");

  if (fetchError) {
    return {
      success: false,
      cancelledCount: 0,
      error: "Failed to fetch pending dispatches",
    };
  }

  if (!pendingDispatches || pendingDispatches.length === 0) {
    return { success: true, cancelledCount: 0 };
  }

  // Update all to cancelled
  const { error: updateError } = await supabase
    .from("dispatch_queue")
    .update({ status: "cancelled" })
    .eq("job_id", jobId)
    .eq("status", "pending");

  if (updateError) {
    return {
      success: false,
      cancelledCount: 0,
      error: "Failed to cancel dispatches",
    };
  }

  // Record in dispatch history
  for (const dispatch of pendingDispatches) {
    await supabase.from("worker_dispatch_history").insert({
      worker_id: dispatch.worker_id,
      job_id: jobId,
      dispatch_queue_id: dispatch.id,
      action: "cancelled",
    });
  }

  // Update job status
  await supabase
    .from("jobs")
    .update({ dispatch_status: "cancelled" })
    .eq("id", jobId);

  return { success: true, cancelledCount: pendingDispatches.length };
}
