/**
 * Worker Heartbeat API
 *
 * POST /api/workers/heartbeat
 * Keeps worker online and resets auto-offline timer.
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

const routeLogger = logger.createApiLogger("workers/heartbeat");

export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "workers/heartbeat",
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
      .select("id, is_online")
      .eq("user_id", session.user.id)
      .single();

    if (workerError || !worker) {
      return errorResponse(404, "Worker profile not found", request);
    }

    if (!(worker as any).is_online) {
      return errorResponse(400, "Worker is not online", request);
    }

    const autoOfflineAt = new Date(
      Date.now() + DISPATCH_CONFIG.AUTO_OFFLINE_MINUTES * 60 * 1000,
    );

    // Reset auto-offline timer
    await (supabase as any)
      .from("workers")
      .update({ auto_offline_at: autoOfflineAt.toISOString() })
      .eq("id", worker.id);

    // Count pending dispatches
    const { count } = await (supabase as any)
      .from("dispatch_queue")
      .select("id", { count: "exact" })
      .eq("worker_id", worker.id)
      .eq("status", "pending");

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      success: true,
      pendingDispatches: count || 0,
      autoOfflineAt: autoOfflineAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, request, "/api/workers/heartbeat", "POST");
  }
}
