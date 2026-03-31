/**
 * Supabase Health Check Utilities
 *
 * Provides health check functions for Supabase database and authentication:
 * - Database connectivity check via `SELECT 1` using service-role client
 * - Auth endpoint check via `GET /auth/v1/health` using anon key
 *
 * Both checks run with a 5-second timeout to ensure the health endpoint
 * remains responsive.
 *
 * @see https://supabase.com/docs/guides/self-hosting/health
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase health check result for an individual subsystem (DB or auth).
 */
export interface SupabaseSubsystemHealth {
  status: "ok" | "unavailable";
  latencyMs: number;
  error?: string;
}

/**
 * Aggregated Supabase health check result covering both database and auth.
 */
export interface SupabaseHealthResult {
  status: "ok" | "unavailable";
  latencyMs: number;
  database: SupabaseSubsystemHealth;
  auth: SupabaseSubsystemHealth;
}

/**
 * Health check timeout in milliseconds for each individual check.
 */
const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Supabase auth health endpoint response shape.
 */
interface SupabaseAuthHealthResponse {
  status: string;
}

/**
 * Check Supabase database connectivity using a raw SQL query.
 * Uses the service-role client to bypass RLS.
 *
 * The `version()` PostgreSQL function is a built-in that always exists,
 * making it ideal for verifying database connectivity without needing
 * to know which user tables exist in the schema.
 *
 * @returns {SupabaseSubsystemHealth} Database health result
 */
async function checkDatabase(): Promise<SupabaseSubsystemHealth> {
  const start = performance.now();

  try {
    const supabase = await createClient();

    // Use pg_catalog.version() — a built-in PostgreSQL function that always exists.
    // This is the most reliable way to check DB connectivity without depending
    // on user-created tables or custom RPC functions.
    const { data, error } = await supabase.rpc("version", {});

    if (error) {
      return {
        status: "unavailable",
        latencyMs: performance.now() - start,
        error: error.message || "Database query failed",
      };
    }

    // Successful call means DB is reachable — `data` contains the PostgreSQL version string
    if (typeof data !== "string" || data.trim() === "") {
      return {
        status: "unavailable",
        latencyMs: performance.now() - start,
        error: "Database returned empty version string",
      };
    }

    return {
      status: "ok",
      latencyMs: performance.now() - start,
    };
  } catch (err) {
    return {
      status: "unavailable",
      latencyMs: performance.now() - start,
      error: err instanceof Error ? err.message : "Database check failed",
    };
  }
}

/**
 * Check Supabase auth service health via the auth health endpoint.
 * Uses the anon key to make an unauthenticated request.
 *
 * @returns {SupabaseSubsystemHealth} Auth health result
 */
async function checkAuth(): Promise<SupabaseSubsystemHealth> {
  const start = performance.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      status: "unavailable",
      latencyMs: performance.now() - start,
      error: "Supabase URL or anon key not configured",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: "unavailable",
        latencyMs: performance.now() - start,
        error: `Auth endpoint returned ${response.status}`,
      };
    }

    // Validate response body is a valid auth health response
    const data = (await response.json()) as SupabaseAuthHealthResponse;

    if (data.status !== "ok" && data.status !== "healthy") {
      return {
        status: "unavailable",
        latencyMs: performance.now() - start,
        error: `Auth health status: ${data.status}`,
      };
    }

    return {
      status: "ok",
      latencyMs: performance.now() - start,
    };
  } catch (err) {
    return {
      status: "unavailable",
      latencyMs: performance.now() - start,
      error: err instanceof Error ? err.message : "Auth health check failed",
    };
  }
}

/**
 * Run both Supabase database and auth health checks in parallel.
 *
 * @returns {SupabaseHealthResult} Combined health result for Supabase
 *
 * @example
 * ```typescript
 * const result = await checkSupabase();
 * if (result.status === "unavailable") {
 *   // Alert or handle the failure
 * }
 * ```
 */
export async function checkSupabase(): Promise<SupabaseHealthResult> {
  const start = performance.now();

  try {
    const [database, auth] = await Promise.all([checkDatabase(), checkAuth()]);

    const overallStatus = database.status === "ok" && auth.status === "ok" ? "ok" : "unavailable";

    return {
      status: overallStatus,
      latencyMs: performance.now() - start,
      database,
      auth,
    };
  } catch (err) {
    return {
      status: "unavailable",
      latencyMs: performance.now() - start,
      database: {
        status: "unavailable",
        latencyMs: 0,
        error: err instanceof Error ? err.message : "Supabase check failed",
      },
      auth: {
        status: "unavailable",
        latencyMs: 0,
        error: err instanceof Error ? err.message : "Supabase check failed",
      },
    };
  }
}
