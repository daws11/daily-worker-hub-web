/**
 * Worker Badges Check API Route
 *
 * Endpoints for checking and awarding badges to workers.
 * Internal trigger endpoint for badge processing.
 */

import { NextResponse } from "next/server";
import { checkAndAwardBadges, getWorkerAchievements } from "@/lib/badges";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  handleApiError,
  validationErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("workers/badges/check");

/**
 * @openapi
 * /api/workers/badges/check:
 *   post:
 *     tags:
 *       - Workers
 *     summary: Check and award badges for a worker
 *     description: Internal trigger to check and award new badges for a worker based on their achievements.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - worker_id
 *             properties:
 *               worker_id:
 *                 type: string
 *                 format: uuid
 *                 description: Worker ID to check badges for
 *     responses:
 *       200:
 *         description: Badges checked and awarded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 awarded:
 *                   type: array
 *                   items:
 *                     type: object
 *                 awardedCount:
 *                   type: number
 *                 progress:
 *                   type: object
 *                 allBadges:
 *                   type: array
 *       400:
 *         description: Missing required parameters
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
export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "workers/badges/check",
  });

  try {
    const body = await request.json();
    const { worker_id } = body;

    if (!worker_id) {
      routeLogger.warn("Missing required field: worker_id", { requestId });
      logger.requestError(
        request,
        new Error("Missing required field: worker_id"),
        400,
        startTime,
        { requestId },
      );

      return validationErrorResponse(
        { reason: "Missing required field", required: ["worker_id"] },
        request,
      );
    }

    // Check and award badges
    const result = await checkAndAwardBadges(worker_id);

    // Get updated achievements
    const allBadges = await getWorkerAchievements(worker_id);

    routeLogger.info("Badge check completed", {
      requestId,
      workerId: worker_id,
      awardedCount: result.awarded.length,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
    });

    return NextResponse.json({
      success: true,
      awarded: result.awarded,
      awardedCount: result.awarded.length,
      progress: result.progress,
      allBadges,
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/workers/badges/check",
      error,
      { requestId },
    );

    return handleApiError(error, request, "/api/workers/badges/check", "POST");
  }
}
