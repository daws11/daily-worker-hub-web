/**
 * Worker Badges API Routes
 *
 * Endpoints for retrieving worker badges and achievements in the Daily Worker Hub platform.
 */

import { NextResponse } from "next/server";
import {
  getWorkerAchievements,
  getWorkerEarnedBadges,
  getWorkerBadgeProgress,
  fetchWorkerStats,
} from "@/lib/badges";
import { cache, LRUCache, CACHE_TTL } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { validationErrorResponse, handleApiError, errorResponse } from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("workers/badges");

/**
 * Generate cache key for worker badges
 */
function getWorkerBadgesCacheKey(workerId: string, filter: string): string {
  return LRUCache.createKey("badges", "worker", workerId, filter);
}

/**
 * Fetch worker badges data (extracted for caching)
 */
async function fetchWorkerBadgesData(workerId: string, filter: string) {
  // Fetch badges based on filter
  let badges;
  switch (filter) {
    case "earned":
      badges = await getWorkerEarnedBadges(workerId);
      break;
    case "progress":
      badges = await getWorkerBadgeProgress(workerId);
      break;
    case "all":
    default:
      badges = await getWorkerAchievements(workerId);
      break;
  }

  // Get worker stats for summary
  const stats = await fetchWorkerStats(workerId);

  return {
    data: badges,
    stats: stats
      ? {
          completedJobs: stats.completedJobs,
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews,
          attendanceRate: stats.attendanceRate,
        }
      : null,
  };
}

/**
 * GET /api/workers/badges
 * Get current worker's badges and progress
 *
 * Cache Strategy:
 * - Badge definitions are cached for 1 hour (rarely change)
 * - Worker badges are cached for 10 minutes (may change with progress)
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "workers/badges",
  });

  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("worker_id");
    const filter = searchParams.get("filter") || "all"; // 'all' | 'earned' | 'progress'

    // Check for cache bypass
    const bypassCache = searchParams.get("nocache") === "true";

    // Get authorization header
    const authHeader = request.headers.get("authorization");

    if (!workerId) {
      routeLogger.warn("Missing required parameter: worker_id", { requestId });
      logger.requestError(
        request,
        new Error("Missing required parameter: worker_id"),
        400,
        startTime,
        { requestId },
      );

      return validationErrorResponse(
        { reason: "worker_id is required" },
        request,
      );
    }

    const cacheKey = getWorkerBadgesCacheKey(workerId, filter);

    // Try cache first (unless bypassed)
    if (!bypassCache) {
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        const response = NextResponse.json(cached);
        response.headers.set("X-Cache", "HIT");
        return response;
      }
    }

    // Fetch fresh data
    const result = await fetchWorkerBadgesData(workerId, filter);

    if (!result || result.data === undefined) {
      routeLogger.error(
        "Failed to fetch worker badges data",
        new Error("Invalid result from fetchWorkerBadgesData"),
        { requestId, workerId, filter },
      );
      logger.requestError(
        request,
        new Error("Failed to fetch worker badges"),
        500,
        startTime,
        { requestId },
      );

      return errorResponse(500, "errors.serverError", request);
    }

    // Cache the result (10 minutes TTL - badges can change with progress)
    cache.set(cacheKey, result, CACHE_TTL.BADGES);

    const response = NextResponse.json(result);
    response.headers.set("X-Cache", "MISS");

    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      workerId,
      filter,
    });

    return response;
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/workers/badges", error, {
      requestId,
    });

    return handleApiError(error, request, "/api/workers/badges", "GET");
  }
}
