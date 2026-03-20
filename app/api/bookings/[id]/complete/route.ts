import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import {
  completeBooking,
  confirmBookingCompletion,
} from "@/lib/actions/bookings-completion";
import { withRateLimit } from "@/lib/rate-limit";

const routeLogger = logger.createApiLogger("bookings/[id]/complete");

type Params = {
  params: Promise<{ id: string }>;
};

// POST /api/bookings/[id]/complete - Complete a booking
// Can be called by:
// - Business: To finalize the booking and trigger payment
// - Both: To confirm completion after review period
async function handlePOST(request: Request, { params }: Params) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "bookings/[id]/complete",
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

    const supabase = await createClient();

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      routeLogger.warn("User not found", {
        requestId,
        userId: session.user.id,
      });
      logger.requestError(
        request,
        new Error("User not found"),
        404,
        startTime,
        { requestId },
      );

      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get booking status
    const { data: booking } = await supabase
      .from("bookings")
      .select("status, business_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      routeLogger.warn("Booking not found", { requestId, bookingId });
      logger.requestError(
        request,
        new Error("Booking not found"),
        404,
        startTime,
        { requestId },
      );

      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Business actions
    if (user.role === "business") {
      // Get business ID
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!business) {
        routeLogger.warn("Business not found", {
          requestId,
          userId: session.user.id,
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

      // Verify business owns this booking
      if (booking.business_id !== business.id) {
        routeLogger.warn("Unauthorized - Not your booking", {
          requestId,
          bookingId,
          businessId: business.id,
        });
        logger.requestError(
          request,
          new Error("Unauthorized - Not your booking"),
          403,
          startTime,
          { requestId },
        );

        return NextResponse.json(
          { error: "Unauthorized - Not your booking" },
          { status: 403 },
        );
      }

      // If booking is already completed (after worker checkout), confirm completion
      if (booking.status === "completed" && body.confirm) {
        const result = await confirmBookingCompletion(bookingId, business.id);

        if (!result.success) {
          routeLogger.error(
            "Failed to confirm booking completion",
            new Error(result.error),
            { requestId, bookingId, businessId: business.id },
          );
          logger.requestError(
            request,
            new Error(result.error),
            400,
            startTime,
            { requestId },
          );

          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        routeLogger.info("Booking completion confirmed and payment released", {
          requestId,
          bookingId,
          businessId: business.id,
          userId: session.user.id,
        });
        logger.requestSuccess(request, { status: 200 }, startTime, {
          requestId,
          userId: session.user.id,
        });

        return NextResponse.json({
          data: result.data,
          message: "Booking completion confirmed and payment released",
        });
      }

      // Otherwise, complete the booking
      const result = await completeBooking(bookingId, business.id, {
        finalPrice: body.final_price,
        actualHours: body.actual_hours,
        notes: body.notes,
      });

      if (!result.success) {
        routeLogger.error(
          "Failed to complete booking",
          new Error(result.error),
          { requestId, bookingId, businessId: business.id },
        );
        logger.requestError(request, new Error(result.error), 400, startTime, {
          requestId,
        });

        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      routeLogger.info("Booking completed successfully", {
        requestId,
        bookingId,
        businessId: business.id,
        finalPrice: body.final_price,
        userId: session.user.id,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, {
        requestId,
        userId: session.user.id,
      });

      return NextResponse.json({
        data: result.data,
        message: "Booking completed successfully",
      });
    }

    routeLogger.warn("Only businesses can complete bookings", {
      requestId,
      bookingId,
      userRole: user.role,
    });
    logger.requestError(
      request,
      new Error("Unauthorized - Only businesses can complete bookings"),
      403,
      startTime,
      { requestId },
    );

    return NextResponse.json(
      { error: "Unauthorized - Only businesses can complete bookings" },
      { status: 403 },
    );
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/bookings/[id]/complete",
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
