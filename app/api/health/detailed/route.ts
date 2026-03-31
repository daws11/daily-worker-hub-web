import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getHealthStatus } from "@/lib/health/index";

const routeLogger = logger.createApiLogger("api/health/detailed");

/**
 * Full diagnostic health check endpoint.
 *
 * Returns a comprehensive health payload covering all subsystems:
 * - Supabase (database + auth)
 * - Xendit (payment API)
 * - Upstash Redis (caching)
 *
 * No authentication required. Designed for internal monitoring tools,
 * debugging, and the public /status page.
 *
 * Response shape:
 * {
 *   status: "ok" | "degraded" | "unhealthy",
 *   timestamp: ISO8601 string,
 *   version: string | undefined,
 *   services: {
 *     supabase: { status, latencyMs, database: { status, latencyMs, error? }, auth: { status, latencyMs, error? }, error? },
 *     xendit:  { status, latencyMs, error? },
 *     redis:   { status, latencyMs, error? }
 *   },
 *   responseTimeMs: number
 * }
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "api/health/detailed",
  });

  try {
    routeLogger.info("Detailed health check requested", { requestId });

    const health = await getHealthStatus();
    const version = process.env.APP_VERSION || process.env.npm_package_version || undefined;

    const response = {
      status: health.status,
      timestamp: health.timestamp,
      version,
      services: health.services,
      responseTimeMs: health.responseTimeMs,
    };

    // Use 503 only for unhealthy; degraded still returns 200
    const httpStatus = health.status === "unhealthy" ? 503 : 200;
    const healthHeader = health.status === "ok" ? "ok" : health.status;

    logger.requestSuccess(request, { status: httpStatus }, startTime, { requestId });

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Health-Check": healthHeader,
      },
    });
  } catch (error) {
    routeLogger.error("Detailed health check failed", error, { requestId });
    logger.requestError(request, error, 503, startTime, { requestId });

    const timestamp = new Date().toISOString();

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp,
        services: {},
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Health-Check": "error",
        },
      },
    );
  }
}
