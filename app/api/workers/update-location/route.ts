/**
 * Worker Update Location API
 *
 * POST /api/workers/update-location
 * Updates worker's GPS location while online.
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

const routeLogger = logger.createApiLogger("workers/update-location");

export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "workers/update-location",
  });

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const body = await request.json();
    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return errorResponse(400, "lat and lng are required", request);
    }

    const supabase = await createClient();

    // Lookup worker
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id, is_online")
      .eq("user_id", session.user.id)
      .single();

    if (workerError || !worker) {
      return errorResponse(404, "Worker profile not found", request);
    }

    if (!(worker as any).is_online) {
      return errorResponse(400, "Worker is not online", request);
    }

    const now = new Date();
    const autoOfflineAt = new Date(
      now.getTime() + DISPATCH_CONFIG.AUTO_OFFLINE_MINUTES * 60 * 1000,
    );

    // Update location
    const { error: updateError } = await (supabase as any)
      .from("workers")
      .update({
        current_lat: lat,
        current_lng: lng,
        lat,
        lng,
        last_location_update: now.toISOString(),
        auto_offline_at: autoOfflineAt.toISOString(),
      })
      .eq("id", worker.id);

    if (updateError) {
      routeLogger.error("Failed to update location", new Error(updateError.message), { requestId });
      return errorResponse(500, "Failed to update location", request);
    }

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      success: true,
      lastUpdate: now.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, request, "/api/workers/update-location", "POST");
  }
}
