import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { errorResponse } from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("cron/auto-offline");

/**
 * Cron endpoint to auto-offline workers whose session has expired.
 * Should be called every 5 minutes by Vercel Cron or external scheduler.
 *
 * Security: Requires CRON_SECRET header for authentication
 *
 * Query: Find workers where:
 * - is_online = true
 * - auto_offline_at < NOW()
 *
 * Action: Set is_online = false, cancel their pending dispatches
 */
export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "cron/auto-offline",
  });

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      routeLogger.warn("Unauthorized cron access attempt", { requestId });
      return errorResponse(401, "AUTH_UNAUTHORIZED", request);
    }

    const supabase = await createClient();

    // Find workers who should be offline
    const { data: expiredWorkers, error: fetchError } = await supabase
      .from("workers")
      .select("id, user_id, full_name")
      .eq("is_online", true)
      .lt("auto_offline_at", new Date().toISOString());

    if (fetchError) {
      routeLogger.error("Error fetching expired workers", fetchError, {
        requestId,
      });
      return errorResponse(500, "FETCH_ERROR", request);
    }

    if (!expiredWorkers || expiredWorkers.length === 0) {
      routeLogger.info("No workers to auto-offline", { requestId });
      return NextResponse.json({
        success: true,
        message: "No workers to auto-offline",
        offlineCount: 0,
      });
    }

    routeLogger.info(
      `Found ${expiredWorkers.length} workers to auto-offline`,
      { requestId },
    );

    const workerIds = expiredWorkers.map((w) => w.id);

    // Set workers offline
    const { error: updateError } = await supabase
      .from("workers")
      .update({
        is_online: false,
        online_since: null,
        auto_offline_at: null,
      })
      .in("id", workerIds);

    if (updateError) {
      routeLogger.error("Failed to set workers offline", updateError, {
        requestId,
      });
      return errorResponse(500, "UPDATE_ERROR", request);
    }

    // Cancel pending dispatches for these workers
    const { data: pendingDispatches, error: dispatchError } = await supabase
      .from("dispatch_queue")
      .select("id, job_id")
      .in("worker_id", workerIds)
      .eq("status", "pending");

    if (!dispatchError && pendingDispatches && pendingDispatches.length > 0) {
      await supabase
        .from("dispatch_queue")
        .update({ status: "cancelled" })
        .in(
          "id",
          pendingDispatches.map((d) => d.id),
        );

      // Record cancelled dispatches in history
      for (const dispatch of pendingDispatches) {
        await supabase.from("worker_dispatch_history").insert({
          worker_id: workerIds.find((id) => id) || "",
          job_id: dispatch.job_id,
          dispatch_queue_id: dispatch.id,
          action: "cancelled",
        });
      }

      // Trigger next dispatch for each affected job
      const affectedJobIds = [...new Set(pendingDispatches.map((d) => d.job_id))];
      for (const jobId of affectedJobIds) {
        const { initiateDispatch } = await import(
          "@/lib/algorithms/dispatch-engine"
        );
        await initiateDispatch(jobId, {
          excludeWorkerIds: workerIds,
        });
      }
    }

    routeLogger.info("Auto-offline completed", {
      requestId,
      offlineCount: expiredWorkers.length,
    });

    return NextResponse.json({
      success: true,
      message: `Set ${expiredWorkers.length} workers offline`,
      offlineCount: expiredWorkers.length,
    });
  } catch (error) {
    routeLogger.error("Unexpected error in auto-offline cron", error, {
      requestId,
    });
    return errorResponse(500, "INTERNAL_ERROR", request);
  }
}
