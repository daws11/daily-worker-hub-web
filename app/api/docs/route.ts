/**
 * OpenAPI Specification Endpoint
 *
 * GET /api/docs
 *
 * Returns the OpenAPI specification as JSON.
 * This endpoint is public and does not require authentication.
 */

import { NextResponse } from "next/server";
import { getOpenApiJson } from "@/lib/openapi";
import { logger } from "@/lib/logger";
import { errorResponse, handleApiError } from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("docs");

/**
 * @openapi
 * /api/docs:
 *   get:
 *     tags:
 *       - Documentation
 *     summary: Get OpenAPI specification
 *     description: Returns the complete OpenAPI specification for the Daily Worker Hub API in JSON format
 *     security: []
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: OpenAPI 3.0.3 specification object
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "docs",
  });

  try {
    const spec = getOpenApiJson();

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return new NextResponse(spec, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/docs", error, { requestId });

    return handleApiError(error, request, "/api/docs", "GET");
  }
}
