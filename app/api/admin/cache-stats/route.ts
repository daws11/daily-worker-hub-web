/**
 * Cache Stats API Route
 *
 * Admin endpoint to view cache statistics and manage cache.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  cache,
  invalidateJobCache,
  invalidateWorkerCache,
  invalidateUserCache,
  invalidateBadgeCache,
  invalidateCategoryCache,
} from "@/lib/cache/index";
import { logger } from "@/lib/logger";

const routeLogger = logger.createApiLogger("cache-stats");

/**
 * Verify admin authentication
 * TODO: Implement proper admin auth check
 */
async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");

  // For now, check for a simple admin secret
  // In production, this should use proper admin authentication
  const adminSecret = process.env.ADMIN_API_SECRET;

  if (!adminSecret) {
    // If no admin secret is configured, deny access
    return false;
  }

  return authHeader === `Bearer ${adminSecret}`;
}

/**
 * @openapi
 * /api/admin/cache-stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get cache statistics
 *     description: View cache hit/miss ratios, size, and entry details. Requires admin authentication.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     hits:
 *                       type: integer
 *                     misses:
 *                       type: integer
 *                     size:
 *                       type: integer
 *                     maxSize:
 *                       type: integer
 *                     hitRate:
 *                       type: number
 *                 entries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       hits:
 *                         type: integer
 *                       age:
 *                         type: integer
 *                       ttlRemaining:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const isAuthorized = await verifyAdminAuth(request);

    if (!isAuthorized) {
      routeLogger.warn("Unauthorized cache stats access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get cache stats (async for Redis backend)
    const stats = await cache.getStats();

    // Group entries by namespace for better readability
    const entriesByNamespace: Record<string, typeof stats.entries> = {};

    for (const entry of stats.entries) {
      const namespace = entry.key.split(":")[0] || "other";
      if (!entriesByNamespace[namespace]) {
        entriesByNamespace[namespace] = [];
      }
      entriesByNamespace[namespace].push(entry);
    }

    routeLogger.info("Cache stats retrieved", {
      size: stats.size,
      hitRate: stats.hitRate,
    });

    return NextResponse.json({
      stats: {
        hits: stats.hits,
        misses: stats.misses,
        size: stats.size,
        maxSize: stats.maxSize,
        hitRate: stats.hitRate,
        hitRatePercent: `${Math.round(stats.hitRate * 100)}%`,
      },
      entriesByNamespace,
      totalEntries: stats.entries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    routeLogger.error("Error getting cache stats", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * @openapi
 * /api/admin/cache-stats:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Clear cache
 *     description: Clear all or specific cache entries. Requires admin authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: namespace
 *         in: query
 *         description: Namespace to clear (jobs, workers, badges, categories, sessions). If not provided, clears all.
 *         schema:
 *           type: string
 *       - name: key
 *         in: query
 *         description: Specific key to delete
 *         schema:
 *           type: string
 *       - name: workerId
 *         in: query
 *         description: Clear caches for a specific worker
 *         schema:
 *           type: string
 *       - name: jobId
 *         in: query
 *         description: Clear caches for a specific job
 *         schema:
 *           type: string
 *       - name: userId
 *         in: query
 *         description: Clear caches for a specific user session
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin auth
    const isAuthorized = await verifyAdminAuth(request);

    if (!isAuthorized) {
      routeLogger.warn("Unauthorized cache clear attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get("namespace");
    const key = searchParams.get("key");
    const workerId = searchParams.get("workerId");
    const jobId = searchParams.get("jobId");
    const userId = searchParams.get("userId");

    let cleared = 0;
    let message = "";

    // Handle specific invalidation
    if (workerId) {
      cleared = invalidateWorkerCache(workerId);
      message = `Cleared ${cleared} cache entries for worker ${workerId}`;
    } else if (jobId) {
      cleared = invalidateJobCache(jobId);
      message = `Cleared ${cleared} cache entries for job ${jobId}`;
    } else if (userId) {
      cleared = invalidateUserCache(userId);
      message = `Cleared ${cleared} cache entries for user ${userId}`;
    } else if (key) {
      const deleted = await cache.del(key);
      cleared = deleted ? 1 : 0;
      message = `Cleared cache key: ${key}`;
    } else if (namespace) {
      // Clear by namespace
      switch (namespace) {
        case "jobs":
          cleared = await cache.delPattern("jobs:*");
          break;
        case "workers":
          cleared = await cache.delPattern("workers:*");
          break;
        case "badges":
          cleared = invalidateBadgeCache();
          break;
        case "categories":
          cleared = invalidateCategoryCache();
          break;
        case "sessions":
          cleared = await cache.delPattern("sessions:*");
          break;
        default:
          cleared = await cache.delPattern(`${namespace}:*`);
      }
      message = `Cleared ${cleared} cache entries for namespace: ${namespace}`;
    } else {
      // Clear all
      const statsBefore = await cache.getStats();
      await cache.flush();
      cleared = statsBefore.size;
      message = `Cleared all ${cleared} cache entries`;
    }

    routeLogger.info("Cache cleared", {
      cleared,
      namespace,
      key,
      workerId,
      jobId,
      userId,
    });

    return NextResponse.json({
      success: true,
      message,
      cleared,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    routeLogger.error("Error clearing cache", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * @openapi
 * /api/admin/cache-stats:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Warm up cache
 *     description: Pre-populate cache with frequently accessed data. Requires admin authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               warmup:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [jobs, categories, badges]
 *     responses:
 *       200:
 *         description: Cache warmed up successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const isAuthorized = await verifyAdminAuth(request);

    if (!isAuthorized) {
      routeLogger.warn("Unauthorized cache warmup attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { warmup = [] } = body;

    const results: Record<string, { success: boolean; message: string }> = {};

    // Note: Cache warmup would typically involve pre-fetching data
    // This is a placeholder for future implementation
    for (const item of warmup) {
      switch (item) {
        case "jobs":
          results.jobs = {
            success: true,
            message:
              "Job cache warmup scheduled - next GET request will populate cache",
          };
          break;
        case "categories":
          results.categories = {
            success: true,
            message:
              "Category cache warmup scheduled - next GET request will populate cache",
          };
          break;
        case "badges":
          results.badges = {
            success: true,
            message:
              "Badge cache warmup scheduled - next GET request will populate cache",
          };
          break;
        default:
          results[item] = {
            success: false,
            message: `Unknown warmup target: ${item}`,
          };
      }
    }

    routeLogger.info("Cache warmup requested", { warmup });

    return NextResponse.json({
      success: true,
      message: "Cache warmup completed",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    routeLogger.error("Error warming up cache", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}
