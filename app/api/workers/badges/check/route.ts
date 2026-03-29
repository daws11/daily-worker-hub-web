import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkAndAwardBadges, getWorkerAchievements } from "@/lib/badges";
import { withRateLimitForMethod } from "@/lib/rate-limit";

const routeLogger = logger.createApiLogger("workers-badges-check");

/**
 * POST /api/workers/badges/check
 * Check and award new badges for a worker (internal trigger)
 *
 * Body: { worker_id: string }
 */
async function handlePOST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "workers-badges-check",
  });

  try {
    const body = await request.json();
    const { worker_id } = body;

    if (!worker_id) {
      routeLogger.warn("Missing worker_id in request", { requestId });
      logger.requestError(
        request,
        new Error("worker_id is required"),
        400,
        startTime,
        { requestId },
      );
      return NextResponse.json(
        { error: "worker_id is required" },
        { status: 400 },
      );
    }

    // Check and award badges
    const result = await checkAndAwardBadges(worker_id);

    // Get updated achievements
    const allBadges = await getWorkerAchievements(worker_id);

    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      workerId: worker_id,
      awardedCount: result.awarded.length,
    });
    routeLogger.info("Badges checked and awarded", {
      requestId,
      workerId: worker_id,
      awardedCount: result.awarded.length,
    });

    return NextResponse.json({
      success: true,
      awarded: result.awarded,
      awardedCount: result.awarded.length,
      progress: result.progress,
      allBadges,
    });
  } catch (error) {
    routeLogger.error("Unexpected error in POST /api/workers/badges/check", error, {
      requestId,
    });
    logger.requestError(request, error, 500, startTime, { requestId });
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}

// Export handler with rate limiting
export const POST = withRateLimitForMethod(
  handlePOST as any,
  { type: "api-authenticated", userBased: true },
  ["POST"],
);
