/**
 * Booking Check-In API Route
 *
 * Handles worker check-in to a booking.
 * Workers use this endpoint to mark their arrival at a job.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import { checkInBooking } from "@/lib/actions/bookings-completion";
import { withRateLimit } from "@/lib/rate-limit";
import { invalidateBookingCache } from "@/lib/cache";

const routeLogger = logger.createApiLogger("bookings/[id]/check-in");

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * @openapi
 * /api/bookings/{id}/check-in:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Check in to a booking
 *     description: Worker checks in to a booking to mark their arrival at the job location
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Booking ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Check-in successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Worker not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Check-in failed (e.g., already checked in)
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
async function handlePOST(request: Request, { params }: Params) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "bookings/[id]/check-in",
  });

  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      routeLogger.warn("Unauthorized access attempt", { requestId });
      logger.requestError(request, new Error("Unauthorized"), 401, startTime, {
        requestId,
      });

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    const supabase = await createClient();

    // Verify user is a worker
    const { data: worker } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!worker) {
      routeLogger.warn("Worker not found or unauthorized", {
        requestId,
        userId: session.user.id,
      });
      logger.requestError(
        request,
        new Error("Unauthorized - Worker not found"),
        403,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Unauthorized - Worker not found" },
        { status: 403 },
      );
    }

    const result = await checkInBooking(bookingId, worker.id);

    if (!result.success) {
      routeLogger.error("Check-in failed", new Error(result.error), {
        requestId,
        bookingId,
        workerId: worker.id,
      });
      logger.requestError(request, new Error(result.error), 400, startTime, {
        requestId,
      });

      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Invalidate booking caches since check-in state changed
    const invalidated = invalidateBookingCache(bookingId);
    routeLogger.info("Check-in successful", {
      requestId,
      bookingId,
      workerId: worker.id,
      userId: session.user.id,
      cacheKeysCleared: invalidated,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: session.user.id,
    });

    return NextResponse.json({
      data: result.data,
      message: "Check-in successful",
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/bookings/[id]/check-in",
      error,
      { requestId },
    );
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export handler with rate limiting
export const POST = withRateLimit(handlePOST as any, {
  type: "api-authenticated",
  userBased: true,
});
