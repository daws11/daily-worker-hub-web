/**
 * Matching Score Algorithm
 *
 * Implements the 5-point matching algorithm:
 * 1. Skill Compatibility (30 points)
 * 2. Distance/Location (30 points)
 * 3. Availability (20 points)
 * 4. Rating & Reliability (15 points)
 * 5. Compliance (5 points)
 * + Tier Bonus (5-20 points)
 * Total: 115 max
 */

import { WorkerTier } from '@/lib/supabase/types';
import { getTierBonus } from './tier-classifier';

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
  lon2: number
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
 * @param workerSkills - Array of worker skill IDs
 * @param jobSkills - Array of required job skill IDs
 * @returns Skill compatibility score
 */
export function calculateSkillScore(
  workerSkills: string[],
  jobSkills: string[]
): number {
  if (!jobSkills || jobSkills.length === 0) {
    return 30; // No skill requirements = full score
  }

  if (!workerSkills || workerSkills.length === 0) {
    return 0; // Worker has no skills
  }

  // Count matching skills
  const matchingSkills = workerSkills.filter(skill =>
    jobSkills.includes(skill)
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
 * @param distance - Distance in kilometers
 * @returns Distance score
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
 * @param isAvailable - Whether worker is available for the full duration
 * @param partialAvailability - Whether worker is available for partial duration
 * @returns Availability score
 */
export function calculateAvailabilityScore(
  isAvailable: boolean,
  partialAvailability: boolean = false
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
 * @param rating - Average rating (0-5)
 * @returns Rating score
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
 * @param isCompliant - Whether worker is compliant with 21 Days Rule
 * @returns Compliance score
 */
export function calculateComplianceScore(isCompliant: boolean): number {
  return isCompliant ? 5 : 0;
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

  // Job data
  jobSkills: string[];
  jobLat: number;
  jobLng: number;

  // Availability & compliance
  isAvailable: boolean;
  isCompliant: boolean;
}

export function calculateMatchingScore(params: MatchingScoreParams): number {
  const {
    workerSkills,
    workerLat,
    workerLng,
    workerRating,
    workerTier,
    jobSkills,
    jobLat,
    jobLng,
    isAvailable,
    isCompliant,
  } = params;

  // Calculate distance
  const distance = calculateHaversineDistance(
    workerLat,
    workerLng,
    jobLat,
    jobLng
  );

  // Calculate individual scores
  const skillScore = calculateSkillScore(workerSkills, jobSkills);
  const distanceScore = calculateDistanceScore(distance);
  const availabilityScore = calculateAvailabilityScore(isAvailable);
  const ratingScore = calculateRatingScore(workerRating);
  const complianceScore = calculateComplianceScore(isCompliant);
  const tierBonus = getTierBonus(workerTier);

  // Calculate total score
  const totalScore =
    skillScore +
    distanceScore +
    availabilityScore +
    ratingScore +
    complianceScore +
    tierBonus;

  return Math.min(totalScore, 115); // Cap at 115
}

/**
 * Get matching score breakdown for display
 *
 * @param params - Matching parameters
 * @returns Score breakdown
 */
export function getMatchingScoreBreakdown(
  params: MatchingScoreParams
): {
  skillScore: number;
  distanceScore: number;
  distanceKm: number;
  availabilityScore: number;
  ratingScore: number;
  complianceScore: number;
  tierBonus: number;
  totalScore: number;
} {
  const {
    workerSkills,
    workerLat,
    workerLng,
    workerRating,
    workerTier,
    jobSkills,
    jobLat,
    jobLng,
    isAvailable,
    isCompliant,
  } = params;

  // Calculate distance
  const distance = calculateHaversineDistance(
    workerLat,
    workerLng,
    jobLat,
    jobLng
  );

  // Calculate individual scores
  const skillScore = calculateSkillScore(workerSkills, jobSkills);
  const distanceScore = calculateDistanceScore(distance);
  const availabilityScore = calculateAvailabilityScore(isAvailable);
  const ratingScore = calculateRatingScore(workerRating);
  const complianceScore = calculateComplianceScore(isCompliant);
  const tierBonus = getTierBonus(workerTier);

  // Calculate total score
  const totalScore =
    skillScore +
    distanceScore +
    availabilityScore +
    ratingScore +
    complianceScore +
    tierBonus;

  return {
    skillScore,
    distanceScore,
    distanceKm: distance,
    availabilityScore,
    ratingScore,
    complianceScore,
    tierBonus,
    totalScore: Math.min(totalScore, 115),
  };
}

/**
 * Get match quality label based on score
 *
 * @param score - Matching score
 * @returns Match quality label and color
 */
export function getMatchQuality(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 100) {
    return {
      label: 'Perfect Match',
      color: 'text-green-600',
      description: 'Excellent fit for this job',
    };
  } else if (score >= 85) {
    return {
      label: 'Great Match',
      color: 'text-blue-600',
      description: 'Very good fit for this job',
    };
  } else if (score >= 70) {
    return {
      label: 'Good Match',
      color: 'text-cyan-600',
      description: 'Good fit for this job',
    };
  } else if (score >= 55) {
    return {
      label: 'Fair Match',
      color: 'text-yellow-600',
      description: 'Acceptable fit for this job',
    };
  } else {
    return {
      label: 'Poor Match',
      color: 'text-red-600',
      description: 'Not recommended for this job',
    };
  }
}
