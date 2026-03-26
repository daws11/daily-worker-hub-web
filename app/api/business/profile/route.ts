import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  notFoundErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("business/profile");

// GET /api/business/profile - Get current business user profile
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "business/profile",
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

    const supabase = await createClient();

    // Fetch business profile for the user
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      routeLogger.error("Error fetching business profile", error, {
        requestId,
        userId: session.user.id,
      });
      logger.requestError(request, error, 500, startTime, { requestId });

      return errorResponse(500, "Failed to fetch business profile", request);
    }

    if (!business) {
      routeLogger.warn("Business profile not found", {
        requestId,
        userId: session.user.id,
      });
      logger.requestError(
        request,
        new Error("Business profile not found"),
        404,
        startTime,
        { requestId },
      );

      return notFoundErrorResponse("Business", session.user.id, request);
    }

    routeLogger.info("Business profile fetched successfully", {
      requestId,
      businessId: business.id,
      userId: session.user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: session.user.id,
    });

    return NextResponse.json({ data: business });
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/business/profile", error, {
      requestId,
    });

    return handleApiError(error, request, "/api/business/profile", "GET");
  }
}
