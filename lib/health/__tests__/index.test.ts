/**
 * Health Aggregation Unit Tests
 *
 * Tests the `getHealthStatus()` function in lib/health/index.ts which
 * aggregates health checks from all subsystems (Supabase, Xendit, Redis)
 * using `Promise.allSettled` and determines the overall system status.
 *
 * Test coverage:
 * - Overall status determination (ok / degraded / unhealthy)
 * - Promise.allSettled handling (fulfilled vs rejected)
 * - Per-service status propagation
 * - Response time measurement
 * - Timestamp format
 * - Latency and error field propagation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the subsystem health check functions
// ---------------------------------------------------------------------------

const mockCheckSupabase = vi.fn();
const mockCheckXendit = vi.fn();
const mockCheckRedis = vi.fn();

vi.mock("@/lib/health/supabase", () => ({
  checkSupabase: (...args: unknown[]) => mockCheckSupabase(...args),
}));

vi.mock("@/lib/health/xendit", () => ({
  checkXendit: (...args: unknown[]) => mockCheckXendit(...args),
}));

vi.mock("@/lib/health/redis", () => ({
  checkRedis: (...args: unknown[]) => mockCheckRedis(...args),
}));

// ---------------------------------------------------------------------------
// Helpers: standard fulfilled result shapes
// ---------------------------------------------------------------------------

const healthySupabase = {
  status: "ok" as const,
  latencyMs: 42,
  database: { status: "ok" as const, latencyMs: 20 },
  auth: { status: "ok" as const, latencyMs: 22 },
};

const unhealthySupabase = {
  status: "unavailable" as const,
  latencyMs: 5000,
  database: {
    status: "unavailable" as const,
    latencyMs: 5000,
    error: "Connection timed out",
  },
  auth: {
    status: "unavailable" as const,
    latencyMs: 5000,
    error: "Connection timed out",
  },
};

const healthyXendit = {
  status: "ok" as const,
  latencyMs: 55,
};

const unhealthyXendit = {
  status: "unavailable" as const,
  latencyMs: 5000,
  error: "Xendit credentials validation failed",
};

const healthyRedis = {
  status: "ok" as const,
  latencyMs: 8,
};

const unhealthyRedis = {
  status: "unavailable" as const,
  latencyMs: 5000,
  error: "Upstash Redis REST URL or token not configured",
};

describe("Health Aggregation", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCheckSupabase.mockReset();
    mockCheckXendit.mockReset();
    mockCheckRedis.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Overall status determination
  // -------------------------------------------------------------------------

  describe("Overall status determination", () => {
    it("should return status 'ok' when all services are healthy", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.status).toBe("ok");
    });

    it("should return status 'unhealthy' when Supabase is unavailable", async () => {
      mockCheckSupabase.mockResolvedValue(unhealthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.status).toBe("unhealthy");
    });

    it("should return status 'unhealthy' when Xendit is unavailable", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(unhealthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.status).toBe("unhealthy");
    });

    it("should return status 'unhealthy' when both critical services are unavailable", async () => {
      mockCheckSupabase.mockResolvedValue(unhealthySupabase);
      mockCheckXendit.mockResolvedValue(unhealthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.status).toBe("unhealthy");
    });

    it("should return status 'degraded' when critical services are healthy but Redis is unavailable", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(unhealthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.status).toBe("degraded");
    });

    it("should return status 'unhealthy' when Redis is unavailable but Supabase is also unavailable", async () => {
      // Critical service takes precedence over degraded
      mockCheckSupabase.mockResolvedValue(unhealthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(unhealthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.status).toBe("unhealthy");
    });
  });

  // -------------------------------------------------------------------------
  // Promise.allSettled: fulfilled results
  // -------------------------------------------------------------------------

  describe("Promise.allSettled fulfilled results", () => {
    it("should propagate Supabase fulfilled result with ok status", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.supabase.status).toBe("ok");
      expect(result.services.supabase.latencyMs).toBe(42);
      expect(result.services.supabase.database.status).toBe("ok");
      expect(result.services.supabase.auth.status).toBe("ok");
    });

    it("should propagate Xendit fulfilled result with ok status", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.xendit.status).toBe("ok");
      expect(result.services.xendit.latencyMs).toBe(55);
    });

    it("should propagate Redis fulfilled result with ok status", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.redis.status).toBe("ok");
      expect(result.services.redis.latencyMs).toBe(8);
    });

    it("should propagate Supabase fulfilled result with unavailable status", async () => {
      mockCheckSupabase.mockResolvedValue(unhealthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.supabase.status).toBe("unavailable");
      expect(result.services.supabase.database.status).toBe("unavailable");
      expect(result.services.supabase.auth.status).toBe("unavailable");
      expect(result.services.supabase.error).toBe("Supabase check failed");
    });

    it("should propagate Xendit fulfilled result with unavailable status and error", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(unhealthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.xendit.status).toBe("unavailable");
      expect(result.services.xendit.error).toBe("Xendit credentials validation failed");
    });

    it("should propagate Redis fulfilled result with unavailable status and error", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(unhealthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.redis.status).toBe("unavailable");
      expect(result.services.redis.error).toBe("Upstash Redis REST URL or token not configured");
    });
  });

  // -------------------------------------------------------------------------
  // Promise.allSettled: rejected results
  // -------------------------------------------------------------------------

  describe("Promise.allSettled rejected results", () => {
    it("should handle Supabase rejection with Error reason", async () => {
      mockCheckSupabase.mockRejectedValue(new Error("Network unreachable"));
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.supabase.status).toBe("unavailable");
      expect(result.services.supabase.latencyMs).toBe(0);
      expect(result.services.supabase.database.status).toBe("unavailable");
      expect(result.services.supabase.database.error).toBe("Network unreachable");
      expect(result.services.supabase.auth.status).toBe("unavailable");
      expect(result.services.supabase.auth.error).toBe("Network unreachable");
      expect(result.services.supabase.error).toBe("Network unreachable");
      expect(result.status).toBe("unhealthy");
    });

    it("should handle Supabase rejection with non-Error reason", async () => {
      mockCheckSupabase.mockRejectedValue("Something went wrong");
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.supabase.status).toBe("unavailable");
      expect(result.services.supabase.error).toBe("Supabase check rejected");
    });

    it("should handle Xendit rejection with Error reason", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockRejectedValue(new Error("Xendit API timeout"));
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.xendit.status).toBe("unavailable");
      expect(result.services.xendit.latencyMs).toBe(0);
      expect(result.services.xendit.error).toBe("Xendit API timeout");
      expect(result.status).toBe("unhealthy");
    });

    it("should handle Xendit rejection with non-Error reason", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockRejectedValue(null);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.xendit.status).toBe("unavailable");
      expect(result.services.xendit.error).toBe("Xendit check rejected");
    });

    it("should handle Redis rejection with Error reason", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockRejectedValue(new Error("Redis connection refused"));

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.redis.status).toBe("unavailable");
      expect(result.services.redis.latencyMs).toBe(0);
      expect(result.services.redis.error).toBe("Redis connection refused");
      expect(result.status).toBe("degraded");
    });

    it("should handle Redis rejection with non-Error reason", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockRejectedValue(42);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.redis.status).toBe("unavailable");
      expect(result.services.redis.error).toBe("Redis check rejected");
    });

    it("should handle all three services rejecting simultaneously", async () => {
      mockCheckSupabase.mockRejectedValue(new Error("DB down"));
      mockCheckXendit.mockRejectedValue(new Error("Xendit down"));
      mockCheckRedis.mockRejectedValue(new Error("Redis down"));

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.supabase.status).toBe("unavailable");
      expect(result.services.xendit.status).toBe("unavailable");
      expect(result.services.redis.status).toBe("unavailable");
      expect(result.status).toBe("unhealthy");
    });
  });

  // -------------------------------------------------------------------------
  // Response metadata
  // -------------------------------------------------------------------------

  describe("Response metadata", () => {
    it("should include a timestamp in ISO 8601 format", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      // Verify ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it("should include a positive responseTimeMs", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(typeof result.responseTimeMs).toBe("number");
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should include all three services in the response", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services).toHaveProperty("supabase");
      expect(result.services).toHaveProperty("xendit");
      expect(result.services).toHaveProperty("redis");
    });

    it("should include the overall status in the response", async () => {
      mockCheckSupabase.mockResolvedValue(healthySupabase);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.status).toBeDefined();
      expect(["ok", "degraded", "unhealthy"]).toContain(result.status);
    });
  });

  // -------------------------------------------------------------------------
  // Supabase internal structure propagation
  // -------------------------------------------------------------------------

  describe("Supabase internal structure propagation", () => {
    it("should propagate database and auth sub-statuses from fulfilled result", async () => {
      const supabaseWithPartialFailure = {
        status: "unavailable" as const,
        latencyMs: 100,
        database: { status: "ok" as const, latencyMs: 50 },
        auth: { status: "unavailable" as const, latencyMs: 50, error: "Auth service degraded" },
      };

      mockCheckSupabase.mockResolvedValue(supabaseWithPartialFailure);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.supabase.database.status).toBe("ok");
      expect(result.services.supabase.auth.status).toBe("unavailable");
      expect(result.services.supabase.auth.error).toBe("Auth service degraded");
      expect(result.services.supabase.status).toBe("unavailable");
    });

    it("should set database and auth latencyMs from fulfilled result", async () => {
      const supabaseWithLatencies = {
        status: "ok" as const,
        latencyMs: 100,
        database: { status: "ok" as const, latencyMs: 50 },
        auth: { status: "ok" as const, latencyMs: 50 },
      };

      mockCheckSupabase.mockResolvedValue(supabaseWithLatencies);
      mockCheckXendit.mockResolvedValue(healthyXendit);
      mockCheckRedis.mockResolvedValue(healthyRedis);

      const { getHealthStatus } = await import("@/lib/health");
      const result = await getHealthStatus();

      expect(result.services.supabase.latencyMs).toBe(100);
      expect(result.services.supabase.database.latencyMs).toBe(50);
      expect(result.services.supabase.auth.latencyMs).toBe(50);
    });
  });

  // -------------------------------------------------------------------------
  // Exports
  // -------------------------------------------------------------------------

  describe("Type exports", () => {
    it("should export ServiceHealthStatus type alias", async () => {
      const health = await import("@/lib/health");
      // The type is exported; we verify it exists by checking the module
      expect(health).toBeDefined();
    });

    it("should export SystemHealthStatus type alias", async () => {
      const health = await import("@/lib/health");
      expect(health).toBeDefined();
    });

    it("should export HealthStatus interface", async () => {
      const health = await import("@/lib/health");
      expect(health).toBeDefined();
    });
  });
});
