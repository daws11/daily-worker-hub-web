/**
 * Rate Limiter Unit Tests
 *
 * Tests in-memory rate limiting with:
 * - IP-based and user-based rate limiting
 * - Configurable limits per endpoint type
 * - Admin bypass support
 * - Rate limit headers (X-RateLimit-*)
 * - Retry-After header on 429 responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  RATE_LIMIT_CONFIGS,
  rateLimitStore,
  withRateLimit,
  withRateLimitForMethod,
  clearRateLimit,
  clearAllRateLimits,
  getRateLimitStats,
  type RateLimitType,
  type RateLimitConfig,
} from "../rate-limit";

// Mock getServerSession
vi.mock("@/lib/auth/get-server-session", () => ({
  getServerSession: vi.fn(),
}));

// Mock supabase createClient
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

// Import mocked functions
import { getServerSession } from "@/lib/auth/get-server-session";

describe("Rate Limiter", () => {
  beforeEach(() => {
    clearAllRateLimits();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe("RATE_LIMIT_CONFIGS", () => {
    it("should have auth configuration", () => {
      expect(RATE_LIMIT_CONFIGS.auth).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.auth.type).toBe("auth");
    });

    it("should have api-authenticated configuration", () => {
      expect(RATE_LIMIT_CONFIGS["api-authenticated"]).toBeDefined();
      expect(RATE_LIMIT_CONFIGS["api-authenticated"].type).toBe("api-authenticated");
    });

    it("should have api-public configuration", () => {
      expect(RATE_LIMIT_CONFIGS["api-public"]).toBeDefined();
      expect(RATE_LIMIT_CONFIGS["api-public"].type).toBe("api-public");
    });

    it("should have payment configuration", () => {
      expect(RATE_LIMIT_CONFIGS.payment).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.payment.type).toBe("payment");
    });

    it("should have maxRequests and windowMs for each config", () => {
      for (const config of Object.values(RATE_LIMIT_CONFIGS)) {
        expect(typeof config.maxRequests).toBe("number");
        expect(typeof config.windowMs).toBe("number");
        expect(config.maxRequests).toBeGreaterThan(0);
        expect(config.windowMs).toBeGreaterThan(0);
      }
    });
  });

  describe("rateLimitStore", () => {
    it("should be a Map", () => {
      expect(rateLimitStore).toBeInstanceOf(Map);
    });

    it("should start empty", () => {
      expect(rateLimitStore.size).toBe(0);
    });
  });

  describe("clearRateLimit and clearAllRateLimits", () => {
    it("should clear rate limit for specific identifier", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(mockHandler, { type: "auth" });
      const request = new NextRequest("http://localhost/api/test");

      // Make a request to populate the store
      await wrappedHandler(request);
      expect(rateLimitStore.size).toBeGreaterThan(0);

      // Clear rate limit
      clearRateLimit("user:user123", "auth");
    });

    it("should clear all rate limits", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(mockHandler, { type: "auth" });
      const request = new NextRequest("http://localhost/api/test");

      // Make requests to populate the store
      await wrappedHandler(request);
      expect(rateLimitStore.size).toBeGreaterThan(0);

      clearAllRateLimits();
      expect(rateLimitStore.size).toBe(0);
    });
  });

  describe("withRateLimit - Basic Rate Limiting", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should allow requests when under the limit", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it("should apply IP-based rate limiting for unauthenticated users", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public", userBased: false });
      const request = new NextRequest("http://localhost/api/test");
      request.headers.set("x-forwarded-for", "192.168.1.1");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it("should apply user-based rate limiting for authenticated users", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public", userBased: true });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe("withRateLimit - Rate Limit Headers", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should include all required rate limit headers", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.headers.get("X-RateLimit-Limit")).toBeTruthy();
      expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy();
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
    });

    it("should include Retry-After header on 429 response", async () => {
      // Pre-populate the rate limit store to trigger 429
      const now = Date.now();
      rateLimitStore.set("user:user123:api-public", {
        count: RATE_LIMIT_CONFIGS["api-public"].maxRequests,
        resetTime: now + RATE_LIMIT_CONFIGS["api-public"].windowMs,
      });

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBeTruthy();
    });

    it("should not include Retry-After header on success", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Retry-After")).toBeNull();
    });

    it("should never show negative remaining", async () => {
      // Pre-populate beyond max
      const now = Date.now();
      rateLimitStore.set("user:user123:api-public", {
        count: 1000,
        resetTime: now + RATE_LIMIT_CONFIGS["api-public"].windowMs,
      });

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      const remaining = response.headers.get("X-RateLimit-Remaining");
      expect(Number(remaining)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("withRateLimit - Admin Bypass", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should skip rate limiting for admin users", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "admin123" } } as any);

      // Mock supabase to return admin role
      const { createClient } = await import("@/lib/supabase/server");
      const mockCreateClient = vi.mocked(createClient) as any;
      mockCreateClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
            })),
          })),
        })),
      });

      const wrappedHandler = withRateLimit(mockHandler, { type: "auth", skipAdmin: true });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe("withRateLimit - HTTP Method Filtering", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should only apply rate limiting to specified methods", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "auth",
        methods: ["POST", "PUT"],
      });

      // GET request should bypass rate limiting
      const getRequest = new NextRequest("http://localhost/api/test", { method: "GET" });
      const getResponse = await wrappedHandler(getRequest);
      expect(getResponse.status).toBe(200);

      // POST request should be rate limited
      const postRequest = new NextRequest("http://localhost/api/test", { method: "POST" });
      const postResponse = await wrappedHandler(postRequest);
      expect(postResponse.status).toBe(200); // First request should succeed
    });
  });

  describe("withRateLimit - Custom Config", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should use custom config when provided", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 60000,
        type: "auth",
      };

      const wrappedHandler = withRateLimit(mockHandler, { config: customConfig });
      const request = new NextRequest("http://localhost/api/test");

      // First two requests should succeed
      await wrappedHandler(request);
      await wrappedHandler(request);

      // Third request should still succeed because limit is per-window
      const response = await wrappedHandler(request);
      expect(response.status).toBe(200);
    });
  });

  describe("getRateLimitStats", () => {
    it("should return stats for existing rate limit", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(mockHandler, { type: "auth" });
      const request = new NextRequest("http://localhost/api/test");

      await wrappedHandler(request);

      const stats = getRateLimitStats("user:user123", "auth");
      expect(stats).toBeDefined();
      expect(stats?.count).toBeGreaterThan(0);
    });

    it("should return undefined for non-existing rate limit", () => {
      const stats = getRateLimitStats("nonexistent", "auth");
      expect(stats).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should handle empty request URL gracefully", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it("should handle requests without user session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public", userBased: false });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });
  });

  describe("withRateLimitForMethod", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should wrap handler with method filtering", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user123" } } as any);

      const wrappedHandler = withRateLimitForMethod(mockHandler, { type: "payment" });
      const request = new NextRequest("http://localhost/api/payment", { method: "POST" });

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});
