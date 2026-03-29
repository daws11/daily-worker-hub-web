import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import {
  updateApplicationStatus,
  acceptApplicationAndCreateBooking,
  withdrawApplication,
} from "@/lib/actions/job-applications";
import { withRateLimitForMethod } from "@/lib/rate-limit";

const routeLogger = logger.createApiLogger("applications/[id]");

type Params = {
  params: Promise<{ id: string }>;
};

// GET /api/applications/[id] - Get single application details
async function handleGET(request: Request, { params }: Params) {
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

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
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

      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/applications/[id] - Update application status
async function handlePATCH(request: Request, { params }: Params) {
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

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

        return NextResponse.json(
          { error: "Only businesses can update application status" },
          { status: 403 },
        );
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

        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 },
        );
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

          return NextResponse.json({ error: result.error }, { status: 400 });
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

        return NextResponse.json({ error: result.error }, { status: 400 });
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

        return NextResponse.json(
          { error: "Only workers can withdraw applications" },
          { status: 403 },
        );
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

        return NextResponse.json(
          { error: "Worker not found" },
          { status: 404 },
        );
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

        return NextResponse.json({ error: result.error }, { status: 400 });
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in PATCH /api/applications/[id]",
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

// Export handlers with rate limiting
// Both GET and PATCH require authentication (100 req/min)
export const GET = withRateLimitForMethod(
  handleGET as any,
  { type: "api-authenticated", userBased: true },
  ["GET"],
);
export const PATCH = withRateLimitForMethod(
  handlePATCH as any,
  { type: "api-authenticated", userBased: true },
  ["PATCH"],
);
