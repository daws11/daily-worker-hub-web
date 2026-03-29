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
import { withRateLimitForMethod } from "@/lib/rate-limit";

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
async function handleGET() {
  try {
    const spec = getOpenApiJson();

    return new NextResponse(spec, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error generating OpenAPI spec:", error);

    return NextResponse.json(
      { error: "Failed to generate OpenAPI specification" },
      { status: 500 },
    );
  }
}

// Export handlers with rate limiting
export const GET = withRateLimitForMethod(
  handleGET as any,
  { type: "api-public", userBased: false },
  ["GET"],
);
