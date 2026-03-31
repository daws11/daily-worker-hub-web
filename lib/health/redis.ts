/**
 * Redis Health Check Utilities
 *
 * Provides health check function for Upstash Redis:
 * - PING check via the Upstash REST API using REST_URL and REST_TOKEN
 *
 * Uses the Upstash Redis HTTP API (not the Node SDK) to remain compatible
 * with Vercel Edge and serverless environments. The PING command is
 * sent via POST to the Upstash REST endpoint with Bearer token auth.
 *
 * @see https://upstash.com/docs/redis/overall/getstarted
 */

import "server-only";

/**
 * Upstash Redis health check result.
 */
export interface RedisHealthResult {
  /** Overall Redis health status */
  status: "ok" | "unavailable";
  /** Time taken to check Redis in milliseconds */
  latencyMs: number;
  /** Error message if Redis is unavailable */
  error?: string;
}

/**
 * Health check timeout in milliseconds for the Redis ping call.
 */
const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Check Upstash Redis connectivity by sending a PING command via the
 * Upstash REST API.
 *
 * Uses Bearer token auth with the UPSTASH_REDIS_REST_TOKEN environment
 * variable. The REST_URL is used as the base endpoint. This follows the
 * same HTTP-based approach used throughout the codebase (rather than the
 * Upstash Node SDK) to ensure compatibility with all Vercel environments.
 *
 * @returns {RedisHealthResult} Redis health result
 *
 * @example
 * ```typescript
 * const result = await checkRedis();
 * if (result.status === "unavailable") {
 *   // Handle Redis failure (app continues in degraded mode)
 * }
 * ```
 */
export async function checkRedis(): Promise<RedisHealthResult> {
  const start = performance.now();

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return {
      status: "unavailable",
      latencyMs: performance.now() - start,
      error: "Upstash Redis REST URL or token not configured",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(`${redisUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["PING"]),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: "unavailable",
        latencyMs: performance.now() - start,
        error: `Upstash Redis returned ${response.status}`,
      };
    }

    const data = (await response.json()) as { result?: unknown };

    // Upstash returns { result: "PONG" } on success
    if (data.result !== "PONG") {
      return {
        status: "unavailable",
        latencyMs: performance.now() - start,
        error: `Unexpected PING response: ${JSON.stringify(data.result)}`,
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
      error: err instanceof Error ? err.message : "Redis health check failed",
    };
  }
}
