/**
 * Redis Health Check Unit Tests
 *
 * Tests the health check utilities for Upstash Redis:
 * - Credential validation (URL and token presence)
 * - Successful PING / PONG response handling
 * - HTTP error response handling
 * - Unexpected PING response handling
 * - Timeout / network error handling
 * - Latency measurement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Environment variables to save/restore
// ---------------------------------------------------------------------------
const ENVVARS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];

const originalEnvVars: Record<string, string | undefined> = {};

beforeEach(() => {
  ENVVARS.forEach((key) => {
    originalEnvVars[key] = process.env[key];
    delete process.env[key];
  });
  vi.resetModules();
});

afterEach(() => {
  ENVVARS.forEach((key) => {
    if (originalEnvVars[key] !== undefined) {
      process.env[key] = originalEnvVars[key];
    } else {
      delete process.env[key];
    }
  });
  vi.restoreAllMocks();
  mockFetch.mockReset();
  mockAbort.mockReset();
  mockSignal.addEventListener.mockReset();
  vi.stubGlobal("AbortController", StableAbortController);
});

// ---------------------------------------------------------------------------
// Mock: global fetch and AbortController
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockAbort = vi.fn();
const mockSignal = { aborted: false, addEventListener: vi.fn() };

class StableAbortController {
  signal = mockSignal;
  abort = mockAbort;
}
vi.stubGlobal("AbortController", StableAbortController);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Redis Health Check — checkRedis", () => {
  // Set up valid credentials for most tests
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  // -------------------------------------------------------------------------
  // Credential validation
  // -------------------------------------------------------------------------
  describe("Credential validation", () => {
    it("should return status unavailable when UPSTASH_REDIS_REST_URL is missing", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Upstash Redis REST URL or token not configured");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return status unavailable when UPSTASH_REDIS_REST_TOKEN is missing", async () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Upstash Redis REST URL or token not configured");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return status unavailable when both URL and token are missing", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Upstash Redis REST URL or token not configured");
    });

    it("should not call fetch when credentials are missing", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const { checkRedis } = await import("@/lib/health/redis");
      await checkRedis();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful PING
  // -------------------------------------------------------------------------
  describe("Successful PING", () => {
    it("should return status ok when Redis returns PONG", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "PONG" }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("ok");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it("should include correct fields in ok result", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "PONG" }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("latencyMs");
      expect(result.status).toBe("ok");
      expect(typeof result.latencyMs).toBe("number");
    });
  });

  // -------------------------------------------------------------------------
  // HTTP error responses
  // -------------------------------------------------------------------------
  describe("HTTP error responses", () => {
    it("should return status unavailable when response is not ok (500)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Upstash Redis returned 500");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return status unavailable when response is not ok (401)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Upstash Redis returned 401");
    });

    it("should return status unavailable when response is not ok (503)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Upstash Redis returned 503");
    });
  });

  // -------------------------------------------------------------------------
  // Unexpected PING response
  // -------------------------------------------------------------------------
  describe("Unexpected PING response", () => {
    it("should return status unavailable when result is not PONG string", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "ERROR" }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe('Unexpected PING response: "ERROR"');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return status unavailable when result is undefined", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Unexpected PING response: undefined");
    });

    it("should return status unavailable when result is null", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: null }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Unexpected PING response: null");
    });

    it("should return status unavailable when result is an object", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: { error: "something went wrong" } }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe('Unexpected PING response: {"error":"something went wrong"}')
    });
  });

  // -------------------------------------------------------------------------
  // Timeout / network error handling
  // -------------------------------------------------------------------------
  describe("Timeout / network error handling", () => {
    it("should return status unavailable when fetch is aborted (timeout)", async () => {
      // Override AbortController stub for this specific test
      const testAbort = vi.fn();
      const testSignal = { aborted: false, addEventListener: vi.fn() };
      class TestAbortController {
        signal = testSignal;
        abort = testAbort;
      }
      vi.stubGlobal("AbortController", TestAbortController);

      mockFetch.mockRejectedValue(
        new DOMException("The user aborted a request.", "AbortError")
      );

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return status unavailable when fetch throws a network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network connection refused"));

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Network connection refused");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return status unavailable with generic message when fetch throws a non-Error", async () => {
      mockFetch.mockRejectedValue("string error");

      const { checkRedis } = await import("@/lib/health/redis");
      const result = await checkRedis();

      expect(result.status).toBe("unavailable");
      expect(result.error).toBe("Redis health check failed");
    });
  });

  // -------------------------------------------------------------------------
  // Request details
  // -------------------------------------------------------------------------
  describe("Request details", () => {
    it("should call fetch with correct URL and headers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "PONG" }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      await checkRedis();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe("https://test.upstash.io");
      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      });
    });

    it("should send PING command in request body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "PONG" }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      await checkRedis();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toBe(JSON.stringify(["PING"]));
    });

    it("should pass abort signal to fetch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "PONG" }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      await checkRedis();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.signal).toBeDefined();
    });

    it("should only call fetch once per check", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "PONG" }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      await checkRedis();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Latency measurement
  // -------------------------------------------------------------------------
  describe("Latency measurement", () => {
    it("should capture latency in milliseconds", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "PONG" }),
      });

      const { checkRedis } = await import("@/lib/health/redis");
      const before = Date.now();
      const result = await checkRedis();
      const after = Date.now();

      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.latencyMs).toBeLessThanOrEqual(after - before + 1000);
    });

    it("should measure latency including the time spent in fetch", async () => {
      let resolve: (value: Response) => void;
      mockFetch.mockReturnValue(
        new Promise<Response>((r) => {
          resolve = r;
        })
      );

      const { checkRedis } = await import("@/lib/health/redis");
      const checkPromise = checkRedis();

      // Wait for fetch to be called
      await new Promise((r) => setTimeout(r, 50));

      expect(mockFetch).toHaveBeenCalled();

      resolve!({
        ok: true,
        status: 200,
        json: async () => ({ result: "PONG" }),
      } as Response);

      const result = await checkPromise;

      // Latency should be at least 50ms due to the artificial delay
      expect(result.latencyMs).toBeGreaterThanOrEqual(50);
      expect(result.status).toBe("ok");
    });
  });
});
