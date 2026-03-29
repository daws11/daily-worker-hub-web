/**
 * Skills API Route
 *
 * Endpoints for managing skills in the Daily Worker Hub platform.
 * Skills are used to match workers with jobs.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cache, LRUCache, CACHE_TTL } from "@/lib/cache";
import { errorResponse, handleApiError } from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("skills");

// Cache key for skills list
const SKILLS_CACHE_KEY = LRUCache.createKey("skills", "all");

/**
 * @openapi
 * /api/skills:
 *   get:
 *     tags:
 *       - Skills
 *     summary: Get all skills
 *     description: Retrieve all available skills. Public endpoint - no authentication required.
 *     security: []
 *     responses:
 *       200:
 *         description: List of skills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "skills",
  });

  try {
    // Check for cache bypass
    const { searchParams } = new URL(request.url);
    const bypassCache = searchParams.get("nocache") === "true";

    // Try cache first (unless bypassed)
    if (!bypassCache) {
      const cached = cache.get(SKILLS_CACHE_KEY);
      if (cached !== null) {
        logger.requestSuccess(request, { status: 200 }, startTime, {
          requestId,
          count: (cached as { data: unknown[] })?.data?.length || 0,
          cached: true,
        });
        routeLogger.info("Skills served from cache", { requestId });

        const response = NextResponse.json(cached);
        response.headers.set("X-Cache", "HIT");
        return response;
      }
    }

    // Fetch from database
    const supabase = await createClient();

    const { data: skills, error } = await supabase
      .from("skills")
      .select("id, name, slug, created_at")
      .order("name", { ascending: true });

    if (error) {
      routeLogger.error("Error fetching skills", error, { requestId });
      logger.requestError(request, error, 500, startTime, { requestId });

      return errorResponse(500, "Failed to fetch skills", request);
    }

    const result = { data: skills };

    // Cache the result (1 hour TTL)
    cache.set(SKILLS_CACHE_KEY, result, CACHE_TTL.CATEGORIES);

    routeLogger.info("Skills fetched successfully", {
      requestId,
      count: skills?.length || 0,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      count: skills?.length || 0,
    });

    const response = NextResponse.json(result);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/skills", error, {
      requestId,
    });

    return handleApiError(error, request, "/api/skills", "GET");
  }
}
