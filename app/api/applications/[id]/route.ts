import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import {
  updateApplicationStatus,
  acceptApplicationAndCreateBooking,
  withdrawApplication,
} from "@/lib/actions/job-applications";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  forbiddenErrorResponse,
  notFoundErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("applications/[id]");

type Params = {
  params: Promise<{ id: string }>;
};

// GET /api/applications/[id] - Get single application details
export async function GET(request: Request, { params }: Params) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "applications/[id]",
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

    const { id } = await params;
    const supabase = await createClient();

    // Get application with related data
    const { data: application, error } = await supabase
      .from("job_applications")
      .select(
        `
        *,
        jobs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          deadline,
          address
        ),
        workers (
          id,
          full_name,
          phone,
          bio,
          avatar_url,
          tier,
          rating,
          reliability_score,
          jobs_completed
        ),
        businesses (
          id,
          name,
          phone,
          email
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error || !application) {
      routeLogger.warn("Application not found", {
        requestId,
        applicationId: id,
      });
      logger.requestError(
        request,
        new Error("Application not found"),
        404,
        startTime,
        { requestId },
      );

      return notFoundErrorResponse("Application", id, request);
    }

    // Verify user has access to this application
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

    if (user.role === "worker") {
      // Verify worker owns this application
      const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!worker || worker.id !== application.worker_id) {
        routeLogger.warn("Unauthorized worker access", {
          requestId,
          applicationId: id,
        });
        logger.requestError(
          request,
          new Error("Unauthorized"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("Unauthorized - Worker does not own this application", request);
      }
    } else if (user.role === "business") {
      // Verify business owns this application
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!business || business.id !== application.business_id) {
        routeLogger.warn("Unauthorized business access", {
          requestId,
          applicationId: id,
        });
        logger.requestError(
          request,
          new Error("Unauthorized"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("Unauthorized - Business does not own this application", request);
      }
    }

    routeLogger.info("Application fetched successfully", {
      requestId,
      applicationId: id,
      userId: session.user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: session.user.id,
    });

    return NextResponse.json({ data: application });
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/applications/[id]", error, {
      requestId,
    });

    return handleApiError(error, request, "/api/applications/[id]", "GET");
  }
}

// PATCH /api/applications/[id] - Update application status
export async function PATCH(request: Request, { params }: Params) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "applications/[id]",
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

    const { id } = await params;
    const body = await request.json();

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

    // Business actions: shortlist, accept, reject
    if (
      body.status &&
      ["shortlisted", "accepted", "rejected"].includes(body.status)
    ) {
      if (user.role !== "business") {
        routeLogger.warn("Non-business tried to update status", {
          requestId,
          applicationId: id,
          userRole: user.role,
        });
        logger.requestError(
          request,
          new Error("Only businesses can update application status"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("Only businesses can update application status", request);
      }

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

        return notFoundErrorResponse("Business", session.user.id, request);
      }

      // If accepting, also create booking
      if (body.status === "accepted" && body.create_booking) {
        const result = await acceptApplicationAndCreateBooking(id, business.id);

        if (!result.success) {
          routeLogger.error(
            "Failed to accept application and create booking",
            new Error(result.error),
            { requestId, applicationId: id },
          );
          logger.requestError(
            request,
            new Error(result.error),
            400,
            startTime,
            { requestId },
          );

          return errorResponse(400, result.error, request);
        }

        routeLogger.info("Application accepted and booking created", {
          requestId,
          applicationId: id,
          bookingId: result.data?.booking.id,
          userId: session.user.id,
        });
        logger.requestSuccess(request, { status: 200 }, startTime, {
          requestId,
          userId: session.user.id,
        });

        return NextResponse.json({
          data: result.data,
          message: "Application accepted and booking created",
        });
      }

      // Otherwise just update status
      const result = await updateApplicationStatus(
        id,
        body.status as "shortlisted" | "accepted" | "rejected",
        business.id,
      );

      if (!result.success) {
        routeLogger.error(
          "Failed to update application status",
          new Error(result.error),
          { requestId, applicationId: id },
        );
        logger.requestError(request, new Error(result.error), 400, startTime, {
          requestId,
        });

        return errorResponse(400, result.error, request);
      }

      routeLogger.info("Application status updated", {
        requestId,
        applicationId: id,
        newStatus: body.status,
        userId: session.user.id,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, {
        requestId,
        userId: session.user.id,
      });

      return NextResponse.json({
        data: result.data,
        message: `Application ${body.status}`,
      });
    }

    // Worker action: withdraw
    if (body.status === "withdrawn") {
      if (user.role !== "worker") {
        routeLogger.warn("Non-worker tried to withdraw", {
          requestId,
          applicationId: id,
          userRole: user.role,
        });
        logger.requestError(
          request,
          new Error("Only workers can withdraw applications"),
          403,
          startTime,
          { requestId },
        );

        return forbiddenErrorResponse("Only workers can withdraw applications", request);
      }

      // Get worker ID
      const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!worker) {
        routeLogger.warn("Worker not found", {
          requestId,
          userId: session.user.id,
        });
        logger.requestError(
          request,
          new Error("Worker not found"),
          404,
          startTime,
          { requestId },
        );

        return notFoundErrorResponse("Worker", session.user.id, request);
      }

      const result = await withdrawApplication(id, worker.id);

      if (!result.success) {
        routeLogger.error(
          "Failed to withdraw application",
          new Error(result.error),
          { requestId, applicationId: id },
        );
        logger.requestError(request, new Error(result.error), 400, startTime, {
          requestId,
        });

        return errorResponse(400, result.error, request);
      }

      routeLogger.info("Application withdrawn", {
        requestId,
        applicationId: id,
        userId: session.user.id,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, {
        requestId,
        userId: session.user.id,
      });

      return NextResponse.json({
        data: result.data,
        message: "Application withdrawn",
      });
    }

    routeLogger.warn("Invalid action", { requestId, applicationId: id });
    logger.requestError(request, new Error("Invalid action"), 400, startTime, {
      requestId,
    });

    return errorResponse(400, "Invalid action", request);
  } catch (error) {
    routeLogger.error(
      "Unexpected error in PATCH /api/applications/[id]",
      error,
      { requestId },
    );

    return handleApiError(error, request, "/api/applications/[id]", "PATCH");
  }
}
