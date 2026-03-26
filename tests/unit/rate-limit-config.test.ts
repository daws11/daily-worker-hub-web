/**
 * Rate Limit Configuration Unit Tests
 *
 * Tests environment-aware rate limit configuration:
 * - Environment detection (development/staging/production)
 * - Environment-specific multipliers
 * - Environment variable overrides
 * - Rate limit config values per environment
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the auth dependencies
vi.mock("@/lib/auth/get-server-session", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

describe("Rate Limit Configuration", () => {
  // Store original env
  const originalEnv = process.env.NODE_ENV;
  const originalRateLimitEnvVars: Record<string, string | undefined> = {};

  const rateLimitEnvVars = [
    "RATE_LIMIT_AUTH_MAX_REQUESTS",
    "RATE_LIMIT_AUTH_WINDOW_MS",
    "RATE_LIMIT_API_AUTHENTICATED_MAX_REQUESTS",
    "RATE_LIMIT_API_AUTHENTICATED_WINDOW_MS",
    "RATE_LIMIT_API_PUBLIC_MAX_REQUESTS",
    "RATE_LIMIT_API_PUBLIC_WINDOW_MS",
    "RATE_LIMIT_PAYMENT_MAX_REQUESTS",
    "RATE_LIMIT_PAYMENT_WINDOW_MS",
  ];

  beforeEach(() => {
    // Save original env vars
    rateLimitEnvVars.forEach((key) => {
      originalRateLimitEnvVars[key] = process.env[key];
      delete process.env[key];
    });
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env vars
    rateLimitEnvVars.forEach((key) => {
      if (originalRateLimitEnvVars[key] !== undefined) {
        process.env[key] = originalRateLimitEnvVars[key];
      } else {
        delete process.env[key];
      }
    });
    process.env.NODE_ENV = originalEnv;
  });

  describe("Environment Detection", () => {
    it("should detect production environment", async () => {
      process.env.NODE_ENV = "production";
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();
      expect(result.environment).toBe("production");
    });

    it("should detect staging environment", async () => {
      process.env.NODE_ENV = "staging";
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();
      expect(result.environment).toBe("staging");
    });

    it("should detect development environment by default", async () => {
      process.env.NODE_ENV = undefined;
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();
      expect(result.environment).toBe("development");
    });

    it("should treat unknown environments as development", async () => {
      process.env.NODE_ENV = "test";
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();
      expect(result.environment).toBe("development");
    });
  });

  describe("Environment Multipliers", () => {
    it("should apply multiplier of 1 for production", async () => {
      process.env.NODE_ENV = "production";
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();
      expect(result.multiplier).toBe(1);
    });

    it("should apply multiplier of 2 for staging", async () => {
      process.env.NODE_ENV = "staging";
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();
      expect(result.multiplier).toBe(2);
    });

    it("should apply multiplier of 5 for development", async () => {
      process.env.NODE_ENV = "development";
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();
      expect(result.multiplier).toBe(5);
    });
  });

  describe("Base Rate Limit Configurations", () => {
    it("should have auth type with 5 requests per minute (production)", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(5);
      expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBe(60000);
      expect(RATE_LIMIT_CONFIGS.auth.type).toBe("auth");
    });

    it("should have api-authenticated type with 100 requests per minute (production)", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].maxRequests).toBe(100);
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].windowMs).toBe(60000);
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].type).toBe("api-authenticated");
    });

    it("should have api-public type with 30 requests per minute (production)", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS["api-public"].maxRequests).toBe(30);
      expect(RATE_LIMIT_CONFIGS["api-public"].windowMs).toBe(60000);
      expect(RATE_LIMIT_CONFIGS["api-public"].type).toBe("api-public");
    });

    it("should have payment type with 10 requests per minute (production)", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.payment.maxRequests).toBe(10);
      expect(RATE_LIMIT_CONFIGS.payment.windowMs).toBe(60000);
      expect(RATE_LIMIT_CONFIGS.payment.type).toBe("payment");
    });
  });

  describe("Environment Multiplier Effects", () => {
    it("should apply 2x multiplier for staging", async () => {
      process.env.NODE_ENV = "staging";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      // Base: auth=5, api-auth=100, api-public=30, payment=10
      // Staging (2x): auth=10, api-auth=200, api-public=60, payment=20
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(10);
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].maxRequests).toBe(200);
      expect(RATE_LIMIT_CONFIGS["api-public"].maxRequests).toBe(60);
      expect(RATE_LIMIT_CONFIGS.payment.maxRequests).toBe(20);
    });

    it("should apply 5x multiplier for development", async () => {
      process.env.NODE_ENV = "development";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      // Base: auth=5, api-auth=100, api-public=30, payment=10
      // Development (5x): auth=25, api-auth=500, api-public=150, payment=50
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(25);
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].maxRequests).toBe(500);
      expect(RATE_LIMIT_CONFIGS["api-public"].maxRequests).toBe(150);
      expect(RATE_LIMIT_CONFIGS.payment.maxRequests).toBe(50);
    });

    it("should maintain windowMs regardless of multiplier", async () => {
      process.env.NODE_ENV = "development";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      // Window should always be 60 seconds (60000ms)
      expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBe(60000);
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].windowMs).toBe(60000);
      expect(RATE_LIMIT_CONFIGS["api-public"].windowMs).toBe(60000);
      expect(RATE_LIMIT_CONFIGS.payment.windowMs).toBe(60000);
    });
  });

  describe("Environment Variable Overrides", () => {
    it("should override auth max requests via RATE_LIMIT_AUTH_MAX_REQUESTS", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = "20";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(20);
    });

    it("should override auth window via RATE_LIMIT_AUTH_WINDOW_MS", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_AUTH_WINDOW_MS = "120000";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBe(120000);
    });

    it("should override api-authenticated max requests via RATE_LIMIT_API_AUTHENTICATED_MAX_REQUESTS", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_API_AUTHENTICATED_MAX_REQUESTS = "500";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].maxRequests).toBe(500);
    });

    it("should override api-authenticated window via RATE_LIMIT_API_AUTHENTICATED_WINDOW_MS", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_API_AUTHENTICATED_WINDOW_MS = "300000";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].windowMs).toBe(300000);
    });

    it("should override api-public max requests via RATE_LIMIT_API_PUBLIC_MAX_REQUESTS", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_API_PUBLIC_MAX_REQUESTS = "100";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS["api-public"].maxRequests).toBe(100);
    });

    it("should override api-public window via RATE_LIMIT_API_PUBLIC_WINDOW_MS", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_API_PUBLIC_WINDOW_MS = "180000";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS["api-public"].windowMs).toBe(180000);
    });

    it("should override payment max requests via RATE_LIMIT_PAYMENT_MAX_REQUESTS", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_PAYMENT_MAX_REQUESTS = "50";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.payment.maxRequests).toBe(50);
    });

    it("should override payment window via RATE_LIMIT_PAYMENT_WINDOW_MS", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_PAYMENT_WINDOW_MS = "240000";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.payment.windowMs).toBe(240000);
    });

    it("should allow overriding max requests without affecting windowMs", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = "100";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(100);
      expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBe(60000); // Unchanged
    });

    it("should allow overriding windowMs without affecting maxRequests", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_AUTH_WINDOW_MS = "300000";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(5); // Unchanged
      expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBe(300000);
    });
  });

  describe("Override Priority Over Multipliers", () => {
    it("should prioritize env var overrides over multipliers", async () => {
      process.env.NODE_ENV = "development"; // 5x multiplier
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = "3"; // Override to lower value
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      // Without override: 5 * 5 = 25
      // With override: 3 (env var takes precedence)
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(3);
    });

    it("should prioritize env var overrides in staging", async () => {
      process.env.NODE_ENV = "staging"; // 2x multiplier
      process.env.RATE_LIMIT_API_PUBLIC_MAX_REQUESTS = "10";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      // Without override: 30 * 2 = 60
      // With override: 10
      expect(RATE_LIMIT_CONFIGS["api-public"].maxRequests).toBe(10);
    });
  });

  describe("RateLimitConfig Interface", () => {
    it("should export RateLimitConfig interface through getRateLimitEnvironment", async () => {
      process.env.NODE_ENV = "production";
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();

      expect(result.configs).toBeDefined();
      expect(result.configs.auth).toHaveProperty("maxRequests");
      expect(result.configs.auth).toHaveProperty("windowMs");
      expect(result.configs.auth).toHaveProperty("type");
      expect(result.configs.auth).toHaveProperty("message");
    });

    it("should have Indonesian error messages", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.auth.message).toContain("Terlalu banyak");
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].message).toContain("Terlalu banyak");
      expect(RATE_LIMIT_CONFIGS["api-public"].message).toContain("Terlalu banyak");
      expect(RATE_LIMIT_CONFIGS.payment.message).toContain("Terlalu banyak");
    });
  });

  describe("RateLimitType Support", () => {
    it("should support auth rate limit type", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.auth).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.auth.type).toBe("auth");
    });

    it("should support api-authenticated rate limit type", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS["api-authenticated"]).toBeDefined();
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].type).toBe("api-authenticated");
    });

    it("should support api-public rate limit type", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS["api-public"]).toBeDefined();
      expect(RATE_LIMIT_CONFIGS["api-public"].type).toBe("api-public");
    });

    it("should support payment rate limit type", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.payment).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.payment.type).toBe("payment");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string env var as invalid", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = "";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      // Empty string should not override (parseInt returns NaN which is falsy)
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(5);
    });

    it("should handle non-numeric env var with NaN value", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = "abc";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      // parseInt("abc") returns NaN, which is a valid value (not undefined)
      // So NaN is used instead of falling back to base value
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBeNaN();
    });

    it("should handle negative number env var (no sanitization)", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = "-5";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      // Negative numbers are not sanitized; override takes precedence
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(-5);
    });

    it("should handle very large number env var", async () => {
      process.env.NODE_ENV = "production";
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = "999999";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(999999);
    });
  });

  describe("Configuration Consistency", () => {
    it("should have consistent configs between RATE_LIMIT_CONFIGS and getRateLimitEnvironment", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS, getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const envInfo = getRateLimitEnvironment();

      expect(envInfo.configs).toEqual(RATE_LIMIT_CONFIGS);
    });

    it("should always have all four rate limit types configured", async () => {
      process.env.NODE_ENV = "production";
      const { RATE_LIMIT_CONFIGS } = await import("@/lib/rate-limit");

      const types = ["auth", "api-authenticated", "api-public", "payment"] as const;
      types.forEach((type) => {
        expect(RATE_LIMIT_CONFIGS[type]).toBeDefined();
        expect(RATE_LIMIT_CONFIGS[type].type).toBe(type);
      });
    });

    it("should maintain multiplier consistency with environment", async () => {
      process.env.NODE_ENV = "staging";
      const { getRateLimitEnvironment } = await import("@/lib/rate-limit");
      const result = getRateLimitEnvironment();

      const expectedMultipliers = {
        development: 5,
        staging: 2,
        production: 1,
      };

      expect(result.multiplier).toBe(expectedMultipliers[result.environment]);
    });
  });
});
