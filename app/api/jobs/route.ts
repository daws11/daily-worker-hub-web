/**
 * Jobs API Routes
 *
 * Endpoints for managing job postings in the Daily Worker Hub platform.
 * Businesses can create jobs, and workers can browse and apply to them.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { parseRequest } from "@/lib/validations";
import { createJobSchema } from "@/lib/validations/job";
import { withRateLimitForMethod } from "@/lib/rate-limit";
import { cache, LRUCache, CACHE_TTL, invalidateJobCache } from "@/lib/cache";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const routeLogger = logger.createApiLogger("jobs");

/**
 * @openapi
 * /api/jobs:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: List all jobs
 *     description: Retrieve a paginated list of job postings with optional filtering and sorting. Public endpoint - no authentication required.
 *     security: []
 *     parameters:
 *       - name: category_id
 *         in: query
 *         description: Filter by category ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: search
 *         in: query
 *         description: Search term for job title
 *         schema:
 *           type: string
 *       - name: wage_min
 *         in: query
 *         description: Minimum wage filter
 *         schema:
 *           type: number
 *       - name: wage_max
 *         in: query
 *         description: Maximum wage filter
 *         schema:
 *           type: number
 *       - name: sort
 *         in: query
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [newest, oldest, highest_wage, lowest_wage]
 *           default: newest
 *       - name: page
 *         in: query
 *         description: Page number
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Items per page
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 total:
 *                   type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function handleGET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "jobs",
  });

  try {
    const { searchParams } = new URL(request.url);

    // Check for cache bypass
    const bypassCache = searchParams.get("nocache") === "true";

    // Generate cache key from query params
    const cacheKey = LRUCache.createKey(
      "jobs",
      "list",
      searchParams.get("category_id") || "all",
      searchParams.get("search") || "none",
      searchParams.get("wage_min") || "0",
      searchParams.get("wage_max") || "max",
      searchParams.get("sort") || "newest",
      searchParams.get("page") || "1",
      searchParams.get("limit") || "20",
    );

    // Try cache first (unless bypassed)
    if (!bypassCache) {
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        logger.requestSuccess(request, { status: 200 }, startTime, {
          requestId,
          resultCount: (cached as { data: unknown[] })?.data?.length || 0,
          cached: true,
        });
        routeLogger.info("Jobs served from cache", { requestId, cacheKey });

        const response = NextResponse.json(cached);
        response.headers.set("X-Cache", "HIT");
        return response;
      }
    }

    // Build query
    const filters: string[] = [];

    if (searchParams.get("category_id")) {
      filters.push(`category_id=eq.${searchParams.get("category_id")}`);
    }

    if (searchParams.get("search")) {
      filters.push(`title=ilike.*${searchParams.get("search")}*`);
    }

    if (searchParams.get("wage_min")) {
      filters.push(`budget_min=gte.${searchParams.get("wage_min")}`);
    }

    if (searchParams.get("wage_max")) {
      filters.push(`budget_max=lte.${searchParams.get("wage_max")}`);
    }

    const sort = (searchParams.get("sort") as any) || "newest";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Add sorting
    let sortParam = "order=created_at.desc";
    switch (sort) {
      case "oldest":
        sortParam = "order=created_at.asc";
        break;
      case "highest_wage":
        sortParam = "order=budget_max.desc";
        break;
      case "lowest_wage":
        sortParam = "order=budget_min.asc";
        break;
    }

    // Build URL with relationships
    const selectParams = [
      "select=*,business:businesses(id,name,is_verified,address,phone),category:categories(id,name,slug)",
    ];

    const allParams = [
      ...selectParams,
      sortParam,
      ...filters,
      `limit=${limit}`,
    ];
    const queryString = allParams.join("&");

    const url = `${SUPABASE_URL}/rest/v1/jobs?${queryString}`;

    // Fetch from Supabase
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      routeLogger.error("Supabase API error", new Error(errorText), {
        status: response.status,
        requestId,
      });
      logger.requestError(
        request,
        new Error(`Supabase error: ${errorText}`),
        response.status,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Failed to fetch jobs from database" },
        { status: response.status },
      );
    }

    const data = await response.json();
    const result = { data, total: data?.length || 0 };

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL.JOBS);

    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      resultCount: data?.length || 0,
    });
    routeLogger.info("Jobs fetched successfully", {
      requestId,
      count: data?.length || 0,
    });

    const jsonResponse = NextResponse.json(result);
    jsonResponse.headers.set("X-Cache", "MISS");
    return jsonResponse;
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/jobs", error, {
      requestId,
    });
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * @openapi
 * /api/jobs:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Create a new job
 *     description: Create a new job posting. Requires business authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JobCreate'
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResponse'
 *       401:
 *         description: Unauthorized - No authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Business not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function handlePOST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "jobs",
  });

  try {
    const { searchParams } = new URL(request.url);

    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      routeLogger.warn("Missing authorization header", { requestId });
      logger.requestError(
        request,
        new Error("Unauthorized - No authentication token"),
        401,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Unauthorized - No authentication token" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const parseResult = await parseRequest(request, createJobSchema);

    if (!parseResult.success) {
      routeLogger.warn("Validation failed", { requestId });
      return (parseResult as unknown as { error: NextResponse }).error;
    }

    const validatedData = parseResult.data;

    // Verify business belongs to user (requires server-side verification)
    // This would need proper auth verification - for now skip or implement properly
    const url = `${SUPABASE_URL}/rest/v1/businesses?id=eq.${validatedData.business_id}&select=id,user_id`;

    const businessResponse = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!businessResponse.ok) {
      const errorText = await businessResponse.text();
      routeLogger.error("Failed to verify business", new Error(errorText), {
        requestId,
        businessId: validatedData.business_id,
      });
      logger.requestError(
        request,
        new Error("Failed to verify business"),
        500,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Failed to verify business" },
        { status: 500 },
      );
    }

    const businessData = await businessResponse.json();
    if (!businessData || businessData.length === 0) {
      routeLogger.warn("Business not found", {
        requestId,
        businessId: validatedData.business_id,
      });
      logger.requestError(
        request,
        new Error("Business not found"),
        404,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    // Create job
    const createUrl = `${SUPABASE_URL}/rest/v1/jobs`;
    const createBody = {
      business_id: validatedData.business_id,
      category_id: validatedData.category_id,
      title: validatedData.title,
      description: validatedData.description,
      requirements: validatedData.requirements || "",
      budget_min: validatedData.budget_min,
      budget_max: validatedData.budget_max,
      hours_needed: validatedData.hours_needed,
      address: validatedData.address,
      lat: validatedData.lat || null,
      lng: validatedData.lng || null,
      deadline: validatedData.deadline || null,
      is_urgent: validatedData.is_urgent || false,
      overtime_multiplier: validatedData.overtime_multiplier || 1.0,
      status: "open",
    };

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: authHeader,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(createBody),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      routeLogger.error("Error creating job", new Error(errorText), {
        requestId,
        businessId: validatedData.business_id,
      });
      logger.requestError(
        request,
        new Error(`Failed to create job: ${errorText}`),
        500,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Failed to create job", details: errorText },
        { status: 500 },
      );
    }

    const job = await createResponse.json();

    // Invalidate job listings cache since a new job was created
    const invalidated = invalidateJobCache();
    routeLogger.info("Job created successfully, cache invalidated", {
      requestId,
      jobId: job?.[0]?.id,
      businessId: validatedData.business_id,
      cacheKeysCleared: invalidated,
    });
    logger.requestSuccess(request, { status: 201 }, startTime, {
      requestId,
      jobId: job?.[0]?.id,
    });

    return NextResponse.json(
      {
        data: job,
        message: "Job created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    routeLogger.error("Unexpected error in POST /api/jobs", error, {
      requestId,
    });
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}

// Export handlers with rate limiting
// GET is public (30 req/min), POST is authenticated (100 req/min)
export const GET = withRateLimitForMethod(
  handleGET as any,
  { type: "api-public", userBased: false },
  ["GET"],
);
export const POST = withRateLimitForMethod(
  handlePOST as any,
  { type: "api-authenticated", userBased: true },
  ["POST"],
);
