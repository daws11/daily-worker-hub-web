/**
 * Matching Score Precomputed Tests
 *
 * Tests the precomputed-distance variants of the matching algorithm:
 * - calculateMatchingScoreWithDistance
 * - getMatchingScoreBreakdownWithDistance
 *
 * These functions accept precomputed distance (from DB GIS query) to avoid
 * redundant Haversine computation.
 */

import { describe, it, expect } from "vitest";
import {
  calculateMatchingScoreWithDistance,
  getMatchingScoreBreakdownWithDistance,
  MatchingScoreParamsWithDistance,
} from "../matching-score";

describe("Matching Score with Precomputed Distance", () => {
  describe("calculateMatchingScoreWithDistance", () => {
    it("should return maximum score for perfect match with zero distance", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping", "cleaning"],
        workerRating: 5.0,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 30 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 20 = 120, capped at 115
      expect(score).toBe(115);
    });

    it("should return 30 for distance <= 5km band", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 3,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 30 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 5 = 105
      expect(score).toBe(105);
    });

    it("should return 20 for distance 5-10km band", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 7.5,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 20 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 5 = 95
      expect(score).toBe(95);
    });

    it("should return 10 for distance 10-20km band", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 15,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 10 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 5 = 85
      expect(score).toBe(85);
    });

    it("should return 0 for distance > 20km band", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 50,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 0 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 5 = 75
      expect(score).toBe(75);
    });

    it("should return low score for poor skill match with distance", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: [],
        workerRating: 3.5,
        workerTier: "classic",
        jobSkills: ["housekeeping", "cleaning", "laundry"],
        distanceKm: 5,
        isAvailable: false,
        isCompliant: false,
      });

      // Skill: 0 + Distance: 30 + Rating: 0 + Availability: 0 + Compliance: 0 + Tier: 5 = 35
      expect(score).toBe(35);
    });

    it("should handle null rating", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: null,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 30 + Rating: 0 + Availability: 20 + Compliance: 5 + Tier: 5 = 90
      expect(score).toBe(90);
    });

    it("should handle unavailable worker", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: false,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 30 + Rating: 15 + Availability: 0 + Compliance: 5 + Tier: 10 = 90
      expect(score).toBe(90);
    });

    it("should handle non-compliant worker", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: false,
      });

      // Skill: 30 + Distance: 30 + Rating: 15 + Availability: 20 + Compliance: 0 + Tier: 10 = 105
      expect(score).toBe(105);
    });

    it("should cap score at 115 regardless of inputs", () => {
      // Best possible combination
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping", "cleaning", "laundry"],
        workerRating: 5.0,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      // 30 + 30 + 15 + 20 + 5 + 20 = 120, capped at 115
      expect(score).toBeLessThanOrEqual(115);
      expect(score).toBe(115);
    });

    it("should calculate correctly for classic tier", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.0,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 8,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 20 + Rating: 8 + Availability: 20 + Compliance: 5 + Tier: 5 = 88
      expect(score).toBe(88);
    });

    it("should calculate correctly for pro tier", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 3,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 30 + Rating: 12 + Availability: 20 + Compliance: 5 + Tier: 10 = 107
      expect(score).toBe(107);
    });

    it("should calculate correctly for champion tier", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.9,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 12,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 10 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 20 = 100
      expect(score).toBe(100);
    });

    it("should handle partial skill match correctly", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping", "cleaning"],
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping", "cleaning", "laundry", "waiter"],
        distanceKm: 5,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 15 (2/4 = 50%) + Distance: 30 + Rating: 12 + Availability: 20 + Compliance: 5 + Tier: 10 = 92
      expect(score).toBe(92);
    });

    it("should return 0 for no skill match", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["cooking"],
        workerRating: 4.8,
        workerTier: "pro",
        jobSkills: ["housekeeping", "cleaning"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 0 + Distance: 30 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 10 = 80
      expect(score).toBe(80);
    });

    it("should handle exact boundary at 5km", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 5,
        isAvailable: true,
        isCompliant: true,
      });

      // 5km is still in the <= 5km band, so distance score = 30
      // Skill: 30 + Distance: 30 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 5 = 105
      expect(score).toBe(105);
    });

    it("should handle exact boundary at 10km", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 10,
        isAvailable: true,
        isCompliant: true,
      });

      // 10km is still in 5-10km band, so distance score = 20
      // Skill: 30 + Distance: 20 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 5 = 95
      expect(score).toBe(95);
    });

    it("should handle exact boundary at 20km", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 20,
        isAvailable: true,
        isCompliant: true,
      });

      // 20km is still in 10-20km band, so distance score = 10
      // Skill: 30 + Distance: 10 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 5 = 85
      expect(score).toBe(85);
    });

    it("should handle slightly above 20km boundary", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 20.01,
        isAvailable: true,
        isCompliant: true,
      });

      // 20.01km is > 20km, so distance score = 0
      // Skill: 30 + Distance: 0 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 5 = 75
      expect(score).toBe(75);
    });
  });

  describe("getMatchingScoreBreakdownWithDistance", () => {
    it("should return complete breakdown with all required properties", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 3,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown).toHaveProperty("matchingScore");
      expect(breakdown).toHaveProperty("distanceKm");
      expect(breakdown).toHaveProperty("breakdown");
      expect(breakdown.breakdown).toHaveProperty("skillScore");
      expect(breakdown.breakdown).toHaveProperty("distanceScore");
      expect(breakdown.breakdown).toHaveProperty("availabilityScore");
      expect(breakdown.breakdown).toHaveProperty("ratingScore");
      expect(breakdown.breakdown).toHaveProperty("complianceScore");
      expect(breakdown.breakdown).toHaveProperty("tierBonus");
    });

    it("should reflect exact precomputed distance in result", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 7.5,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.distanceKm).toBe(7.5);
      // 7.5km falls in 5-10km band -> 20 points
      expect(breakdown.breakdown.distanceScore).toBe(20);
    });

    it("should calculate correct skill score for exact match", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping", "cleaning"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping", "cleaning"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.skillScore).toBe(30);
    });

    it("should calculate correct skill score for partial match", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping", "cleaning", "laundry", "waiter"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      // 1/4 = 25% < 50% -> 0 points
      expect(breakdown.breakdown.skillScore).toBe(0);
    });

    it("should calculate correct rating score for excellent rating", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 5.0,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.ratingScore).toBe(15);
    });

    it("should calculate correct rating score for very good rating", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.6,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.ratingScore).toBe(12);
    });

    it("should calculate correct rating score for good rating", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.2,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.ratingScore).toBe(8);
    });

    it("should calculate correct rating score for poor rating", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 3.5,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.ratingScore).toBe(0);
    });

    it("should return zero rating score for null rating", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: null,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.ratingScore).toBe(0);
    });

    it("should calculate correct availability score for full availability", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.availabilityScore).toBe(20);
    });

    it("should calculate correct availability score for partial availability", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: false,
        isCompliant: true,
      });

      expect(breakdown.breakdown.availabilityScore).toBe(0);
    });

    it("should calculate correct compliance score for compliant worker", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.complianceScore).toBe(5);
    });

    it("should calculate correct compliance score for non-compliant worker", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: false,
      });

      expect(breakdown.breakdown.complianceScore).toBe(0);
    });

    it("should calculate correct tier bonus for classic tier", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.tierBonus).toBe(5);
    });

    it("should calculate correct tier bonus for pro tier", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.tierBonus).toBe(10);
    });

    it("should calculate correct tier bonus for champion tier", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.tierBonus).toBe(20);
    });

    it("should match calculateMatchingScoreWithDistance total", () => {
      const params: MatchingScoreParamsWithDistance = {
        workerSkills: ["housekeeping", "cleaning"],
        workerRating: 4.8,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 2,
        isAvailable: true,
        isCompliant: true,
      };

      const breakdown = getMatchingScoreBreakdownWithDistance(params);
      const score = calculateMatchingScoreWithDistance(params);

      expect(breakdown.matchingScore).toBe(score);
    });

    it("should cap total at 115", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 5.0,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      // 30 + 30 + 15 + 20 + 5 + 20 = 120, capped at 115
      expect(breakdown.matchingScore).toBe(115);
    });

    it("should return zero distance score for far distance", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 100,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.distanceScore).toBe(0);
      expect(breakdown.distanceKm).toBe(100);
    });

    it("should handle job with no required skills", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: [],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      // No skill requirements = full 30 points
      expect(breakdown.breakdown.skillScore).toBe(30);
    });

    it("should handle worker with no skills and job requires skills", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: [],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.skillScore).toBe(0);
    });
  });

  describe("Realistic Bali Scenarios with Precomputed Distance", () => {
    it("should handle worker in Sanur matched to job in Kuta", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping", "cleaning"],
        workerRating: 4.7,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 8,
        isAvailable: true,
        isCompliant: true,
      });

      // Sanur to Kuta ~8km -> distance score: 20
      expect(breakdown.distanceKm).toBe(8);
      expect(breakdown.breakdown.distanceScore).toBe(20);
      expect(breakdown.matchingScore).toBeGreaterThan(80);
    });

    it("should handle worker in Seminyak matched to job in Canggu", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["cooking", "waiter"],
        workerRating: 4.9,
        workerTier: "champion",
        jobSkills: ["waiter"],
        distanceKm: 6,
        isAvailable: true,
        isCompliant: true,
      });

      // Seminyak to Canggu ~6km -> distance score: 20
      expect(breakdown.breakdown.distanceScore).toBe(20);
      expect(breakdown.breakdown.skillScore).toBe(30);
      expect(breakdown.matchingScore).toBeGreaterThan(90);
    });

    it("should penalize long distance from worker to job", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 45,
        isAvailable: true,
        isCompliant: true,
      });

      // >20km = 0 distance score
      expect(breakdown.breakdown.distanceScore).toBe(0);
    });

    it("should handle worker very close to job location", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 1.2,
        isAvailable: true,
        isCompliant: true,
      });

      // <=5km = 30 distance score
      expect(breakdown.breakdown.distanceScore).toBe(30);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero rating (new worker)", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 0,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: 0,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.ratingScore).toBe(0);
      // Still can get points from other factors
      expect(breakdown.matchingScore).toBeGreaterThan(0);
    });

    it("should handle very large distance values", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 5.0,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 10000,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.distanceScore).toBe(0);
      expect(breakdown.distanceKm).toBe(10000);
    });

    it("should handle negative distance (should not happen but verify behavior)", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.8,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        distanceKm: -1,
        isAvailable: true,
        isCompliant: true,
      });

      // Negative distance should be treated as <= 5km -> 30 points
      expect(breakdown.breakdown.distanceScore).toBe(30);
    });

    it("should handle all workers with different tier combinations", () => {
      const tiers: Array<"classic" | "pro" | "champion"> = ["classic", "pro", "champion"];
      const tierBonuses = { classic: 5, pro: 10, champion: 20 };

      tiers.forEach((tier) => {
        const breakdown = getMatchingScoreBreakdownWithDistance({
          workerSkills: ["housekeeping"],
          workerRating: 4.8,
          workerTier: tier,
          jobSkills: ["housekeeping"],
          distanceKm: 0,
          isAvailable: true,
          isCompliant: true,
        });

        expect(breakdown.breakdown.tierBonus).toBe(tierBonuses[tier]);
        expect(breakdown.matchingScore).toBeGreaterThan(breakdown.breakdown.tierBonus);
      });
    });
  });
});
