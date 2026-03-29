/**
 * Worker Shortlist Generator
 *
 * Generates a ranked list of workers for a job based on matching algorithm
 */

import {
  MatchingScoreParams,
  getMatchingScoreBreakdown,
} from "./matching-score";
import { getTierRank } from "./tier-classifier";
import { WorkerTier } from "@/lib/supabase/types";
import { supabase } from "@/lib/supabase/client";
import { batchCheckWorkerAvailability } from "./availability-checker";

/**
 * Default minimum matching score threshold for worker shortlisting.
 * Workers with a score below this value are excluded from the shortlist.
 * A score of 50 represents partial relevance — acceptable but not strong.
 */
const DEFAULT_MIN_SCORE = 50;

/**
 * Shortlist multiplier — number of top-ranked workers returned per required worker.
 * Returns 2× the requested count to provide the employer with selection options.
 * e.g., 3 required workers → top 6 candidates returned.
 */
const SHORTLIST_MULTIPLIER = 2;

/**
 * Worker with matching score
 */
export interface WorkerWithScore {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  tier: WorkerTier;
  skills: string[];
  rating: number | null;
  punctuality: number | null;
  jobsCompleted: number;
  locationName: string | null;
  lat: number;
  lng: number;
  matchingScore: number;
  distanceKm: number;
  breakdown: {
    skillScore: number;
    distanceScore: number;
    availabilityScore: number;
    ratingScore: number;
    complianceScore: number;
    tierBonus: number;
  };
}

/**
 * Shortlist generation parameters
 */
export interface ShortlistParams {
  jobId?: string;
  jobSkills: string[];
  jobLat: number;
  jobLng: number;
  jobDate: Date; // Job start date
  jobStartHour: number; // Job start hour (0-23)
  jobEndHour: number; // Job end hour (0-23)
  requiredWorkers: number;
  excludeWorkerIds?: string[];
  minScore?: number; // Minimum matching score threshold
}

/**
 * Generate worker shortlist for a job
 *
 * @param params - Shortlist generation parameters
 * @returns Sorted list of workers with matching scores
 */
export async function generateWorkerShortlist(
  params: ShortlistParams,
): Promise<WorkerWithScore[]> {
  const {
    jobSkills,
    jobLat,
    jobLng,
    jobDate,
    jobStartHour,
    jobEndHour,
    requiredWorkers,
    excludeWorkerIds = [],
    minScore = DEFAULT_MIN_SCORE,
  } = params;

  try {
    // Fetch available workers with their data
    const { data: workers, error } = await supabase
      .from("workers")
      .select(
        `
        id,
        user_id,
        full_name,
        avatar_url,
        tier,
        lat,
        lng,
        location_name,
        jobs_completed,
        rating,
        punctuality,
        worker_skills (
          skill_id
        )
      `,
      )
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (error) {
      console.error("Error fetching workers:", error);
      return [];
    }

    if (!workers || workers.length === 0) {
      return [];
    }

    // Filter workers (exclude specified IDs) and collect their IDs for batch availability check
    // Use type assertion to handle Supabase query result typing
    const workersList = workers as any[];
    const eligibleWorkers = workersList.filter(
      (worker: any) => !excludeWorkerIds.includes(worker.id),
    );
    const eligibleWorkerIds = eligibleWorkers.map((w: any) => w.id);

    // Batch-check availability for all workers in a single DB query (avoids N+1)
    const availabilityMap = await batchCheckWorkerAvailability(
      eligibleWorkerIds,
      jobDate,
      jobStartHour,
      jobEndHour,
    );

    // Calculate matching scores for each worker using the pre-fetched availability data
    const workersWithScores: WorkerWithScore[] = eligibleWorkers.map(
      (worker: any) => {
        const workerSkills =
          worker.worker_skills?.map((ws: any) => ws.skill_id) || [];
        const isAvailable = availabilityMap[worker.id] ?? false;

        const matchingParams: MatchingScoreParams = {
          workerSkills,
          workerLat: worker.lat,
          workerLng: worker.lng,
          workerRating: worker.rating,
          workerTier: worker.tier,
          jobSkills,
          jobLat,
          jobLng,
          isAvailable,
          isCompliant: true, // TODO: Check 21 Days Rule compliance
        };

        const breakdown = getMatchingScoreBreakdown(matchingParams);

        return {
          id: worker.id,
          userId: worker.user_id,
          fullName: worker.full_name,
          avatarUrl: worker.avatar_url,
          tier: worker.tier,
          skills: workerSkills,
          rating: worker.rating,
          punctuality: worker.punctuality,
          jobsCompleted: worker.jobs_completed || 0,
          locationName: worker.location_name,
          lat: worker.lat,
          lng: worker.lng,
          matchingScore: breakdown.totalScore,
          distanceKm: breakdown.distanceKm,
          breakdown: {
            skillScore: breakdown.skillScore,
            distanceScore: breakdown.distanceScore,
            availabilityScore: breakdown.availabilityScore,
            ratingScore: breakdown.ratingScore,
            complianceScore: breakdown.complianceScore,
            tierBonus: breakdown.tierBonus,
          },
        };
      },
    );

    // Filter by minimum score and sort
    return workersWithScores
      .filter((worker) => worker.matchingScore >= minScore)
      .sort((a, b) => {
        // Primary sort: Total score (descending)
        if (b.matchingScore !== a.matchingScore) {
          return b.matchingScore - a.matchingScore;
        }

        // Secondary sort: Tier rank (higher tier = better)
        const tierRankA = getTierRank(a.tier);
        const tierRankB = getTierRank(b.tier);
        if (tierRankA !== tierRankB) {
          return tierRankA - tierRankB;
        }

        // Tertiary sort: Distance (closer = better)
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, requiredWorkers * SHORTLIST_MULTIPLIER);
  } catch (error) {
    console.error("Error generating worker shortlist:", error);
    return [];
  }
}

/**
 * Generate worker shortlist from a list of worker IDs
 * Useful when you have a pre-filtered list of workers
 *
 * @param workerIds - List of worker IDs to score
 * @param params - Matching parameters
 * @returns Sorted list of workers with matching scores
 */
export async function generateWorkerShortlistFromIds(
  workerIds: string[],
  params: ShortlistParams,
): Promise<WorkerWithScore[]> {
  const {
    jobSkills,
    jobLat,
    jobLng,
    jobDate,
    jobStartHour,
    jobEndHour,
    requiredWorkers,
  } = params;

  try {
    // Fetch workers by IDs
    const { data: workers, error } = await supabase
      .from("workers")
      .select(
        `
        id,
        user_id,
        full_name,
        avatar_url,
        tier,
        lat,
        lng,
        location_name,
        jobs_completed,
        rating,
        punctuality,
        worker_skills (
          skill_id
        )
      `,
      )
      .in("id", workerIds);

    if (error || !workers) {
      console.error("Error fetching workers:", error);
      return [];
    }

    // Batch-check availability for all workers in a single DB query (avoids N+1)
    const availabilityMap = await batchCheckWorkerAvailability(
      workerIds,
      jobDate,
      jobStartHour,
      jobEndHour,
    );

    // Calculate matching scores using the pre-fetched availability data
    // Use type assertion to handle Supabase query result typing
    const workersList = workers as any[];
    const workersWithScores = workersList.map((worker: any) => {
      const workerSkills =
        worker.worker_skills?.map((ws: any) => ws.skill_id) || [];
      const isAvailable = availabilityMap[worker.id] ?? false;

      const matchingParams: MatchingScoreParams = {
        workerSkills,
        workerLat: worker.lat,
        workerLng: worker.lng,
        workerRating: worker.rating,
        workerTier: worker.tier,
        jobSkills,
        jobLat,
        jobLng,
        isAvailable,
        isCompliant: true,
      };

      const breakdown = getMatchingScoreBreakdown(matchingParams);

      return {
        id: worker.id,
        userId: worker.user_id,
        fullName: worker.full_name,
        avatarUrl: worker.avatar_url,
        tier: worker.tier,
        skills: workerSkills,
        rating: worker.rating,
        punctuality: worker.punctuality,
        jobsCompleted: worker.jobs_completed || 0,
        locationName: worker.location_name,
        lat: worker.lat,
        lng: worker.lng,
        matchingScore: breakdown.totalScore,
        distanceKm: breakdown.distanceKm,
        breakdown: {
          skillScore: breakdown.skillScore,
          distanceScore: breakdown.distanceScore,
          availabilityScore: breakdown.availabilityScore,
          ratingScore: breakdown.ratingScore,
          complianceScore: breakdown.complianceScore,
          tierBonus: breakdown.tierBonus,
        },
      };
    });

    // Sort and return top workers
    return workersWithScores
      .sort((a, b) => {
        if (b.matchingScore !== a.matchingScore) {
          return b.matchingScore - a.matchingScore;
        }
        const tierRankA = getTierRank(a.tier);
        const tierRankB = getTierRank(b.tier);
        if (tierRankA !== tierRankB) {
          return tierRankA - tierRankB;
        }
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, requiredWorkers * SHORTLIST_MULTIPLIER);
  } catch (error) {
    console.error("Error generating worker shortlist from IDs:", error);
    return [];
  }
}

/**
 * Get top workers from shortlist by tier
 *
 * @param shortlist - Worker shortlist
 * @returns Object with workers grouped by tier
 */
export function groupWorkersByTier(
  shortlist: WorkerWithScore[],
): Record<WorkerTier, WorkerWithScore[]> {
  const grouped: Record<WorkerTier, WorkerWithScore[]> = {
    champion: [],
    elite: [],
    pro: [],
    classic: [],
  };

  for (const worker of shortlist) {
    grouped[worker.tier].push(worker);
  }

  return grouped;
}

/**
 * Get interview recommendation based on worker tier
 *
 * @param tier - Worker tier
 * @returns Interview recommendation
 */
export function getInterviewRecommendation(tier: WorkerTier): {
  required: boolean;
  type: "none" | "chat" | "chat_and_voice";
  estimatedTime: string;
  description: string;
} {
  switch (tier) {
    case "champion":
    case "elite":
      return {
        required: false,
        type: "none",
        estimatedTime: "<5 minutes",
        description: "Instant dispatch - no interview needed",
      };
    case "pro":
      return {
        required: true,
        type: "chat",
        estimatedTime: "15-30 minutes",
        description: "In-app chat interview (5-10 min)",
      };
    case "classic":
      return {
        required: true,
        type: "chat_and_voice",
        estimatedTime: "30-60 minutes",
        description: "In-app chat + voice call (10-15 min)",
      };
  }
}
