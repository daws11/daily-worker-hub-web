import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import {
  addBookingReview,
  addWorkerReview,
  getBookingReviewStatus,
} from "@/lib/actions/bookings-completion";
import { validateData } from "@/lib/validations";
import { invalidateBookingCache } from "@/lib/cache";
import { z } from "zod";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  forbiddenErrorResponse,
  notFoundErrorResponse,
  validationErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("bookings/[id]/review");

// Simple review submission schema for this endpoint
const reviewSubmissionSchema = z.object({
  rating: z
    .number({
      error: "Rating harus berupa angka",
    })
    .int("Rating harus berupa angka bulat")
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5"),

  review: z
    .string()
    .max(1000, "Review maksimal 1000 karakter")
    .optional()
    .or(z.literal("")),
});

type Params = {
  params: Promise<{ id: string }>;
};

// GET /api/bookings/[id]/review - Get review status for a booking
export async function GET(request: Request, { params }: Params) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "bookings/[id]/review",
  });

  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      routeLogger.warn("Unauthorized access attempt", { requestId });
      logger.requestError(request, new Error("Unauthorized"), 401, startTime, {
        requestId,
      });

      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { id: bookingId } = await params;

    const supabase = await createClient();

    // Verify user has access to this booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, business_id, worker_id")
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

      return notFoundErrorResponse("Booking", bookingId, request);
    }

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

      return notFoundErrorResponse("User", session.user.id, request);
    }

    // Verify access
    if (user.role === "business") {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!business || business.id !== booking.business_id) {
        routeLogger.warn("Unauthorized business access", {
          requestId,
          bookingId,
        });
        logger.requestError(
          request,
          new Error("Unauthorized"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("errors.forbidden", request);
      }
    } else if (user.role === "worker") {
      const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!worker || worker.id !== booking.worker_id) {
        routeLogger.warn("Unauthorized worker access", {
          requestId,
          bookingId,
        });
        logger.requestError(
          request,
          new Error("Unauthorized"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("errors.forbidden", request);
      }
    }

    const result = await getBookingReviewStatus(bookingId);

    if (!result.success) {
      routeLogger.error(
        "Failed to get review status",
        new Error(result.error),
        { requestId, bookingId },
      );
      logger.requestError(request, new Error(result.error), 400, startTime, {
        requestId,
      });

      return errorResponse(400, result.error, request);
    }

    routeLogger.info("Review status fetched", {
      requestId,
      bookingId,
      userId: session.user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: session.user.id,
    });

    return NextResponse.json({ data: result.data });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in GET /api/bookings/[id]/review",
      error,
      { requestId },
    );

    return handleApiError(error, request, "/api/bookings/[id]/review", "GET");
  }
}

// POST /api/bookings/[id]/review - Add a review for a booking
export async function POST(request: Request, { params }: Params) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "bookings/[id]/review",
  });

  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      routeLogger.warn("Unauthorized access attempt", { requestId });
      logger.requestError(request, new Error("Unauthorized"), 401, startTime, {
        requestId,
      });

      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { id: bookingId } = await params;
    const body = await request.json();

    // Validate request body with Zod schema
    const validationResult = validateData(body, reviewSubmissionSchema);

    if (!validationResult.success) {
      const validationError = validationResult as unknown as {
        error: {
          error: string;
          details: Array<{ field: string; message: string; code: string }>;
        };
      };
      routeLogger.warn("Validation failed", {
        requestId,
        bookingId,
        errors: validationError.error.details,
      });
      logger.requestError(
        request,
        new Error(validationError.error.error),
        400,
        startTime,
        { requestId },
      );

      return validationErrorResponse(validationError.error, request);
    }

    const { rating, review } = validationResult.data;

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

      return notFoundErrorResponse("User", session.user.id, request);
    }

    let result;

    if (user.role === "business") {
      // Business reviewing worker
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!business) {
        routeLogger.warn("Business profile not found", {
          requestId,
          userId: session.user.id,
        });
        logger.requestError(
          request,
          new Error("Unauthorized - Business profile not found"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("errors.forbidden", request);
      }

      result = await addBookingReview(
        bookingId,
        rating,
        review || "",
        business.id,
      );

      routeLogger.info("Business review submitted", {
        requestId,
        bookingId,
        rating,
        businessId: business.id,
        userId: session.user.id,
      });
    } else if (user.role === "worker") {
      // Worker reviewing business
      const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!worker) {
        routeLogger.warn("Worker profile not found", {
          requestId,
          userId: session.user.id,
        });
        logger.requestError(
          request,
          new Error("Unauthorized - Worker profile not found"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("errors.forbidden", request);
      }

      result = await addWorkerReview(
        bookingId,
        rating,
        review || "",
        worker.id,
      );

      routeLogger.info("Worker review submitted", {
        requestId,
        bookingId,
        rating,
        workerId: worker.id,
        userId: session.user.id,
      });
    } else {
      routeLogger.warn("Invalid user role for review", {
        requestId,
        userRole: user.role,
      });
      logger.requestError(
        request,
        new Error("Unauthorized - Invalid user role"),
        403,
        startTime,
        { requestId },
      );

      return forbiddenErrorResponse("errors.forbidden", request);
    }

    if (!result.success) {
      routeLogger.error("Failed to submit review", new Error(result.error), {
        requestId,
        bookingId,
      });
      logger.requestError(request, new Error(result.error), 400, startTime, {
        requestId,
      });

      return errorResponse(400, result.error, request);
    }

    // Invalidate booking caches since a review was submitted
    const invalidated = invalidateBookingCache(bookingId);
    routeLogger.info("Cache invalidated after review submission", {
      requestId,
      bookingId,
      cacheKeysCleared: invalidated,
    });

    logger.requestSuccess(request, { status: 201 }, startTime, {
      requestId,
      userId: session.user.id,
    });

    return NextResponse.json(
      {
        data: result.data,
        message: "Review submitted successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/bookings/[id]/review",
      error,
      { requestId },
    );

    return handleApiError(error, request, "/api/bookings/[id]/review", "POST");
  }
}
