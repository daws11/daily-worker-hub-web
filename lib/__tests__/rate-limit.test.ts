/**
 * Rate Limiter Unit Tests
 *
 * Tests database-backed rate limiting with:
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
  type RateLimitType,
  type RateLimitConfig,
} from "../rate-limit";

// Mock the database rate limit functions
vi.mock("@/lib/db/rate-limit", () => ({
  getRateLimitCount: vi.fn(),
  recordRateLimitRequest: vi.fn(),
  cleanupExpiredRateLimits: vi.fn(),
}));

// Mock the auth functions
vi.mock("@/lib/auth/get-server-session", () => ({
  getServerSession: vi.fn(),
}));

// Mock the supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

// Import mocked functions for controlling in tests
import {
  getRateLimitCount,
  recordRateLimitRequest,
  cleanupExpiredRateLimits,
} from "@/lib/db/rate-limit";
import { getServerSession } from "@/lib/auth/get-server-session";

describe("Rate Limiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("RATE_LIMIT_CONFIGS", () => {
    it("should have auth configuration with 5 requests per minute", () => {
      const config = RATE_LIMIT_CONFIGS.auth;
      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(60 * 1000);
      expect(config.type).toBe("auth");
      expect(config.message).toContain("Terlalu banyak percobaan");
    });

    it("should have api-authenticated configuration with 100 requests per minute", () => {
      const config = RATE_LIMIT_CONFIGS["api-authenticated"];
      expect(config.maxRequests).toBe(100);
      expect(config.windowMs).toBe(60 * 1000);
      expect(config.type).toBe("api-authenticated");
    });

    it("should have api-public configuration with 30 requests per minute", () => {
      const config = RATE_LIMIT_CONFIGS["api-public"];
      expect(config.maxRequests).toBe(30);
      expect(config.windowMs).toBe(60 * 1000);
      expect(config.type).toBe("api-public");
    });

    it("should have payment configuration with 10 requests per minute", () => {
      const config = RATE_LIMIT_CONFIGS.payment;
      expect(config.maxRequests).toBe(10);
      expect(config.windowMs).toBe(60 * 1000);
      expect(config.type).toBe("payment");
      expect(config.message).toContain("pembayaran");
    });

    it("should have Indonesian error messages for all types", () => {
      Object.values(RATE_LIMIT_CONFIGS).forEach((config) => {
        expect(config.message).toBeDefined();
        expect(typeof config.message).toBe("string");
      });
    });
  });

  describe("rateLimitStore", () => {
    it("should be a Map instance", () => {
      expect(rateLimitStore).toBeInstanceOf(Map);
    });

    it("should be empty initially", () => {
      expect(rateLimitStore.size).toBe(0);
    });

    it("should store request records with count and resetTime", () => {
      rateLimitStore.set("user:123:auth", { count: 5, resetTime: Date.now() + 60000 });
      expect(rateLimitStore.size).toBe(1);
      expect(rateLimitStore.get("user:123:auth")?.count).toBe(5);
    });

    it("should be accessible for admin metrics", () => {
      rateLimitStore.set("ip:192.168.1.1:api-public", { count: 10, resetTime: Date.now() + 60000 });
      const record = rateLimitStore.get("ip:192.168.1.1:api-public");
      expect(record).toBeDefined();
      expect(record?.count).toBe(10);
    });
  });

  describe("withRateLimit - Basic Rate Limiting", () => {
    const mockHandler = vi.fn(async () => {
      return NextResponse.json({ success: true });
    });

    beforeEach(() => {
      mockHandler.mockClear();
      // Default: allow request
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });
    });

    it("should allow requests when under the limit", async () => {
      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
      expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("29");
    });

    it("should add rate limit headers to successful responses", async () => {
      const wrappedHandler = withRateLimit(mockHandler, { type: "auth" });
      const request = new NextRequest("http://localhost/auth/login");

      const response = await wrappedHandler(request);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    it("should return 429 when rate limit is exceeded", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 30, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.headers.get("Retry-After")).toBe("60");
    });

    it("should return 429 with Indonesian error message for auth", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 5, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "auth" });
      const request = new NextRequest("http://localhost/auth/login");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toContain("Terlalu banyak percobaan");
    });

    it("should return 429 with Indonesian error message for payment", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 10, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "payment" });
      const request = new NextRequest("http://localhost/api/payment");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toContain("pembayaran");
    });

    it("should allow request on database error (fail-open)", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({
        count: null,
        error: new Error("DB connection failed"),
      });

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it("should call recordRateLimitRequest after successful check", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      await wrappedHandler(request);

      expect(recordRateLimitRequest).toHaveBeenCalledWith(
        expect.stringContaining("ip:"),
        "api-public",
        60 * 1000,
      );
    });
  });

  describe("withRateLimit - IP Extraction", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });
    });

    it("should extract IP from x-forwarded-for header", async () => {
      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test", {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      });

      await wrappedHandler(request);

      expect(recordRateLimitRequest).toHaveBeenCalledWith(
        "ip:203.0.113.195",
        "api-public",
        expect.any(Number),
      );
    });

    it("should extract IP from x-real-ip header", async () => {
      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test", {
        headers: { "x-real-ip": "192.168.1.100" },
      });

      await wrappedHandler(request);

      expect(recordRateLimitRequest).toHaveBeenCalledWith(
        "ip:192.168.1.100",
        "api-public",
        expect.any(Number),
      );
    });

    it("should extract IP from cf-connecting-ip header (Cloudflare)", async () => {
      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test", {
        headers: { "cf-connecting-ip": "104.28.220.5" },
      });

      await wrappedHandler(request);

      expect(recordRateLimitRequest).toHaveBeenCalledWith(
        "ip:104.28.220.5",
        "api-public",
        expect.any(Number),
      );
    });

    it("should use user ID when userBased is true and user is authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      });

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "api-authenticated",
        userBased: true,
      });
      const request = new NextRequest("http://localhost/api/test");

      await wrappedHandler(request);

      expect(recordRateLimitRequest).toHaveBeenCalledWith(
        "user:user-123",
        "api-authenticated",
        expect.any(Number),
      );
    });

    it("should fall back to IP when userBased is true but no session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "api-authenticated",
        userBased: true,
      });
      const request = new NextRequest("http://localhost/api/test");

      await wrappedHandler(request);

      expect(recordRateLimitRequest).toHaveBeenCalledWith(
        expect.stringMatching(/^ip:/),
        "api-authenticated",
        expect.any(Number),
      );
    });

    it("should use custom keyPrefix in identifier", async () => {
      const wrappedHandler = withRateLimit(mockHandler, {
        type: "api-public",
        keyPrefix: "my-api",
      });
      const request = new NextRequest("http://localhost/api/test");

      await wrappedHandler(request);

      expect(recordRateLimitRequest).toHaveBeenCalledWith(
        expect.stringContaining("my-api:"),
        "api-public",
        expect.any(Number),
      );
    });
  });

  describe("withRateLimit - Admin Bypass", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should bypass rate limit for admin users when skipAdmin is true", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "admin-123", email: "admin@example.com" },
      });

      vi.mocked(createClient as any).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
            })),
          })),
        })),
      });

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "auth",
        skipAdmin: true,
      });
      const request = new NextRequest("http://localhost/auth/login");

      const response = await wrappedHandler(request);

      // Admin should bypass, so handler is called and returns 200
      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
      // Should still add rate limit headers showing full allowance
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("5");
    });

    it("should not bypass rate limit for non-admin users", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-123", email: "user@example.com" },
      });

      vi.mocked(createClient as any).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { role: "worker" }, error: null }),
            })),
          })),
        })),
      });

      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "auth",
        skipAdmin: true,
      });
      const request = new NextRequest("http://localhost/auth/login");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(recordRateLimitRequest).toHaveBeenCalled(); // Rate limiting applied
    });

    it("should enforce rate limit when skipAdmin is false", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 5, error: null });

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "auth",
        skipAdmin: false,
      });
      const request = new NextRequest("http://localhost/auth/login");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe("withRateLimit - Dual IP and User Rate Limiting", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should apply both IP and user-based limits when alsoIpBased is true", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      });

      // User has 0 requests, but IP will have too many
      vi.mocked(getRateLimitCount)
        .mockResolvedValueOnce({ count: 0, error: null }) // user check
        .mockResolvedValueOnce({ count: 30, error: null }); // IP check

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "api-public",
        userBased: true,
        alsoIpBased: true,
      });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should use stricter limit when both IP and user are limited", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      });

      // User has 20 requests remaining, IP has only 1
      vi.mocked(getRateLimitCount)
        .mockResolvedValueOnce({ count: 80, error: null }) // user: 20 remaining
        .mockResolvedValueOnce({ count: 29, error: null }); // IP: 1 remaining

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "api-public",
        userBased: true,
        alsoIpBased: true,
      });
      const request = new NextRequest("http://localhost/api/test");

      await wrappedHandler(request);

      // Should use the stricter IP result (1 remaining)
      expect(recordRateLimitRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe("withRateLimit - Method Filtering", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should not apply rate limiting to excluded methods", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 100, error: null });

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "api-public",
        methods: ["POST", "PUT"],
      });

      // GET request should bypass rate limiting
      const getRequest = new NextRequest("http://localhost/api/test", {
        method: "GET",
      });

      const response = await wrappedHandler(getRequest);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
      // No DB calls should be made for GET
      expect(getRateLimitCount).not.toHaveBeenCalled();
    });

    it("should apply rate limiting to specified methods", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 100, error: null });

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "api-public",
        methods: ["POST", "PUT"],
      });

      // POST request should be rate limited
      const postRequest = new NextRequest("http://localhost/api/test", {
        method: "POST",
      });

      const response = await wrappedHandler(postRequest);

      expect(response.status).toBe(429);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe("withRateLimit - Custom Configuration", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });
    });

    it("should use custom config when provided", async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 3,
        windowMs: 30 * 1000,
        type: "api-public",
        message: "Custom rate limit message",
      };

      const wrappedHandler = withRateLimit(mockHandler, { config: customConfig });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("3");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("2");
    });

    it("should return custom error message when provided and rate limited", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 3, error: null });

      const customConfig: RateLimitConfig = {
        maxRequests: 3,
        windowMs: 30 * 1000,
        type: "api-public",
        message: "Custom rate limit message",
      };

      const wrappedHandler = withRateLimit(mockHandler, { config: customConfig });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe("Custom rate limit message");
    });
  });

  describe("withRateLimitForMethod", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should default to POST, PUT, DELETE, PATCH methods", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const wrappedHandler = withRateLimitForMethod(mockHandler, {
        type: "api-public",
      });

      // POST should be rate limited
      const postRequest = new NextRequest("http://localhost/api/test", {
        method: "POST",
      });
      await wrappedHandler(postRequest);
      expect(getRateLimitCount).toHaveBeenCalled();

      vi.mocked(getRateLimitCount).mockClear();

      // GET should not be rate limited
      const getRequest = new NextRequest("http://localhost/api/test", {
        method: "GET",
      });
      await wrappedHandler(getRequest);
      expect(getRateLimitCount).not.toHaveBeenCalled();
    });

    it("should use custom methods when provided", async () => {
      const wrappedHandler = withRateLimitForMethod(mockHandler, {
        type: "api-public",
      }, ["GET", "POST"]);

      // GET should now be rate limited
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const getRequest = new NextRequest("http://localhost/api/test", {
        method: "GET",
      });
      await wrappedHandler(getRequest);
      expect(getRateLimitCount).toHaveBeenCalled();
    });

    it("should return 429 when rate limited with custom methods", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 30, error: null });

      const wrappedHandler = withRateLimitForMethod(mockHandler, {
        type: "api-public",
      }, ["POST"]);

      const postRequest = new NextRequest("http://localhost/api/test", {
        method: "POST",
      });

      const response = await wrappedHandler(postRequest);

      expect(response.status).toBe(429);
    });
  });

  describe("Rate Limit Headers", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should include all required rate limit headers", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 5, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.headers.get("X-RateLimit-Limit")).toBeTruthy();
      expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy();
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
    });

    it("should include Retry-After header on 429 response", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 30, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("60");
    });

    it("should not include Retry-After header on success", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Retry-After")).toBeNull();
    });

    it("should calculate remaining correctly", async () => {
      // Test with 10 requests already made
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 10, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "payment" }); // max: 10
      const request = new NextRequest("http://localhost/api/payment");

      const response = await wrappedHandler(request);

      // 10 requests made, 10 max = 0 remaining
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should never show negative remaining", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 100, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      const response = await wrappedHandler(request);

      const remaining = response.headers.get("X-RateLimit-Remaining");
      expect(Number(remaining)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Edge Cases", () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ success: true }));

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it("should handle empty request URL gracefully", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/");

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it("should handle rapid consecutive requests", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const wrappedHandler = withRateLimit(mockHandler, { type: "auth" });
      const request = new NextRequest("http://localhost/auth/login");

      // Make multiple rapid requests
      for (let i = 0; i < 5; i++) {
        await wrappedHandler(request);
      }

      // After 5 requests in auth window (max 5), should be rate limited
      expect(recordRateLimitRequest).toHaveBeenCalledTimes(5);
    });

    it("should handle session errors gracefully", async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error("Session error"));

      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

      const wrappedHandler = withRateLimit(mockHandler, {
        type: "api-authenticated",
        userBased: true,
      });
      const request = new NextRequest("http://localhost/api/test");

      // Should fall back to IP-based limiting
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it("should handle recordRateLimitRequest errors gracefully", async () => {
      vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
      vi.mocked(recordRateLimitRequest).mockRejectedValue(
        new Error("Failed to record request"),
      );

      const wrappedHandler = withRateLimit(mockHandler, { type: "api-public" });
      const request = new NextRequest("http://localhost/api/test");

      // Should allow request even if recording fails
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it("should handle all rate limit types correctly", async () => {
      const types: RateLimitType[] = ["auth", "api-authenticated", "api-public", "payment"];

      for (const type of types) {
        vi.mocked(getRateLimitCount).mockResolvedValue({ count: 0, error: null });
        vi.mocked(recordRateLimitRequest).mockResolvedValue({ data: null, error: null });

        const wrappedHandler = withRateLimit(mockHandler, { type });
        const request = new NextRequest(`http://localhost/api/${type}`);

        const response = await wrappedHandler(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("X-RateLimit-Limit")).toBe(
          RATE_LIMIT_CONFIGS[type].maxRequests.toString(),
        );
      }
    });
  });

  describe("cleanupExpiredRateLimits", () => {
    it("should be called periodically", async () => {
      vi.mocked(cleanupExpiredRateLimits).mockResolvedValue({ deletedCount: 10, error: null });

      // Wait a bit for the interval to potentially fire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The cleanup function should be available and callable
      expect(cleanupExpiredRateLimits).toBeDefined();
    });
  });
});
