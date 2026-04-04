/**
 * Worker Toggle Offline API
 *
 * POST /api/workers/toggle-offline
 * Sets a worker as offline and stops receiving job dispatches.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("workers/toggle-offline");

export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "workers/toggle-offline",
  });

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const supabase = await createClient();

    // Lookup worker
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id, jobs_completed, rating")
      .eq("user_id", session.user.id)
      .single();

    if (workerError || !worker) {
      return errorResponse(404, "Worker profile not found", request);
    }

    // Get dispatch stats for this session
    const { data: dispatches } = await (supabase as any)
      .from("dispatch_queue")
      .select("status")
      .eq("worker_id", worker.id);

    const totalJobsReceived = (dispatches || []).length;
    const totalAccepted = (dispatches || []).filter(
      (d: any) => d.status === "accepted",
    ).length;
    const totalRejected = (dispatches || []).filter(
      (d: any) => d.status === "rejected" || d.status === "timed_out",
    ).length;

    // Cancel pending dispatches for this worker
    await (supabase as any)
      .from("dispatch_queue")
      .update({ status: "cancelled", responded_at: new Date().toISOString() })
      .eq("worker_id", worker.id)
      .eq("status", "pending");

    // Set worker offline
    const { error: updateError } = await (supabase as any)
      .from("workers")
      .update({
        is_online: false,
        online_since: null,
        current_lat: null,
        current_lng: null,
        auto_offline_at: null,
      })
      .eq("id", worker.id);

    if (updateError) {
      routeLogger.error("Failed to toggle offline", new Error(updateError.message), { requestId });
      return errorResponse(500, "Failed to update offline status", request);
    }

    routeLogger.info("Worker went offline", { requestId, workerId: worker.id });
    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      success: true,
      isOnline: false,
      stats: {
        totalJobsReceived,
        totalAccepted,
        totalRejected,
      },
    });
  } catch (error) {
    return handleApiError(error, request, "/api/workers/toggle-offline", "POST");
  }
}
