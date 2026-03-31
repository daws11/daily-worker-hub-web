/**
 * Xendit Health Check Unit Tests
 *
 * Tests the health check utilities for the Xendit payment API:
 * - Credential validation success
 * - Credential validation failure
 * - Exception handling
 * - Latency measurement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock: xenditGateway
// ---------------------------------------------------------------------------
const mockValidateCredentials = vi.fn();

vi.mock("@/lib/payments/xendit", () => ({
  xenditGateway: {
    validateCredentials: mockValidateCredentials,
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Xendit Health Check — checkXendit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return status ok when credentials are valid", async () => {
    mockValidateCredentials.mockResolvedValue(true);

    const { checkXendit } = await import("@/lib/health/xendit");
    const result = await checkXendit();

    expect(result.status).toBe("ok");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
    expect(mockValidateCredentials).toHaveBeenCalledTimes(1);
  });

  it("should return status unavailable when credentials are invalid", async () => {
    mockValidateCredentials.mockResolvedValue(false);

    const { checkXendit } = await import("@/lib/health/xendit");
    const result = await checkXendit();

    expect(result.status).toBe("unavailable");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBe("Xendit credentials validation failed");
  });

  it("should return status unavailable with error message when validateCredentials throws an Error", async () => {
    mockValidateCredentials.mockRejectedValue(new Error("Connection refused"));

    const { checkXendit } = await import("@/lib/health/xendit");
    const result = await checkXendit();

    expect(result.status).toBe("unavailable");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBe("Connection refused");
  });

  it("should return status unavailable with generic message when validateCredentials throws a non-Error", async () => {
    mockValidateCredentials.mockRejectedValue("string error");

    const { checkXendit } = await import("@/lib/health/xendit");
    const result = await checkXendit();

    expect(result.status).toBe("unavailable");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBe("Xendit balance check failed");
  });

  it("should capture latency in milliseconds", async () => {
    mockValidateCredentials.mockResolvedValue(true);

    const { checkXendit } = await import("@/lib/health/xendit");
    const before = Date.now();
    const result = await checkXendit();
    const after = Date.now();

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.latencyMs).toBeLessThanOrEqual(after - before + 1000);
  });

  it("should include correct fields in ok result", async () => {
    mockValidateCredentials.mockResolvedValue(true);

    const { checkXendit } = await import("@/lib/health/xendit");
    const result = await checkXendit();

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("latencyMs");
    expect(result.status).toBe("ok");
    expect(typeof result.latencyMs).toBe("number");
  });

  it("should include correct fields in unavailable result", async () => {
    mockValidateCredentials.mockResolvedValue(false);

    const { checkXendit } = await import("@/lib/health/xendit");
    const result = await checkXendit();

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("latencyMs");
    expect(result).toHaveProperty("error");
    expect(result.status).toBe("unavailable");
    expect(typeof result.latencyMs).toBe("number");
    expect(typeof result.error).toBe("string");
  });

  it("should only call validateCredentials once per check", async () => {
    mockValidateCredentials.mockResolvedValue(true);

    const { checkXendit } = await import("@/lib/health/xendit");
    await checkXendit();

    expect(mockValidateCredentials).toHaveBeenCalledTimes(1);
  });

  it("should measure latency including the time spent in validateCredentials", async () => {
    let resolve: (value: boolean) => void;
    mockValidateCredentials.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    const { checkXendit } = await import("@/lib/health/xendit");
    const checkPromise = checkXendit();

    // Give some time for the mock to be called
    await new Promise((r) => setTimeout(r, 50));

    expect(mockValidateCredentials).toHaveBeenCalled();

    resolve!(true);
    const result = await checkPromise;

    // Latency should be at least 50ms due to the artificial delay
    expect(result.latencyMs).toBeGreaterThanOrEqual(50);
    expect(result.status).toBe("ok");
  });
});
