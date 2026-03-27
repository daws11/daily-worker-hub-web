/**
 * Worker Tier Classifier
 *
 * Implements the 4-tier worker performance system based on:
 * - Jobs completed (volume of work experience)
 * - Average rating (quality of service, 0-5 scale)
 * - Punctuality percentage (reliability, 0-100 scale)
 *
 * Tier thresholds:
 * - CLASSIC (Tier 4): 0-19 jobs completed, no minimum rating/punctuality
 * - PRO     (Tier 3): 20-99 jobs completed, 4.0+ rating, 90%+ punctuality
 * - ELITE   (Tier 2): 100-299 jobs completed, 4.6+ rating, 95%+ punctuality
 * - CHAMPION (Tier 1): 300+ jobs completed, 4.8+ rating, 98%+ punctuality
 *
 * Matching bonus points awarded per tier:
 * - CHAMPION: +20 points  (top-tier performers, maximum priority)
 * - ELITE:    +15 points  (high-performers with proven track record)
 * - PRO:      +10 points  (reliable workers with solid experience)
 * - CLASSIC:  +5 points   (entry-level workers, standard priority)
 *
 * Source: Internal performance benchmarking and industry standards
 */

import { WorkerTier } from "@/lib/supabase/types";

/**
 * Tier threshold configuration for worker classification.
 * Each tier defines minimum requirements across jobs, rating, and punctuality.
 *
 * The thresholds are intentionally cumulative (Champion requires all criteria
 * including the Elite minimums), ensuring only truly exceptional workers reach
 * the top tier. This prevents workers from reaching high tiers on volume alone.
 */
interface TierThresholds {
  /** Minimum number of completed jobs required */
  minJobs: number;
  /** Minimum average rating on a 0-5 scale */
  minRating: number;
  /** Minimum punctuality percentage (0-100) */
  minPunctuality: number;
  /** Bonus points awarded to this tier in the matching algorithm */
  bonusPoints: number;
}

/**
 * Tier thresholds and bonus points by worker tier.
 *
 * All tiers above CLASSIC require meeting ALL criteria simultaneously:
 * - Minimum jobs completed (experience volume)
 * - Minimum rating score (service quality)
 * - Minimum punctuality (reliability)
 *
 * Bonus points influence job matching algorithm priority (higher = preferred).
 */
const TIER_THRESHOLDS: Record<WorkerTier, TierThresholds> = {
  champion: {
    minJobs: 300,
    minRating: 4.8,
    minPunctuality: 98,
    bonusPoints: 20,
  },
  elite: {
    minJobs: 100,
    minRating: 4.6,
    minPunctuality: 95,
    bonusPoints: 15,
  },
  pro: {
    minJobs: 20,
    minRating: 4.0,
    minPunctuality: 90,
    bonusPoints: 10,
  },
  classic: {
    minJobs: 0,
    minRating: 0,
    minPunctuality: 0,
    bonusPoints: 5,
  },
};

/**
 * Calculate a worker's tier based on performance metrics.
 *
 * Evaluates each tier in descending order (Champion → Classic), returning the
 * first tier whose minimum thresholds are all satisfied. A worker must meet
 * ALL criteria for a given tier to qualify — partial qualification does not apply.
 *
 * @param jobsCompleted - Total number of jobs completed
 * @param rating - Average rating (0-5)
 * @param punctuality - Punctuality percentage (0-100)
 * @returns The worker's tier
 */
export function classifyWorkerTier(
  jobsCompleted: number,
  rating: number | null | undefined,
  punctuality: number | null | undefined,
): WorkerTier {
  const safeRating = rating ?? 0;
  const safePunctuality = punctuality ?? 0;

  // Check tiers in priority order: Champion > Elite > Pro > Classic
  if (
    jobsCompleted >= TIER_THRESHOLDS.champion.minJobs &&
    safeRating >= TIER_THRESHOLDS.champion.minRating &&
    safePunctuality >= TIER_THRESHOLDS.champion.minPunctuality
  ) {
    return "champion";
  }

  if (
    jobsCompleted >= TIER_THRESHOLDS.elite.minJobs &&
    safeRating >= TIER_THRESHOLDS.elite.minRating &&
    safePunctuality >= TIER_THRESHOLDS.elite.minPunctuality
  ) {
    return "elite";
  }

  if (
    jobsCompleted >= TIER_THRESHOLDS.pro.minJobs &&
    safeRating >= TIER_THRESHOLDS.pro.minRating &&
    safePunctuality >= TIER_THRESHOLDS.pro.minPunctuality
  ) {
    return "pro";
  }

  // Default to Classic tier (no minimums required)
  return "classic";
}

/**
 * Get tier rank for sorting purposes.
 *
 * Rank values are ordinal: lower rank = higher priority in matching/sorting.
 * - 0 = Champion  (highest priority, top-tier performers)
 * - 1 = Elite      (high priority)
 * - 2 = Pro        (standard priority)
 * - 3 = Classic    (lowest priority, entry-level)
 *
 * @param tier - Worker tier
 * @returns Rank number (0 for Champion, 1 for Elite, 2 for Pro, 3 for Classic)
 */
export function getTierRank(tier: WorkerTier): number {
  const rankMap: Record<WorkerTier, number> = {
    champion: 0,
    elite: 1,
    pro: 2,
    classic: 3,
  };
  return rankMap[tier];
}

/**
 * Get tier bonus points for the matching algorithm.
 *
 * Bonus points reward demonstrated reliability and experience:
 * - Champion: +20 points  (300+ jobs, 4.8+ rating, 98%+ punctuality)
 * - Elite:    +15 points  (100+ jobs, 4.6+ rating, 95%+ punctuality)
 * - Pro:      +10 points  (20+ jobs, 4.0+ rating, 90%+ punctuality)
 * - Classic:  +5 points   (entry-level, no minimums)
 *
 * These values are intentionally spaced to create meaningful priority gaps
 * between tiers in the matching score calculation.
 *
 * @param tier - Worker tier
 * @returns Bonus points (5 for Classic, 10 for Pro, 15 for Elite, 20 for Champion)
 */
export function getTierBonus(tier: WorkerTier): number {
  return TIER_THRESHOLDS[tier].bonusPoints;
}

/**
 * Get tier display label
 *
 * @param tier - Worker tier
 * @returns Display label
 */
export function getTierLabel(tier: WorkerTier): string {
  const labelMap: Record<WorkerTier, string> = {
    champion: "Champion",
    elite: "Elite",
    pro: "Pro",
    classic: "Classic",
  };
  return labelMap[tier];
}

/**
 * Get tier description
 *
 * @param tier - Worker tier
 * @returns Tier description
 */
export function getTierDescription(tier: WorkerTier): string {
  const descMap: Record<WorkerTier, string> = {
    champion: "Top 1% performers with 300+ jobs and 4.8+ rating",
    elite: "Top 5% performers with 100+ jobs and 4.6+ rating",
    pro: "Experienced workers with 20+ jobs and 4.0+ rating",
    classic: "New or early-stage workers building their reputation",
  };
  return descMap[tier];
}

/**
 * Check if tier upgrade is possible
 *
 * @param currentTier - Current worker tier
 * @param jobsCompleted - Total jobs completed
 * @param rating - Average rating
 * @param punctuality - Punctuality percentage
 * @returns True if tier upgrade is possible
 */
export function canUpgradeTier(
  currentTier: WorkerTier,
  jobsCompleted: number,
  rating: number | null | undefined,
  punctuality: number | null | undefined,
): boolean {
  const newTier = classifyWorkerTier(jobsCompleted, rating, punctuality);
  const currentRank = getTierRank(currentTier);
  const newRank = getTierRank(newTier);
  return newRank < currentRank;
}

/**
 * Check if tier downgrade is possible
 *
 * @param currentTier - Current worker tier
 * @param jobsCompleted - Total jobs completed
 * @param rating - Average rating
 * @param punctuality - Punctuality percentage
 * @returns True if tier downgrade is possible
 */
export function canDowngradeTier(
  currentTier: WorkerTier,
  jobsCompleted: number,
  rating: number | null | undefined,
  punctuality: number | null | undefined,
): boolean {
  const newTier = classifyWorkerTier(jobsCompleted, rating, punctuality);
  const currentRank = getTierRank(currentTier);
  const newRank = getTierRank(newTier);
  return newRank > currentRank;
}
