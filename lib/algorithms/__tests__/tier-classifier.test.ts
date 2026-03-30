// @ts-nocheck
/**
 * Tier Classifier Unit Tests
 *
 * Tests the 4-tier worker classification system:
 * - CLASSIC: 0-19 jobs, <4.0 rating (default)
 * - PRO: 20-99 jobs, 4.0+ rating, 90%+ punctuality
 * - ELITE: 100-299 jobs, 4.6+ rating, 95%+ punctuality
 * - CHAMPION: 300+ jobs, 4.8+ rating, 98%+ punctuality
 */

import { describe, it, expect } from "vitest";
import {
  classifyWorkerTier,
  getTierRank,
  getTierBonus,
  getTierLabel,
  getTierDescription,
  canUpgradeTier,
  canDowngradeTier,
} from "../tier-classifier";
import type { WorkerTier } from "@/lib/supabase/types";

describe("Tier Classifier", () => {
  describe("classifyWorkerTier", () => {
    describe("Champion Tier (Highest)", () => {
      it("should classify as champion when all criteria met", () => {
        const tier = classifyWorkerTier(300, 4.9, 99);
        expect(tier).toBe("champion");
      });

      it("should classify as champion at minimum threshold", () => {
        const tier = classifyWorkerTier(300, 4.8, 98);
        expect(tier).toBe("champion");
      });

      it("should NOT classify as champion with 299 jobs", () => {
        const tier = classifyWorkerTier(299, 4.9, 99);
        expect(tier).not.toBe("champion");
        expect(tier).toBe("elite");
      });

      it("should NOT classify as champion with 4.7 rating", () => {
        const tier = classifyWorkerTier(300, 4.7, 99);
        expect(tier).not.toBe("champion");
        expect(tier).toBe("elite");
      });

      it("should NOT classify as champion with 97% punctuality", () => {
        const tier = classifyWorkerTier(300, 4.9, 97);
        expect(tier).not.toBe("champion");
        expect(tier).toBe("elite");
      });

      it("should classify champion even with 1000+ jobs", () => {
        const tier = classifyWorkerTier(1000, 4.9, 99);
        expect(tier).toBe("champion");
      });
    });

    describe("Elite Tier", () => {
      it("should classify as elite when all criteria met", () => {
        const tier = classifyWorkerTier(100, 4.7, 96);
        expect(tier).toBe("elite");
      });

      it("should classify as elite at minimum threshold", () => {
        const tier = classifyWorkerTier(100, 4.6, 95);
        expect(tier).toBe("elite");
      });

      it("should NOT classify as elite with 99 jobs", () => {
        const tier = classifyWorkerTier(99, 4.7, 96);
        expect(tier).not.toBe("elite");
        expect(tier).toBe("pro");
      });

      it("should NOT classify as elite with 4.5 rating", () => {
        const tier = classifyWorkerTier(100, 4.5, 96);
        expect(tier).not.toBe("elite");
        expect(tier).toBe("pro");
      });

      it("should NOT classify as elite with 94% punctuality", () => {
        const tier = classifyWorkerTier(100, 4.7, 94);
        expect(tier).not.toBe("elite");
        expect(tier).toBe("pro");
      });

      it("should upgrade to champion when criteria met", () => {
        // Elite worker improves to champion
        const tier = classifyWorkerTier(300, 4.8, 98);
        expect(tier).toBe("champion");
      });
    });

    describe("Pro Tier", () => {
      it("should classify as pro when all criteria met", () => {
        const tier = classifyWorkerTier(20, 4.2, 92);
        expect(tier).toBe("pro");
      });

      it("should classify as pro at minimum threshold", () => {
        const tier = classifyWorkerTier(20, 4.0, 90);
        expect(tier).toBe("pro");
      });

      it("should NOT classify as pro with 19 jobs", () => {
        const tier = classifyWorkerTier(19, 4.2, 92);
        expect(tier).not.toBe("pro");
        expect(tier).toBe("classic");
      });

      it("should NOT classify as pro with 3.9 rating", () => {
        const tier = classifyWorkerTier(20, 3.9, 92);
        expect(tier).not.toBe("pro");
        expect(tier).toBe("classic");
      });

      it("should NOT classify as pro with 89% punctuality", () => {
        const tier = classifyWorkerTier(20, 4.2, 89);
        expect(tier).not.toBe("pro");
        expect(tier).toBe("classic");
      });

      it("should classify pro with 50 jobs but just meeting thresholds", () => {
        const tier = classifyWorkerTier(50, 4.0, 90);
        expect(tier).toBe("pro");
      });
    });

    describe("Classic Tier (Default)", () => {
      it("should classify as classic for new workers (0 jobs)", () => {
        const tier = classifyWorkerTier(0, 0, 0);
        expect(tier).toBe("classic");
      });

      it("should classify as classic with low rating", () => {
        const tier = classifyWorkerTier(50, 3.5, 80);
        expect(tier).toBe("classic");
      });

      it("should classify as classic with low punctuality", () => {
        const tier = classifyWorkerTier(50, 4.5, 70);
        expect(tier).toBe("classic");
      });

      it("should handle null rating", () => {
        const tier = classifyWorkerTier(10, null, 85);
        expect(tier).toBe("classic");
      });

      it("should handle undefined punctuality", () => {
        const tier = classifyWorkerTier(10, 4.0, undefined);
        expect(tier).toBe("classic");
      });

      it("should handle both null/undefined", () => {
        const tier = classifyWorkerTier(5, null, undefined);
        expect(tier).toBe("classic");
      });

      it("should classify classic for worker with 10 jobs and good rating", () => {
        // Not enough jobs yet
        const tier = classifyWorkerTier(10, 4.5, 95);
        expect(tier).toBe("classic");
      });
    });

    describe("Edge Cases", () => {
      it("should handle zero values", () => {
        const tier = classifyWorkerTier(0, 0, 0);
        expect(tier).toBe("classic");
      });

      it("should handle very high values", () => {
        const tier = classifyWorkerTier(10000, 5.0, 100);
        expect(tier).toBe("champion");
      });

      it("should handle decimal ratings correctly", () => {
        const tier = classifyWorkerTier(100, 4.59, 95);
        expect(tier).toBe("pro"); // 4.59 < 4.6
      });

      it("should handle decimal punctuality correctly", () => {
        const tier = classifyWorkerTier(100, 4.6, 94.9);
        expect(tier).toBe("pro"); // 94.9 < 95
      });
    });
  });

  describe("getTierRank", () => {
    it("should return 0 for champion (highest priority)", () => {
      expect(getTierRank("champion")).toBe(0);
    });

    it("should return 1 for elite", () => {
      expect(getTierRank("elite")).toBe(1);
    });

    it("should return 2 for pro", () => {
      expect(getTierRank("pro")).toBe(2);
    });

    it("should return 3 for classic (lowest priority)", () => {
      expect(getTierRank("classic")).toBe(3);
    });

    it("should allow sorting by tier rank", () => {
      const tiers: WorkerTier[] = ["classic", "champion", "pro", "elite"];
      const sorted = tiers.sort((a, b) => getTierRank(a) - getTierRank(b));
      expect(sorted).toEqual(["champion", "elite", "pro", "classic"]);
    });
  });

  describe("getTierBonus", () => {
    it("should return 20 for champion", () => {
      expect(getTierBonus("champion")).toBe(20);
    });

    it("should return 15 for elite", () => {
      expect(getTierBonus("elite")).toBe(15);
    });

    it("should return 10 for pro", () => {
      expect(getTierBonus("pro")).toBe(10);
    });

    it("should return 5 for classic", () => {
      expect(getTierBonus("classic")).toBe(5);
    });

    it("should have increasing bonus for higher tiers", () => {
      expect(getTierBonus("champion")).toBeGreaterThan(getTierBonus("elite"));
      expect(getTierBonus("elite")).toBeGreaterThan(getTierBonus("pro"));
      expect(getTierBonus("pro")).toBeGreaterThan(getTierBonus("classic"));
    });
  });

  describe("getTierLabel", () => {
    it("should return Champion label", () => {
      expect(getTierLabel("champion")).toBe("Champion");
    });

    it("should return Elite label", () => {
      expect(getTierLabel("elite")).toBe("Elite");
    });

    it("should return Pro label", () => {
      expect(getTierLabel("pro")).toBe("Pro");
    });

    it("should return Classic label", () => {
      expect(getTierLabel("classic")).toBe("Classic");
    });
  });

  describe("getTierDescription", () => {
    it("should return description for champion", () => {
      const desc = getTierDescription("champion");
      expect(desc).toContain("300+");
      expect(desc).toContain("4.8+");
    });

    it("should return description for elite", () => {
      const desc = getTierDescription("elite");
      expect(desc).toContain("100+");
      expect(desc).toContain("4.6+");
    });

    it("should return description for pro", () => {
      const desc = getTierDescription("pro");
      expect(desc).toContain("20+");
      expect(desc).toContain("4.0+");
    });

    it("should return description for classic", () => {
      const desc = getTierDescription("classic");
      expect(desc).toBeDefined();
    });
  });

  describe("canUpgradeTier", () => {
    it("should return true when upgrade is possible", () => {
      // Classic worker meets Pro requirements
      const canUpgrade = canUpgradeTier("classic", 20, 4.0, 90);
      expect(canUpgrade).toBe(true);
    });

    it("should return false when already at highest tier", () => {
      const canUpgrade = canUpgradeTier("champion", 500, 5.0, 100);
      expect(canUpgrade).toBe(false);
    });

    it("should return false when requirements not met", () => {
      const canUpgrade = canUpgradeTier("classic", 10, 3.5, 80);
      expect(canUpgrade).toBe(false);
    });
  });

  describe("canDowngradeTier", () => {
    it("should return true when downgrade is possible", () => {
      // Pro worker's rating drops
      const canDowngrade = canDowngradeTier("pro", 25, 3.5, 85);
      expect(canDowngrade).toBe(true);
    });

    it("should return false when still meeting requirements", () => {
      const canDowngrade = canDowngradeTier("pro", 25, 4.5, 95);
      expect(canDowngrade).toBe(false);
    });

    it("should return false for classic (already lowest)", () => {
      const canDowngrade = canDowngradeTier("classic", 0, 0, 0);
      expect(canDowngrade).toBe(false);
    });
  });
});
