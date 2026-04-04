/**
 * Worker Toggle Online API
 *
 * POST /api/workers/toggle-online
 * Sets a worker as online and begins receiving job dispatches.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import { DISPATCH_CONFIG } from "@/lib/dispatch-engine";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("workers/toggle-online");

export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "workers/toggle-online",
  });

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      routeLogger.warn("Unauthorized toggle-online attempt", { requestId });
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const body = await request.json();
    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return errorResponse(400, "lat and lng are required", request);
    }

    const supabase = await createClient();

    // Lookup worker by user_id
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id, is_online")
      .eq("user_id", session.user.id)
      .single();

    if (workerError || !worker) {
      routeLogger.warn("Worker not found", { requestId, userId: session.user.id });
      return errorResponse(404, "Worker profile not found", request);
    }

    const now = new Date();
    const autoOfflineAt = new Date(
      now.getTime() + DISPATCH_CONFIG.AUTO_OFFLINE_MINUTES * 60 * 1000,
    );

    // Update worker online status
    const { error: updateError } = await (supabase as any)
      .from("workers")
      .update({
        is_online: true,
        online_since: now.toISOString(),
        current_lat: lat,
        current_lng: lng,
        auto_offline_at: autoOfflineAt.toISOString(),
        last_location_update: now.toISOString(),
        lat,
        lng,
      })
      .eq("id", worker.id);

    if (updateError) {
      routeLogger.error("Failed to toggle online", new Error(updateError.message), { requestId });
      return errorResponse(500, "Failed to update online status", request);
    }

    routeLogger.info("Worker went online", { requestId, workerId: worker.id });
    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      success: true,
      isOnline: true,
      onlineSince: now.toISOString(),
      autoOfflineAt: autoOfflineAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, request, "/api/workers/toggle-online", "POST");
  }
}
