/**
 * Health Check Aggregator
 *
 * Provides a unified interface for checking the health of all subsystems:
 * - Supabase (database + auth)
 * - Xendit (payment API)
 * - Upstash Redis (caching)
 *
 * Uses `Promise.allSettled` to run all subsystem checks in parallel for
 * the fastest possible response time. Individual checks carry their own
 * 5-second timeout to prevent blocking.
 *
 * The overall system status is determined as follows:
 * - `ok` — all critical services (Supabase, Xendit) are healthy
 * - `degraded` — critical services are healthy but Redis is unavailable
 * - `unhealthy` — any critical service (Supabase or Xendit) is unavailable
 *
 * @see lib/health/supabase.ts
 * @see lib/health/xendit.ts
 * @see lib/health/redis.ts
 */

import "server-only";
import { checkSupabase } from "./supabase";
import { checkXendit } from "./xendit";
import { checkRedis } from "./redis";

/**
 * Individual service health status for the aggregated response.
 */
export type ServiceHealthStatus = "ok" | "unavailable";

/**
 * Overall system health status.
 */
export type SystemHealthStatus = "ok" | "degraded" | "unhealthy";

/**
 * Aggregated health check result for the Supabase subsystem.
 */
export interface AggregatedSupabaseHealth {
  status: ServiceHealthStatus;
  latencyMs: number;
  database: {
    status: ServiceHealthStatus;
    latencyMs: number;
    error?: string;
  };
  auth: {
    status: ServiceHealthStatus;
    latencyMs: number;
    error?: string;
  };
  error?: string;
}

/**
 * Aggregated health check result for the Xendit subsystem.
 */
export interface AggregatedXenditHealth {
  status: ServiceHealthStatus;
  latencyMs: number;
  error?: string;
}

/**
 * Aggregated health check result for the Redis subsystem.
 */
export interface AggregatedRedisHealth {
  status: ServiceHealthStatus;
  latencyMs: number;
  error?: string;
}

/**
 * Unified health status covering all subsystems.
 */
export interface HealthStatus {
  /** Overall system health status */
  status: SystemHealthStatus;
  /** Per-subsystem health summaries */
  services: {
    supabase: AggregatedSupabaseHealth;
    xendit: AggregatedXenditHealth;
    redis: AggregatedRedisHealth;
  };
  /** ISO 8601 timestamp of when the health check was performed */
  timestamp: string;
  /** Total time taken to perform all health checks in milliseconds */
  responseTimeMs: number;
}

/**
 * Run all subsystem health checks in parallel and aggregate the results.
 *
 * Uses `Promise.allSettled` so that a failure in one subsystem does not
 * prevent the others from being checked. Each individual check carries
 * its own 5-second timeout via the underlying health functions.
 *
 * @returns {Promise<HealthStatus>} Aggregated health status for all subsystems
 *
 * @example
 * ```typescript
 * const health = await getHealthStatus();
 * if (health.status === "unhealthy") {
 *   // Alert immediately — critical service is down
 * } else if (health.status === "degraded") {
 *   // Log warning — app is running but cache is unavailable
 * }
 * ```
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const start = performance.now();

  const results = await Promise.allSettled([
    checkSupabase(),
    checkXendit(),
    checkRedis(),
  ]);

  const [supabaseResult, xenditResult, redisResult] = results;

  // Normalise each result into the aggregated shape
  const supabase =
    supabaseResult.status === "fulfilled"
      ? {
          status: supabaseResult.value.status,
          latencyMs: supabaseResult.value.latencyMs,
          database: supabaseResult.value.database,
          auth: supabaseResult.value.auth,
          error: supabaseResult.value.status === "unavailable" ? "Supabase check failed" : undefined,
        }
      : {
          status: "unavailable" as ServiceHealthStatus,
          latencyMs: 0,
          database: {
            status: "unavailable" as ServiceHealthStatus,
            latencyMs: 0,
            error: supabaseResult.reason instanceof Error ? supabaseResult.reason.message : "Supabase check rejected",
          },
          auth: {
            status: "unavailable" as ServiceHealthStatus,
            latencyMs: 0,
            error: supabaseResult.reason instanceof Error ? supabaseResult.reason.message : "Supabase check rejected",
          },
          error: supabaseResult.reason instanceof Error ? supabaseResult.reason.message : "Supabase check rejected",
        };

  const xendit =
    xenditResult.status === "fulfilled"
      ? {
          status: xenditResult.value.status,
          latencyMs: xenditResult.value.latencyMs,
          error: xenditResult.value.error,
        }
      : {
          status: "unavailable" as ServiceHealthStatus,
          latencyMs: 0,
          error: xenditResult.reason instanceof Error ? xenditResult.reason.message : "Xendit check rejected",
        };

  const redis =
    redisResult.status === "fulfilled"
      ? {
          status: redisResult.value.status,
          latencyMs: redisResult.value.latencyMs,
          error: redisResult.value.error,
        }
      : {
          status: "unavailable" as ServiceHealthStatus,
          latencyMs: 0,
          error: redisResult.reason instanceof Error ? redisResult.reason.message : "Redis check rejected",
        };

  // Determine overall system status
  const criticalDown =
    supabase.status === "unavailable" || xendit.status === "unavailable";
  const redisDown = redis.status === "unavailable";

  let systemStatus: SystemHealthStatus;
  if (criticalDown) {
    systemStatus = "unhealthy";
  } else if (redisDown) {
    systemStatus = "degraded";
  } else {
    systemStatus = "ok";
  }

  return {
    status: systemStatus,
    services: {
      supabase,
      xendit,
      redis,
    },
    timestamp: new Date().toISOString(),
    responseTimeMs: performance.now() - start,
  };
}
