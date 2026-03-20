import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import { checkOutBooking } from "@/lib/actions/bookings-completion";
import { validateData } from "@/lib/validations";
import { checkOutSchema } from "@/lib/validations/booking";
import { withRateLimit } from "@/lib/rate-limit";

const routeLogger = logger.createApiLogger("bookings/[id]/check-out");

type Params = {
  params: Promise<{ id: string }>;
};

// POST /api/bookings/[id]/check-out - Worker checks out from a booking
async function handlePOST(request: Request, { params }: Params) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "bookings/[id]/check-out",
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
    const body = await request.json().catch(() => ({}));

    // Validate request body
    const validationResult = validateData(
      {
        booking_id: bookingId,
        worker_id: "", // Will be replaced with actual worker ID
        ...body,
      },
      checkOutSchema,
    );

    if (!validationResult.success) {
      const validationError = validationResult as unknown as {
        error: {
          error: string;
          details: Array<{ field: string; message: string; code: string }>;
        };
      };
      routeLogger.warn("Validation failed", {
        requestId,
        errors: validationError.error.details,
      });
      logger.requestError(
        request,
        new Error(validationError.error.error),
        400,
        startTime,
        { requestId },
      );

      return NextResponse.json(validationError.error, { status: 400 });
    }

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

    const result = await checkOutBooking(
      bookingId,
      worker.id,
      body.actual_hours,
      body.notes,
    );

    if (!result.success) {
      routeLogger.error("Check-out failed", new Error(result.error), {
        requestId,
        bookingId,
        workerId: worker.id,
      });
      logger.requestError(request, new Error(result.error), 400, startTime, {
        requestId,
      });

      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    routeLogger.info("Check-out successful", {
      requestId,
      bookingId,
      workerId: worker.id,
      actualHours: body.actual_hours,
      userId: session.user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: session.user.id,
    });

    return NextResponse.json({
      data: result.data,
      message: "Check-out successful",
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/bookings/[id]/check-out",
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
