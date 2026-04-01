// @ts-nocheck – pre-existing TypeScript type mismatches in matching score tests
/**
 * Matching Score Algorithm Unit Tests
 *
 * Tests the 5-point matching algorithm:
 * 1. Skill Compatibility (30 points)
 * 2. Distance/Location (30 points)
 * 3. Availability (20 points)
 * 4. Rating & Reliability (15 points)
 * 5. Compliance (5 points)
 * + Tier Bonus (5-20 points)
 * Total: 115 max
 */

import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistance,
  calculateSkillScore,
  calculateDistanceScore,
  calculateRatingScore,
  calculateAvailabilityScore,
  calculateComplianceScore,
  calculateMatchingScore,
  getMatchingScoreBreakdown,
  calculateMatchingScoreWithDistance,
  getMatchingScoreBreakdownWithDistance,
  getMatchQuality,
} from "../matching-score";
import type { WorkerTier } from "@/lib/supabase/types";

describe("Matching Score Algorithm", () => {
  describe("calculateHaversineDistance", () => {
    it("should calculate distance between Denpasar and Ubud correctly (~16.7km)", () => {
      const distance = calculateHaversineDistance(
        -8.65,
        115.2167, // Denpasar
        -8.5069,
        115.2625, // Ubud
      );
      expect(distance).toBeGreaterThan(15);
      expect(distance).toBeLessThan(20);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateHaversineDistance(
        -8.65,
        115.2167,
        -8.65,
        115.2167,
      );
      expect(distance).toBe(0);
    });

    it("should calculate distance from Bali to Jakarta (~1000km)", () => {
      const distance = calculateHaversineDistance(
        -8.65,
        115.2167, // Bali
        -6.2088,
        106.8456, // Jakarta
      );
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1100);
    });

    it("should handle negative coordinates (Western hemisphere)", () => {
      // New York
      const distance = calculateHaversineDistance(
        40.7128,
        -74.006,
        34.0522,
        -118.2437, // LA
      );
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it("should be symmetric (A to B = B to A)", () => {
      const distance1 = calculateHaversineDistance(
        -8.65,
        115.22,
        -8.51,
        115.26,
      );
      const distance2 = calculateHaversineDistance(
        -8.51,
        115.26,
        -8.65,
        115.22,
      );
      expect(distance1).toBeCloseTo(distance2, 5);
    });

    it("should handle small distances accurately", () => {
      // Within same city (< 1km)
      const distance = calculateHaversineDistance(
        -8.65,
        115.2167,
        -8.651,
        115.2177,
      );
      expect(distance).toBeLessThan(1);
    });
  });

  describe("calculateSkillScore", () => {
    it("should return 30 when job requires no skills", () => {
      const score = calculateSkillScore(["skill1", "skill2"], []);
      expect(score).toBe(30);
    });

    it("should return 0 when worker has no skills but job requires skills", () => {
      const score = calculateSkillScore([], ["skill1", "skill2"]);
      expect(score).toBe(0);
    });

    it("should return 30 for exact match (all skills matched)", () => {
      const score = calculateSkillScore(
        ["housekeeping", "cleaning"],
        ["housekeeping", "cleaning"],
      );
      expect(score).toBe(30);
    });

    it("should return 30 for more skills than required", () => {
      const score = calculateSkillScore(
        ["housekeeping", "cleaning", "laundry"],
        ["housekeeping", "cleaning"],
      );
      expect(score).toBe(30);
    });

    it("should return 15 for partial match (>=50%)", () => {
      const score = calculateSkillScore(
        ["skill1", "skill2"],
        ["skill1", "skill2", "skill3", "skill4"],
      );
      // 2/4 = 50% -> 15 points
      expect(score).toBe(15);
    });

    it("should return 0 for poor match (<50%)", () => {
      const score = calculateSkillScore(
        ["skill1"],
        ["skill1", "skill2", "skill3", "skill4"],
      );
      // 1/4 = 25% -> 0 points
      expect(score).toBe(0);
    });

    it("should handle single skill match", () => {
      const score = calculateSkillScore(["housekeeping"], ["housekeeping"]);
      expect(score).toBe(30);
    });

    it("should handle single skill mismatch", () => {
      const score = calculateSkillScore(["cleaning"], ["housekeeping"]);
      expect(score).toBe(0);
    });
  });

  describe("calculateDistanceScore", () => {
    it("should return 30 for distance <= 5km", () => {
      expect(calculateDistanceScore(0)).toBe(30);
      expect(calculateDistanceScore(2.5)).toBe(30);
      expect(calculateDistanceScore(5)).toBe(30);
    });

    it("should return 20 for distance 5-10km", () => {
      expect(calculateDistanceScore(5.1)).toBe(20);
      expect(calculateDistanceScore(7.5)).toBe(20);
      expect(calculateDistanceScore(10)).toBe(20);
    });

    it("should return 10 for distance 10-20km", () => {
      expect(calculateDistanceScore(10.1)).toBe(10);
      expect(calculateDistanceScore(15)).toBe(10);
      expect(calculateDistanceScore(20)).toBe(10);
    });

    it("should return 0 for distance > 20km", () => {
      expect(calculateDistanceScore(20.1)).toBe(0);
      expect(calculateDistanceScore(25)).toBe(0);
      expect(calculateDistanceScore(100)).toBe(0);
    });
  });

  describe("calculateRatingScore", () => {
    it("should return 15 for rating >= 4.8", () => {
      expect(calculateRatingScore(4.8)).toBe(15);
      expect(calculateRatingScore(4.9)).toBe(15);
      expect(calculateRatingScore(5.0)).toBe(15);
    });

    it("should return 12 for rating 4.5-4.7", () => {
      expect(calculateRatingScore(4.5)).toBe(12);
      expect(calculateRatingScore(4.6)).toBe(12);
      expect(calculateRatingScore(4.7)).toBe(12);
    });

    it("should return 8 for rating 4.0-4.4", () => {
      expect(calculateRatingScore(4.0)).toBe(8);
      expect(calculateRatingScore(4.2)).toBe(8);
      expect(calculateRatingScore(4.4)).toBe(8);
    });

    it("should return 0 for rating < 4.0", () => {
      expect(calculateRatingScore(3.9)).toBe(0);
      expect(calculateRatingScore(3.5)).toBe(0);
      expect(calculateRatingScore(0)).toBe(0);
    });

    it("should handle null rating", () => {
      expect(calculateRatingScore(null)).toBe(0);
    });
  });

  describe("calculateAvailabilityScore", () => {
    it("should return 20 for full availability", () => {
      expect(calculateAvailabilityScore(true)).toBe(20);
    });

    it("should return 10 for partial availability", () => {
      expect(calculateAvailabilityScore(false, true)).toBe(10);
    });

    it("should return 0 for no availability", () => {
      expect(calculateAvailabilityScore(false)).toBe(0);
    });
  });

  describe("calculateComplianceScore", () => {
    it("should return 5 for compliant worker", () => {
      expect(calculateComplianceScore(true)).toBe(5);
    });

    it("should return 0 for non-compliant worker", () => {
      expect(calculateComplianceScore(false)).toBe(0);
    });
  });

  describe("calculateMatchingScore", () => {
    it("should calculate total score with all components", () => {
      const score = calculateMatchingScore({
        workerSkills: ["housekeeping", "cleaning"],
        workerLat: -8.65,
        workerLng: 115.22,
        workerRating: 4.8,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        jobLat: -8.66,
        jobLng: 115.23,
        isAvailable: true,
        isCompliant: true,
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(115);
    });

    it("should include tier bonus for champion", () => {
      const score = calculateMatchingScore({
        workerSkills: ["housekeeping"],
        workerLat: -8.65,
        workerLng: 115.22,
        workerRating: 4.9,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        jobLat: -8.65,
        jobLng: 115.22,
        isAvailable: true,
        isCompliant: true,
      });

      // Skill: 30 + Distance: 30 + Rating: 15 + Availability: 20 + Compliance: 5 + Tier: 20 = 120, capped at 115
      expect(score).toBe(115);
    });

    it("should return low score for poor match", () => {
      const score = calculateMatchingScore({
        workerSkills: [],
        workerLat: -8.65,
        workerLng: 115.22,
        workerRating: 3.0,
        workerTier: "classic",
        jobSkills: ["housekeeping", "cleaning"],
        jobLat: -8.5,
        jobLng: 115.5,
        isAvailable: false,
        isCompliant: false,
      });

      expect(score).toBeLessThan(30);
    });

    it("should handle null rating", () => {
      const score = calculateMatchingScore({
        workerSkills: ["housekeeping"],
        workerLat: -8.65,
        workerLng: 115.22,
        workerRating: null,
        workerTier: "classic",
        jobSkills: ["housekeeping"],
        jobLat: -8.65,
        jobLng: 115.22,
        isAvailable: true,
        isCompliant: true,
      });

      expect(score).toBeDefined();
    });

    it("should cap score at 115", () => {
      const score = calculateMatchingScore({
        workerSkills: ["housekeeping", "cleaning", "laundry"],
        workerLat: -8.65,
        workerLng: 115.22,
        workerRating: 5.0,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        jobLat: -8.65,
        jobLng: 115.22,
        isAvailable: true,
        isCompliant: true,
      } as any);

      expect(score).toBeLessThanOrEqual(115);
    });
  });

  describe("getMatchingScoreBreakdown", () => {
    it("should return detailed breakdown", () => {
      const breakdown = getMatchingScoreBreakdown({
        workerSkills: ["housekeeping"],
        workerLat: -8.65,
        workerLng: 115.22,
        workerRating: 4.8,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        jobLat: -8.65,
        jobLng: 115.22,
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

    it("should calculate correct distance", () => {
      const breakdown = getMatchingScoreBreakdown({
        workerSkills: ["housekeeping"],
        workerLat: -8.65,
        workerLng: 115.22,
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        jobLat: -8.51,
        jobLng: 115.26, // ~22km away
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.distanceKm).toBeGreaterThan(15);
      expect(breakdown.distanceKm).toBeLessThan(30);
    });
  });

  describe("calculateMatchingScoreWithDistance", () => {
    it("should return same score as calculateMatchingScore for equivalent params", () => {
      const withDistance = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping", "cleaning"],
        workerRating: 4.8,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        distanceKm: 1.5,
        isAvailable: true,
        isCompliant: true,
      });

      const withoutDistance = calculateMatchingScore({
        workerSkills: ["housekeeping", "cleaning"],
        workerLat: -8.65,
        workerLng: 115.22,
        workerRating: 4.8,
        workerTier: "champion",
        jobSkills: ["housekeeping"],
        jobLat: -8.651,
        jobLng: 115.225,
        isAvailable: true,
        isCompliant: true,
      });

      expect(withDistance).toBe(withoutDistance);
    });

    it("should cap score at 115", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: ["housekeeping"],
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

    it("should return low score for poor match with distance", () => {
      const score = calculateMatchingScoreWithDistance({
        workerSkills: [],
        workerRating: 3.0,
        workerTier: "classic",
        jobSkills: ["housekeeping", "cleaning"],
        distanceKm: 25,
        isAvailable: false,
        isCompliant: false,
      });

      expect(score).toBeLessThan(30);
    });
  });

  describe("getMatchingScoreBreakdownWithDistance", () => {
    it("should return detailed breakdown with precomputed distance", () => {
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

    it("should reflect exact precomputed distance in breakdown", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 7.5,
        isAvailable: true,
        isCompliant: true,
      });

      // 7.5km falls in 5-10km band -> 20 points
      expect(breakdown.breakdown.distanceScore).toBe(20);
      expect(breakdown.distanceKm).toBe(7.5);
    });

    it("should match calculateMatchingScoreWithDistance total", () => {
      const params = {
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

    it("should return zero distance score for far distance", () => {
      const breakdown = getMatchingScoreBreakdownWithDistance({
        workerSkills: ["housekeeping"],
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        distanceKm: 50,
        isAvailable: true,
        isCompliant: true,
      });

      expect(breakdown.breakdown.distanceScore).toBe(0);
      expect(breakdown.distanceKm).toBe(50);
    });
  });

  describe("getMatchQuality", () => {
    it("should return Perfect Match for score >= 100", () => {
      const quality = getMatchQuality(100);
      expect(quality.label).toBe("Perfect Match");
      expect(quality.color).toBe("text-green-600");
    });

    it("should return Great Match for score 85-99", () => {
      const quality = getMatchQuality(90);
      expect(quality.label).toBe("Great Match");
      expect(quality.color).toBe("text-blue-600");
    });

    it("should return Good Match for score 70-84", () => {
      const quality = getMatchQuality(75);
      expect(quality.label).toBe("Good Match");
      expect(quality.color).toBe("text-cyan-600");
    });

    it("should return Fair Match for score 55-69", () => {
      const quality = getMatchQuality(60);
      expect(quality.label).toBe("Fair Match");
      expect(quality.color).toBe("text-yellow-600");
    });

    it("should return Poor Match for score < 55", () => {
      const quality = getMatchQuality(40);
      expect(quality.label).toBe("Poor Match");
      expect(quality.color).toBe("text-red-600");
    });
  });

  describe("Realistic Bali Scenarios", () => {
    it("should match worker in Denpasar with job in Kuta", () => {
      const breakdown = getMatchingScoreBreakdown({
        workerSkills: ["housekeeping", "front-desk"],
        workerLat: -8.65,
        workerLng: 115.22, // Denpasar
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        jobLat: -8.72,
        jobLng: 115.17, // Kuta
        isAvailable: true,
        isCompliant: true,
      });

      // Distance ~10km
      expect(breakdown.breakdown.distanceScore).toBe(20);
      expect(breakdown.breakdown.skillScore).toBe(30);
      expect(breakdown.matchingScore).toBeGreaterThan(70);
    });

    it("should match worker in Ubud with job in Ubud (same area)", () => {
      const breakdown = getMatchingScoreBreakdown({
        workerSkills: ["cooking", "waiter"],
        workerLat: -8.51,
        workerLng: 115.26,
        workerRating: 4.9,
        workerTier: "champion",
        jobSkills: ["waiter"],
        jobLat: -8.51,
        jobLng: 115.27,
        isAvailable: true,
        isCompliant: true,
      });

      // Very close distance, excellent worker
      expect(breakdown.breakdown.distanceScore).toBe(30);
      expect(breakdown.matchingScore).toBeGreaterThan(90);
    });

    it("should penalize far distance (Denpasar to Lovina)", () => {
      const breakdown = getMatchingScoreBreakdown({
        workerSkills: ["housekeeping"],
        workerLat: -8.65,
        workerLng: 115.22, // Denpasar
        workerRating: 4.5,
        workerTier: "pro",
        jobSkills: ["housekeeping"],
        jobLat: -8.15,
        jobLng: 115.03, // Lovina (~70km)
        isAvailable: true,
        isCompliant: true,
      });

      // Distance > 20km
      expect(breakdown.breakdown.distanceScore).toBe(0);
    });
  });
});
