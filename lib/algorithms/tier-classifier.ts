/**
 * Worker Tier Classifier
 *
 * Implements the 4-tier worker system:
 * - CLASSIC (Tier 1): 0-19 jobs, <4.0 rating
 * - PRO (Tier 2): 20-99 jobs, 4.0+ rating, 90%+ punctuality
 * - ELITE (Tier 3): 100+ jobs, 4.6+ rating, 95%+ punctuality
 * - CHAMPION (Tier 4): 300+ jobs, 4.8+ rating, 98%+ punctuality
 */

import { WorkerTier } from '@/lib/supabase/types';

/**
 * Calculate a worker's tier based on performance metrics
 *
 * @param jobsCompleted - Total number of jobs completed
 * @param rating - Average rating (0-5)
 * @param punctuality - Punctuality percentage (0-100)
 * @returns The worker's tier
 */
export function classifyWorkerTier(
  jobsCompleted: number,
  rating: number | null | undefined,
  punctuality: number | null | undefined
): WorkerTier {
  const safeRating = rating ?? 0;
  const safePunctuality = punctuality ?? 0;

  // Check for Champion tier (highest priority)
  if (
    jobsCompleted >= 300 &&
    safeRating >= 4.8 &&
    safePunctuality >= 98
  ) {
    return 'champion';
  }

  // Check for Elite tier
  if (
    jobsCompleted >= 100 &&
    safeRating >= 4.6 &&
    safePunctuality >= 95
  ) {
    return 'elite';
  }

  // Check for Pro tier
  if (
    jobsCompleted >= 20 &&
    safeRating >= 4.0 &&
    safePunctuality >= 90
  ) {
    return 'pro';
  }

  // Default to Classic tier
  return 'classic';
}

/**
 * Get tier rank for sorting purposes
 * Lower rank number = higher priority
 *
 * @param tier - Worker tier
 * @returns Rank number (0-3)
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
 * Get tier bonus points for matching algorithm
 *
 * @param tier - Worker tier
 * @returns Bonus points (5-20)
 */
export function getTierBonus(tier: WorkerTier): number {
  const bonusMap: Record<WorkerTier, number> = {
    champion: 20,
    elite: 15,
    pro: 10,
    classic: 5,
  };
  return bonusMap[tier];
}

/**
 * Get tier display label
 *
 * @param tier - Worker tier
 * @returns Display label
 */
export function getTierLabel(tier: WorkerTier): string {
  const labelMap: Record<WorkerTier, string> = {
    champion: 'Champion',
    elite: 'Elite',
    pro: 'Pro',
    classic: 'Classic',
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
    champion: 'Top 1% performers with 300+ jobs and 4.8+ rating',
    elite: 'Top 5% performers with 100+ jobs and 4.6+ rating',
    pro: 'Experienced workers with 20+ jobs and 4.0+ rating',
    classic: 'New or early-stage workers building their reputation',
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
  punctuality: number | null | undefined
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
  punctuality: number | null | undefined
): boolean {
  const newTier = classifyWorkerTier(jobsCompleted, rating, punctuality);
  const currentRank = getTierRank(currentTier);
  const newRank = getTierRank(newTier);
  return newRank > currentRank;
}
