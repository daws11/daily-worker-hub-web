/**
 * Dispatch Engine
 *
 * Core matching and dispatch logic for the Daily Worker Hub platform.
 * Handles auto-dispatch: finds the best available workers for a job
 * and initiates dispatch in priority order.
 */

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/actions/notifications";
import { sendPushNotification } from "@/lib/actions/push-notifications";
import { logger } from "@/lib/logger";

const engineLogger = logger.createApiLogger("dispatch-engine");

/** Matching weights */
const WEIGHTS = {
  skill: 0.35,
  distance: 0.30,
  rating: 0.20,
  tier: 0.15,
};

/** Tier bonus scores */
const TIER_SCORES: Record<string, number> = {
  champion: 1.0,
  elite: 0.8,
  pro: 0.6,
  classic: 0.4,
};

/** Dispatch configuration */
export const DISPATCH_CONFIG = {
  EXPIRY_SECONDS: 45,
  MAX_DISTANCE_KM: 25,
  MAX_CANDIDATES: 10,
  AUTO_OFFLINE_MINUTES: 5,
};

export interface MatchScore {
  total: number;
  skill: number;
  distance: number;
  rating: number;
  tier: number;
  label: "Perfect" | "Great" | "Good" | "Fair" | "Poor";
}

export interface DispatchCandidate {
  workerId: string;
  workerName: string;
  userId: string;
  score: MatchScore;
  distanceKm: number;
  tier: string;
  rating: number;
}

export interface InitiateDispatchResult {
  success: boolean;
  dispatchId?: string;
  workerId?: string;
  workerName?: string;
  matchingScore?: number;
  expiresAt?: string;
  error?: string;
}

/**
 * Calculate match score between a worker and a job
 */
export function calculateMatchScore(
  worker: {
    skills?: string[];
    rating?: number | null;
    tier?: string;
    reliability_score?: number;
    distanceKm?: number;
  },
  job: {
    requiredSkills?: string[];
    lat?: number | null;
    lng?: number | null;
  },
): MatchScore {
  // Skill match (0-1)
  const jobSkills = job.requiredSkills || [];
  const workerSkills = worker.skills || [];
  let skillScore = 0;
  if (jobSkills.length === 0) {
    skillScore = 0.7; // no specific requirement
  } else {
    const matched = jobSkills.filter((s) =>
      workerSkills.some(
        (ws) => ws.toLowerCase() === s.toLowerCase(),
      ),
    ).length;
    skillScore = matched / jobSkills.length;
  }

  // Distance score (0-1, closer is better)
  const dist = worker.distanceKm ?? DISPATCH_CONFIG.MAX_DISTANCE_KM;
  const distanceScore = Math.max(0, 1 - dist / DISPATCH_CONFIG.MAX_DISTANCE_KM);

  // Rating score (0-1, scale 0-5)
  const ratingScore = (worker.rating ?? 3) / 5;

  // Tier score
  const tierScore = TIER_SCORES[worker.tier ?? "classic"] ?? 0.4;

  const total =
    skillScore * WEIGHTS.skill +
    distanceScore * WEIGHTS.distance +
    ratingScore * WEIGHTS.rating +
    tierScore * WEIGHTS.tier;

  // Label
  let label: MatchScore["label"];
  if (total >= 0.9) label = "Perfect";
  else if (total >= 0.75) label = "Great";
  else if (total >= 0.6) label = "Good";
  else if (total >= 0.4) label = "Fair";
  else label = "Poor";

  return {
    total: Math.round(total * 100) / 100,
    skill: Math.round(skillScore * 100) / 100,
    distance: Math.round(distanceScore * 100) / 100,
    rating: Math.round(ratingScore * 100) / 100,
    tier: Math.round(tierScore * 100) / 100,
    label,
  };
}

/**
 * Calculate distance between two lat/lng points (Haversine)
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find best matching online workers for a job
 */
export async function findCandidates(
  jobId: string,
  maxDistanceKm: number = DISPATCH_CONFIG.MAX_DISTANCE_KM,
  limit: number = DISPATCH_CONFIG.MAX_CANDIDATES,
): Promise<DispatchCandidate[]> {
  const supabase = await createClient();

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*, jobs_skills(skill_id, skills(name))")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    engineLogger.error("Job not found for dispatch", new Error(jobError?.message || "Job not found"));
    return [];
  }

  const requiredSkills = ((job as any).jobs_skills || []).map(
    (js: any) => js.skills?.name || js.skill_id,
  );

  // Get online workers with location
  const { data: workers, error: workersError } = await supabase
    .from("workers")
    .select("id, full_name, user_id, lat, lng, rating, tier, reliability_score")
    .eq("is_online", true)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (workersError || !workers || workers.length === 0) {
    engineLogger.info("No online workers available for dispatch");
    return [];
  }

  // Get worker skills
  const workerIds = workers.map((w) => w.id);
  const { data: workerSkills } = await supabase
    .from("worker_skills")
    .select("worker_id, skills(name)")
    .in("worker_id", workerIds);

  const skillsMap = new Map<string, string[]>();
  (workerSkills || []).forEach((ws: any) => {
    const existing = skillsMap.get(ws.worker_id) || [];
    existing.push(ws.skills?.name || "");
    skillsMap.set(ws.worker_id, existing);
  });

  // Calculate scores
  const candidates: DispatchCandidate[] = [];

  for (const worker of workers) {
    if (!worker.lat || !worker.lng || !job.lat || !job.lng) continue;

    const distanceKm = haversineDistanceKm(worker.lat, worker.lng, job.lat, job.lng);
    if (distanceKm > maxDistanceKm) continue;

    const score = calculateMatchScore(
      {
        skills: skillsMap.get(worker.id) || [],
        rating: worker.rating,
        tier: worker.tier,
        reliability_score: worker.reliability_score,
        distanceKm,
      },
      { requiredSkills, lat: job.lat, lng: job.lng },
    );

    candidates.push({
      workerId: worker.id,
      workerName: worker.full_name,
      userId: worker.user_id,
      score,
      distanceKm: Math.round(distanceKm * 10) / 10,
      tier: worker.tier,
      rating: worker.rating ?? 0,
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score.total - a.score.total);

  return candidates.slice(0, limit);
}

/**
 * Initiate auto-dispatch for a job
 * Finds best candidates and dispatches to the top one
 */
export async function initiateDispatch(
  jobId: string,
  businessId: string,
): Promise<InitiateDispatchResult> {
  const supabase = await createClient();

  try {
    const candidates = await findCandidates(jobId);

    if (candidates.length === 0) {
      return { success: false, error: "No available workers found" };
    }

    const best = candidates[0];
    const expiresAt = new Date(
      Date.now() + DISPATCH_CONFIG.EXPIRY_SECONDS * 1000,
    ).toISOString();

    // Create dispatch record
    const { data: dispatch, error: dispatchError } = await (supabase as any)
      .from("dispatch_queue")
      .insert({
        job_id: jobId,
        worker_id: best.workerId,
        business_id: businessId,
        status: "pending",
        matching_score: best.score.total,
        score_breakdown: {
          skill: best.score.skill,
          distance: best.score.distance,
          rating: best.score.rating,
          tier: best.score.tier,
        },
        distance_km: best.distanceKm,
        expires_at: expiresAt,
        dispatched_at: new Date().toISOString(),
        attempt_number: 1,
      })
      .select()
      .single();

    if (dispatchError || !dispatch) {
      engineLogger.error("Failed to create dispatch", new Error(dispatchError?.message || "Insert failed"));
      return { success: false, error: "Failed to create dispatch record" };
    }

    // Send notification to worker
    await createNotification(
      best.userId,
      "🔔 Pekerjaan Baru!",
      `Ada pekerjaan baru yang cocok untuk Anda. Skor kecocokan: ${Math.round(best.score.total * 100)}%`,
      `/worker/jobs/${jobId}`,
    );

    await sendPushNotification(
      best.userId,
      "🔔 Pekerjaan Baru!",
      `Ada pekerjaan baru yang cocok untuk Anda. Buka untuk melihat detail.`,
      `/worker/jobs/${jobId}`,
    );

    engineLogger.info("Dispatch initiated", {
      dispatchId: dispatch.id,
      workerId: best.workerId,
      score: best.score.total,
      jobId,
    });

    return {
      success: true,
      dispatchId: dispatch.id,
      workerId: best.workerId,
      workerName: best.workerName,
      matchingScore: best.score.total,
      expiresAt,
    };
  } catch (error) {
    engineLogger.error("Dispatch initiation failed", error as Error, { jobId });
    return { success: false, error: "Dispatch initiation failed" };
  }
}

/**
 * Handle dispatch timeout - dispatch to next candidate
 */
export async function handleDispatchTimeout(
  dispatchId: string,
): Promise<InitiateDispatchResult> {
  const supabase = await createClient();

  // Get the expired dispatch
  const { data: dispatch } = await (supabase as any)
    .from("dispatch_queue")
    .select("*")
    .eq("id", dispatchId)
    .single();

  if (!dispatch) {
    return { success: false, error: "Dispatch not found" };
  }

  // Mark as timed out
  await (supabase as any)
    .from("dispatch_queue")
    .update({ status: "timed_out", responded_at: new Date().toISOString() })
    .eq("id", dispatchId);

  // Try next candidate
  const candidates = await findCandidates(dispatch.job_id);
  const attemptNum = (dispatch.attempt_number || 1) + 1;

  // Filter out already-dispatched workers for this job
  const { data: existingDispatches } = await (supabase as any)
    .from("dispatch_queue")
    .select("worker_id")
    .eq("job_id", dispatch.job_id);

  const alreadyDispatched = new Set(
    (existingDispatches || []).map((d: any) => d.worker_id),
  );

  const nextCandidate = candidates.find(
    (c) => !alreadyDispatched.has(c.workerId),
  );

  if (!nextCandidate) {
    engineLogger.info("No more candidates available", { jobId: dispatch.job_id });
    return { success: false, error: "No more available workers" };
  }

  const expiresAt = new Date(
    Date.now() + DISPATCH_CONFIG.EXPIRY_SECONDS * 1000,
  ).toISOString();

  const { data: newDispatch, error } = await (supabase as any)
    .from("dispatch_queue")
    .insert({
      job_id: dispatch.job_id,
      worker_id: nextCandidate.workerId,
      business_id: dispatch.business_id,
      status: "pending",
      matching_score: nextCandidate.score.total,
      score_breakdown: {
        skill: nextCandidate.score.skill,
        distance: nextCandidate.score.distance,
        rating: nextCandidate.score.rating,
        tier: nextCandidate.score.tier,
      },
      distance_km: nextCandidate.distanceKm,
      expires_at: expiresAt,
      dispatched_at: new Date().toISOString(),
      attempt_number: attemptNum,
    })
    .select()
    .single();

  if (error || !newDispatch) {
    return { success: false, error: "Failed to create next dispatch" };
  }

  // Notify next worker
  await createNotification(
    nextCandidate.userId,
    "🔔 Pekerjaan Baru!",
    `Ada pekerjaan baru yang cocok untuk Anda.`,
    `/worker/jobs/${dispatch.job_id}`,
  );

  await sendPushNotification(
    nextCandidate.userId,
    "🔔 Pekerjaan Baru!",
    `Ada pekerjaan baru yang cocok untuk Anda.`,
    `/worker/jobs/${dispatch.job_id}`,
  );

  return {
    success: true,
    dispatchId: newDispatch.id,
    workerId: nextCandidate.workerId,
    workerName: nextCandidate.workerName,
    matchingScore: nextCandidate.score.total,
    expiresAt,
  };
}
