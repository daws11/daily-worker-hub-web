import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const routeLogger = logger.createApiLogger("api/health");

/**
 * Lightweight health check endpoint for monitoring and uptime checks.
 *
 * Returns basic service status without requiring authentication.
 * Can be used by uptime monitoring services (e.g., UptimeRobot, Pingdom).
 *
 * Response shape:
 * {
 *   status: "ok" | "degraded",
 *   timestamp: ISO8601 string,
 *   version: string | undefined,
 *   services: {
 *     uptime: "ok" | "error"
 *   }
 * }
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "api/health",
  });

  try {
    routeLogger.info("Health check requested", { requestId });

    const timestamp = new Date().toISOString();
    const version = process.env.APP_VERSION || process.env.npm_package_version || undefined;

    const response = {
      status: "ok" as const,
      timestamp,
      version,
      services: {
        uptime: "ok" as const,
      },
    };

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Health-Check": "ok",
      },
    });
  } catch (error) {
    routeLogger.error("Health check failed", error, { requestId });
    logger.requestError(request, error, 503, startTime, { requestId });

    const timestamp = new Date().toISOString();

    return NextResponse.json(
      {
        status: "degraded",
        timestamp,
        services: {
          uptime: "error",
        },
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
