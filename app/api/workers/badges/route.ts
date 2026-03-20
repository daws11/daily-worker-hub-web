import { NextResponse } from "next/server";
import {
  getWorkerAchievements,
  getWorkerEarnedBadges,
  getWorkerBadgeProgress,
  fetchWorkerStats,
} from "@/lib/badges";
import { cache, LRUCache, CACHE_TTL } from "@/lib/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("worker_id");
    const filter = searchParams.get("filter") || "all"; // 'all' | 'earned' | 'progress'

    // Check for cache bypass
    const bypassCache = searchParams.get("nocache") === "true";

    // Get authorization header
    const authHeader = request.headers.get("authorization");

    if (!workerId) {
      return NextResponse.json(
        { error: "worker_id is required" },
        { status: 400 },
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

    // Cache the result (10 minutes TTL - badges can change with progress)
    cache.set(cacheKey, result, CACHE_TTL.BADGES);

    const response = NextResponse.json(result);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("Error in GET /api/workers/badges:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}
