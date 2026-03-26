import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import { withRateLimitForMethod } from "@/lib/rate-limit";

const routeLogger = logger.createApiLogger("business/profile");

// GET /api/business/profile - Get current business user profile
async function handleGET(request: Request) {
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

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      return NextResponse.json(
        { error: "Failed to fetch business profile" },
        { status: 500 },
      );
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

      return NextResponse.json(
        { error: "Business profile not found" },
        { status: 404 },
      );
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
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export handlers with rate limiting
// GET is authenticated (100 req/min)
export const GET = withRateLimitForMethod(
  handleGET as any,
  { type: "api-authenticated", userBased: true },
  ["GET"],
);
