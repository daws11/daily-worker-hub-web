/**
 * Matching Score Algorithm
 *
 * Implements the 7-factor matching algorithm with tier bonus:
 * 1. Skill Compatibility (0–30 points): see calculateSkillScore
 * 2. Distance/Location  (0–30 points): see calculateDistanceScore
 * 3. Availability       (0–20 points): see calculateAvailabilityScore
 * 4. Rating & Reliability (0–15 points): see calculateRatingScore
 * 5. Compliance        (0–5 points):  see calculateComplianceScore
 * 6. Budget Match      (0–10 points): see calculateBudgetScore
 * 7. Category Match    (0–5 points):  see calculateCategoryScore
 * + Tier Bonus (5–20 points): see getTierBonus (in tier-classifier.ts)
 *
 * Maximum possible score: 130 points (capped via Math.min in calculateMatchingScore)
 *
 * Distance calculation: Haversine formula using Earth's radius of 6371 km
 * (see calculateHaversineDistance)
 */

import { WorkerTier } from "@/lib/supabase/types";
import { getTierBonus } from "./tier-classifier";

/**
 * Calculate Haversine distance between two coordinates
 *
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate skill compatibility score (0-30 points)
 *
 * Scoring thresholds:
 * - 30 points: No skill requirements, OR worker matches all required skills (100% match)
 * - 15 points: Worker matches at least 50% of required skills (partial match)
 * - 0 points:  Worker has no skills, OR matches less than 50% of required skills
 *
 * @param workerSkills - Array of worker skill IDs
 * @param jobSkills - Array of required job skill IDs
 * @returns Skill compatibility score (0, 15, or 30)
 */
export function calculateSkillScore(
  workerSkills: string[],
  jobSkills: string[],
): number {
  if (!jobSkills || jobSkills.length === 0) {
    return 30; // No skill requirements = full score
  }

  if (!workerSkills || workerSkills.length === 0) {
    return 0; // Worker has no skills
  }

  // Count matching skills
  const matchingSkills = workerSkills.filter((skill) =>
    jobSkills.includes(skill),
  );

  // Calculate score based on match percentage
  const matchPercentage = matchingSkills.length / jobSkills.length;

  if (matchPercentage === 1) {
    return 30; // Exact match: all required skills
  } else if (matchPercentage >= 0.5) {
    return 15; // Partial match: at least 50% of required skills
  } else {
    return 0; // No meaningful match
  }
}

/**
 * Calculate distance/location score (0-30 points)
 *
 * Scoring thresholds (in kilometers):
 * - 30 points: 0 km <= distance <= 5 km  (perfect proximity)
 * - 20 points: 5 km < distance <= 10 km  (good proximity)
 * - 10 points: 10 km < distance <= 20 km (acceptable)
 * - 0 points:  distance > 20 km            (too far)
 *
 * @param distance - Distance in kilometers
 * @returns Distance score (0, 10, 20, or 30)
 */
export function calculateDistanceScore(distance: number): number {
  if (distance <= 5) {
    return 30; // 0-5 km: perfect
  } else if (distance <= 10) {
    return 20; // 5-10 km: good
  } else if (distance <= 20) {
    return 10; // 10-20 km: acceptable
  } else {
    return 0; // 20+ km: too far
  }
}

/**
 * Calculate availability score (0-20 points)
 *
 * Scoring thresholds:
 * - 20 points: isAvailable = true  (available for full job duration)
 * - 10 points: isAvailable = false, partialAvailability = true (partial availability)
 * - 0 points:  isAvailable = false, partialAvailability = false (not available)
 *
 * @param isAvailable - Whether worker is available for the full duration
 * @param partialAvailability - Whether worker is available for partial duration
 * @returns Availability score (0, 10, or 20)
 */
export function calculateAvailabilityScore(
  isAvailable: boolean,
  partialAvailability: boolean = false,
): number {
  if (isAvailable) {
    return 20; // Available for full duration
  } else if (partialAvailability) {
    return 10; // Available for partial duration
  } else {
    return 0; // Not available
  }
}

/**
 * Calculate rating & reliability score (0-15 points)
 *
 * Scoring thresholds (rating scale 0-5):
 * - 15 points: rating >= 4.8 (excellent, 4.8-5.0 range)
 * - 12 points: rating >= 4.5 (very good, 4.5-4.7 range)
 * - 8 points:  rating >= 4.0 (good, 4.0-4.4 range)
 * - 0 points:  rating < 4.0  (poor)
 * - 0 points:  null / undefined (no rating yet)
 *
 * @param rating - Average rating (0-5)
 * @returns Rating score (0, 8, 12, or 15)
 */
export function calculateRatingScore(rating: number | null): number {
  if (!rating) {
    return 0; // No rating
  }

  if (rating >= 4.8) {
    return 15; // 4.8-5.0: excellent
  } else if (rating >= 4.5) {
    return 12; // 4.5-4.7: very good
  } else if (rating >= 4.0) {
    return 8; // 4.0-4.4: good
  } else {
    return 0; // <4.0: poor
  }
}

/**
 * Calculate compliance score (0-5 points)
 *
 * Scoring thresholds:
 * - 5 points: isCompliant = true  (worker is compliant with the 21 Days Rule)
 * - 0 points: isCompliant = false (worker has exceeded the 21-day limit)
 *
 * @param isCompliant - Whether worker is compliant with 21 Days Rule
 * @returns Compliance score (0 or 5)
 */
export function calculateComplianceScore(isCompliant: boolean): number {
  return isCompliant ? 5 : 0;
}

/**
 * Calculate budget match score (0-10 points)
 *
 * Scoring thresholds:
 * - 10 points: workerWage <= jobBudgetMax (worker fits within budget)
 * - 5 points:  workerWage <= jobBudgetMax * 1.1 (within 10% over budget)
 * - 0 points:  workerWage > jobBudgetMax * 1.1 (too expensive)
 *
 * @param workerWage - Worker's expected hourly or daily wage
 * @param jobBudgetMax - Job's maximum budget
 * @returns Budget match score (0, 5, or 10)
 */
export function calculateBudgetScore(
  workerWage: number | null | undefined,
  jobBudgetMax: number,
): number {
  if (!workerWage || workerWage <= 0) {
    return 10; // No preference = full score
  }
  if (jobBudgetMax <= 0) {
    return 10; // No budget constraint = full score
  }

  if (workerWage <= jobBudgetMax) {
    return 10; // Worker fits within budget
  } else if (workerWage <= jobBudgetMax * 1.1) {
    return 5; // Within 10% over budget
  } else {
    return 0; // Too expensive
  }
}

/**
 * Calculate category match score (0-5 points)
 *
 * Scoring thresholds:
 * - 5 points: job category is in worker's preferred categories
 * - 0 points: job category is not in worker's preferred categories
 *
 * If worker has no preferred categories, returns full score (no preference).
 *
 * @param workerCategories - Array of worker's preferred category IDs
 * @param jobCategory - Job's category ID
 * @returns Category match score (0 or 5)
 */
export function calculateCategoryScore(
  workerCategories: string[] | null | undefined,
  jobCategory: string,
): number {
  if (!workerCategories || workerCategories.length === 0) {
    return 5; // No preference = full score
  }
  if (!jobCategory) {
    return 5; // No category = full score
  }

  return workerCategories.includes(jobCategory) ? 5 : 0;
}

/**
 * Calculate total matching score for a worker-job pair
 *
 * @param params - Matching parameters
 * @returns Total matching score (0-115)
 */
export interface MatchingScoreParams {
  // Worker data
  workerSkills: string[];
  workerLat: number;
  workerLng: number;
  workerRating: number | null;
  workerTier: WorkerTier;
  workerWage?: number | null;
  workerCategories?: string[] | null;

  // Job data
  jobSkills: string[];
  jobLat: number;
  jobLng: number;
  jobBudgetMax?: number;
  jobCategoryId?: string;

  // Availability & compliance
  isAvailable: boolean;
  isCompliant: boolean;
}

/**
 * Matching score params with precomputed distance — avoids redundant Haversine
 * computation when distance is already known (e.g. from a database query).
 */
export interface MatchingScoreParamsWithDistance {
  // Worker data
  workerSkills: string[];
  workerRating: number | null;
  workerTier: WorkerTier;
  workerWage?: number | null;
  workerCategories?: string[] | null;

  // Job data
  jobSkills: string[];
  jobBudgetMax?: number;
  jobCategoryId?: string;

  // Precomputed distance in kilometers
  distanceKm: number;

  // Availability & compliance
  isAvailable: boolean;
  isCompliant: boolean;
}

/**
 * Score breakdown with individual component scores.
 * Use with WorkerScoreSummary for a lightweight return type.
 */
export interface ScoreBreakdown {
  skillScore: number;
  distanceScore: number;
  availabilityScore: number;
  ratingScore: number;
  complianceScore: number;
  budgetScore: number;
  categoryScore: number;
  tierBonus: number;
}

/**
 * Lightweight summary of a worker's matching score for a job.
 * Use this type when callers only need the score and distance,
 * not a full WorkerWithScore object.
 */
export interface WorkerScoreSummary {
  matchingScore: number;
  distanceKm: number;
  breakdown: ScoreBreakdown;
}

export function calculateMatchingScore(params: MatchingScoreParams): number {
  return getMatchingScoreBreakdown(params).matchingScore;
}

/**
 * Get matching score breakdown for display
 *
 * @param params - Matching parameters
 * @returns Score breakdown
 */
export function getMatchingScoreBreakdown(params: MatchingScoreParams): WorkerScoreSummary {
  const {
    workerSkills,
    workerLat,
    workerLng,
    workerRating,
    workerTier,
    workerWage,
    workerCategories,
    jobSkills,
    jobLat,
    jobLng,
    jobBudgetMax,
    jobCategoryId,
    isAvailable,
    isCompliant,
  } = params;

  // Calculate distance
  const distance = calculateHaversineDistance(
    workerLat,
    workerLng,
    jobLat,
    jobLng,
  );

  // Calculate individual scores
  const skillScore = calculateSkillScore(workerSkills, jobSkills);
  const distanceScore = calculateDistanceScore(distance);
  const availabilityScore = calculateAvailabilityScore(isAvailable);
  const ratingScore = calculateRatingScore(workerRating);
  const complianceScore = calculateComplianceScore(isCompliant);
  const budgetScore = calculateBudgetScore(workerWage, jobBudgetMax ?? 0);
  const categoryScore = calculateCategoryScore(workerCategories, jobCategoryId ?? "");
  const tierBonus = getTierBonus(workerTier);

  // Calculate total score
  const totalScore =
    skillScore +
    distanceScore +
    availabilityScore +
    ratingScore +
    complianceScore +
    budgetScore +
    categoryScore +
    tierBonus;

  return {
    matchingScore: Math.min(totalScore, 130),
    distanceKm: distance,
    breakdown: {
      skillScore,
      distanceScore,
      availabilityScore,
      ratingScore,
      complianceScore,
      budgetScore,
      categoryScore,
      tierBonus,
    },
  };
}

/**
 * Calculate total matching score using a precomputed distance.
 *
 * Use this overload when distance has already been computed (e.g. from a DB
 * GIS query) to avoid recalculating the Haversine formula.
 *
 * @param params - Matching parameters with precomputed distance
 * @returns Total matching score (0-115)
 */
export function calculateMatchingScoreWithDistance(
  params: MatchingScoreParamsWithDistance,
): number {
  return getMatchingScoreBreakdownWithDistance(params).matchingScore;
}

/**
 * Get matching score breakdown using a precomputed distance.
 *
 * Use this overload when distance has already been computed (e.g. from a DB
 * GIS query) to avoid recalculating the Haversine formula.
 *
 * @param params - Matching parameters with precomputed distance
 * @returns Score breakdown
 */
export function getMatchingScoreBreakdownWithDistance(
  params: MatchingScoreParamsWithDistance,
): WorkerScoreSummary {
  const {
    workerSkills,
    workerRating,
    workerTier,
    workerWage,
    workerCategories,
    jobSkills,
    jobBudgetMax,
    jobCategoryId,
    distanceKm,
    isAvailable,
    isCompliant,
  } = params;

  // Use precomputed distance directly
  const distanceScore = calculateDistanceScore(distanceKm);

  // Calculate individual scores
  const skillScore = calculateSkillScore(workerSkills, jobSkills);
  const availabilityScore = calculateAvailabilityScore(isAvailable);
  const ratingScore = calculateRatingScore(workerRating);
  const complianceScore = calculateComplianceScore(isCompliant);
  const budgetScore = calculateBudgetScore(workerWage, jobBudgetMax ?? 0);
  const categoryScore = calculateCategoryScore(workerCategories, jobCategoryId ?? "");
  const tierBonus = getTierBonus(workerTier);

  // Calculate total score
  const totalScore =
    skillScore +
    distanceScore +
    availabilityScore +
    ratingScore +
    complianceScore +
    budgetScore +
    categoryScore +
    tierBonus;

  return {
    matchingScore: Math.min(totalScore, 130),
    distanceKm,
    breakdown: {
      skillScore,
      distanceScore,
      availabilityScore,
      ratingScore,
      complianceScore,
      budgetScore,
      categoryScore,
      tierBonus,
    },
  };
}

/**
 * Get match quality label based on score
 *
 * Quality thresholds (score range 0-130):
 * - "Perfect Match" (green):  score >= 115
 * - "Great Match"  (blue):    score >= 95 && score < 115
 * - "Good Match"   (cyan):    score >= 75 && score < 95
 * - "Fair Match"   (yellow):  score >= 55 && score < 75
 * - "Poor Match"   (red):     score < 55
 *
 * @param score - Matching score
 * @returns Match quality label, color class, and description
 */
export function getMatchQuality(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 115) {
    return {
      label: "Perfect Match",
      color: "text-green-600",
      description: "Excellent fit for this job",
    };
  } else if (score >= 95) {
    return {
      label: "Great Match",
      color: "text-blue-600",
      description: "Very good fit for this job",
    };
  } else if (score >= 75) {
    return {
      label: "Good Match",
      color: "text-cyan-600",
      description: "Good fit for this job",
    };
  } else if (score >= 55) {
    return {
      label: "Fair Match",
      color: "text-yellow-600",
      description: "Acceptable fit for this job",
    };
  } else {
    return {
      label: "Poor Match",
      color: "text-red-600",
      description: "Not recommended for this job",
    };
  }
}
