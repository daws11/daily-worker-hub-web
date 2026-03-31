/**
 * Supabase Health Check Unit Tests
 *
 * Tests the health check utilities for Supabase database and auth:
 * - Database connectivity check via pg_catalog.version()
 * - Auth endpoint check via GET /auth/v1/health
 * - Aggregated checkSupabase() that runs both checks in parallel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Environment variables to save/restore
const ENVVARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

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
  mockCreateClient.mockReset();
  // Reset AbortController stub to stable class
  vi.stubGlobal("AbortController", StableAbortController);
});

// ---------------------------------------------------------------------------
// Mock: createClient
// ---------------------------------------------------------------------------
function createMockSupabaseClient(overrides: {
  rpcError?: { message: string };
  rpcData?: unknown;
} = {}) {
  return {
    rpc: vi.fn().mockResolvedValue({
      data: overrides.rpcData ?? "PostgreSQL 15.2",
      error: overrides.rpcError ?? null,
    }),
  };
}

const mockCreateClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

// ---------------------------------------------------------------------------
// Mock: global fetch and AbortController (for auth health endpoint)
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Stable AbortController mock (replaced per-test in checkAuth describe block)
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
describe("Supabase Health Check — checkDatabase", () => {
  it("should return status ok when database is reachable", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.database.status).toBe("ok");
    expect(result.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.database.error).toBeUndefined();
  });

  it("should return status unavailable when database RPC returns an error", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ rpcError: { message: "Connection refused" } })
    );

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.database.status).toBe("unavailable");
    expect(result.database.error).toBe("Connection refused");
  });

  it("should return status unavailable when database returns empty version string", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ rpcData: "   " })
    );

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.database.status).toBe("unavailable");
    expect(result.database.error).toBe("Database returned empty version string");
  });

  it("should return status unavailable when database returns non-string data", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ rpcData: { error: "not a string" } })
    );

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.database.status).toBe("unavailable");
    expect(result.database.error).toBe("Database returned empty version string");
  });

  it("should capture latency in milliseconds", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());

    const { checkSupabase } = await import("@/lib/health/supabase");
    const before = Date.now();
    const result = await checkSupabase();
    const after = Date.now();

    // Latency should be a non-negative number and roughly in range
    expect(result.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.database.latencyMs).toBeLessThanOrEqual(after - before + 1000);
  });
});

describe("Supabase Health Check — checkAuth", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("should return status ok when auth endpoint returns ok", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("ok");
    expect(result.auth.error).toBeUndefined();
  });

  it("should return status ok when auth endpoint returns healthy", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "healthy" }),
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("ok");
  });

  it("should return status unavailable when Supabase URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("unavailable");
    expect(result.auth.error).toBe("Supabase URL or anon key not configured");
  });

  it("should return status unavailable when anon key is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("unavailable");
    expect(result.auth.error).toBe("Supabase URL or anon key not configured");
  });

  it("should return status unavailable when auth endpoint returns non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("unavailable");
    expect(result.auth.error).toBe("Auth endpoint returned 503");
  });

  it("should return status unavailable when auth health status is unexpected", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "down" }),
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("unavailable");
    expect(result.auth.error).toBe("Auth health status: down");
  });

  it("should use correct endpoint URL and headers when calling auth health", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    await checkSupabase();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toBe("https://test-project.supabase.co/auth/v1/health");
    expect(options.method).toBe("GET");
    expect(options.headers).toEqual({
      apikey: "test-anon-key",
      Authorization: "Bearer test-anon-key",
    });
  });

  it("should abort fetch request on timeout", async () => {
    // Override AbortController stub for this specific test
    const testAbort = vi.fn();
    const testSignal = { aborted: false, addEventListener: vi.fn() };
    class TestAbortController {
      signal = testSignal;
      abort = testAbort;
    }
    vi.stubGlobal("AbortController", TestAbortController);

    mockFetch.mockRejectedValue(new DOMException("The user aborted a request.", "AbortError"));

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("unavailable");
  });
});

describe("Supabase Health Check — checkSupabase (aggregated)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("should return overall status ok when both database and auth are ok", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.status).toBe("ok");
  });

  it("should return overall status unavailable when database is unavailable", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ rpcError: { message: "DB error" } })
    );
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.status).toBe("unavailable");
    expect(result.database.status).toBe("unavailable");
  });

  it("should return overall status unavailable when auth is unavailable", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.status).toBe("unavailable");
    expect(result.auth.status).toBe("unavailable");
  });

  it("should return overall status unavailable when both subsystems are unavailable", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ rpcError: { message: "DB error" } })
    );
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.status).toBe("unavailable");
    expect(result.database.status).toBe("unavailable");
    expect(result.auth.status).toBe("unavailable");
  });

  it("should return latency for the overall check", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should include both database and auth subsystems in result", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.database).toBeDefined();
    expect(result.database.status).toBe("ok");
    expect(result.database.latencyMs).toBeGreaterThanOrEqual(0);

    expect(result.auth).toBeDefined();
    expect(result.auth.status).toBe("ok");
    expect(result.auth.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should run database and auth checks in parallel", async () => {
    // Use deferred pattern to control when promises resolve
    let resolveDb: () => void;
    let resolveAuth: () => void;

    mockCreateClient.mockReturnValue(
      new Promise((resolve) => {
        resolveDb = () =>
          resolve({
            rpc: vi.fn().mockResolvedValue({ data: "PostgreSQL 15.2", error: null }),
          });
      }) as ReturnType<typeof mockCreateClient>
    );

    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveAuth = () =>
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ status: "ok" }),
          });
      }) as unknown as ReturnType<typeof fetch>
    );

    const { checkSupabase } = await import("@/lib/health/supabase");
    const checkPromise = checkSupabase();

    // Both should be called before either resolves (proving parallel execution)
    expect(mockCreateClient).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled();

    // Resolve both
    resolveDb!();
    resolveAuth!();

    const result = await checkPromise;
    expect(result.status).toBe("ok");
  });
});

describe("Supabase Health Check — error handling", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("should return unavailable when database check throws", async () => {
    mockCreateClient.mockRejectedValue(new Error("Unexpected error"));

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.database.status).toBe("unavailable");
    expect(result.database.error).toBe("Unexpected error");
  });

  it("should return unavailable when auth check throws", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("unavailable");
    expect(result.auth.error).toBe("Network error");
  });

  it("should handle non-Error exceptions gracefully in database check", async () => {
    mockCreateClient.mockRejectedValue("not an Error object");

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.database.status).toBe("unavailable");
    expect(result.database.error).toBe("Database check failed");
  });

  it("should handle non-Error exceptions gracefully in auth check", async () => {
    mockCreateClient.mockResolvedValue(createMockSupabaseClient());
    mockFetch.mockRejectedValue(null);

    const { checkSupabase } = await import("@/lib/health/supabase");
    const result = await checkSupabase();

    expect(result.auth.status).toBe("unavailable");
    expect(result.auth.error).toBe("Auth health check failed");
  });
});
