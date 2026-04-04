import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { errorResponse } from "@/lib/api/error-response";
import { initiateDispatch } from "@/lib/algorithms/dispatch-engine";

const routeLogger = logger.createApiLogger("cron/dispatch-timeout");

/**
 * Cron endpoint to handle expired dispatch timeouts.
 * Should be called every 30 seconds by Vercel Cron or external scheduler.
 *
 * Security: Requires CRON_SECRET header for authentication
 *
 * Query: Find dispatch_queue entries where:
 * - status = 'pending'
 * - expires_at < NOW()
 *
 * Action: Mark as timed_out, update worker stats, dispatch to next worker
 */
export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "cron/dispatch-timeout",
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

    // Find expired pending dispatches
    const { data: expiredDispatches, error: fetchError } = await supabase
      .from("dispatch_queue")
      .select(
        `
        id,
        job_id,
        worker_id,
        dispatched_at,
        matching_score,
        jobs (
          dispatch_status
        )
      `,
      )
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .limit(50); // Process in batches

    if (fetchError) {
      routeLogger.error("Error fetching expired dispatches", fetchError, {
        requestId,
      });
      return errorResponse(500, "FETCH_ERROR", request);
    }

    if (!expiredDispatches || expiredDispatches.length === 0) {
      routeLogger.info("No expired dispatches", { requestId });
      return NextResponse.json({
        success: true,
        message: "No expired dispatches",
        timedOut: 0,
      });
    }

    routeLogger.info(
      `Found ${expiredDispatches.length} expired dispatches`,
      { requestId },
    );

    let timedOutCount = 0;
    const processedJobIds = new Set<string>();

    for (const dispatch of expiredDispatches) {
      const now = new Date();
      const responseTime =
        (now.getTime() - new Date(dispatch.dispatched_at).getTime()) / 1000;

      // Update dispatch status to timed_out
      const { error: updateError } = await supabase
        .from("dispatch_queue")
        .update({
          status: "timed_out",
          responded_at: now.toISOString(),
          response_time_seconds: responseTime,
        })
        .eq("id", dispatch.id);

      if (updateError) {
        routeLogger.error("Failed to update dispatch", updateError, {
          requestId,
          dispatchId: dispatch.id,
        });
        continue;
      }

      // Update worker timed_out count
      const { data: worker } = await supabase
        .from("workers")
        .select("total_timed_out")
        .eq("id", dispatch.worker_id)
        .single();

      await supabase
        .from("workers")
        .update({
          total_timed_out: (worker?.total_timed_out || 0) + 1,
        })
        .eq("id", dispatch.worker_id);

      // Record in dispatch history
      await supabase.from("worker_dispatch_history").insert({
        worker_id: dispatch.worker_id,
        job_id: dispatch.job_id,
        dispatch_queue_id: dispatch.id,
        action: "timed_out",
        response_time_seconds: responseTime,
        matching_score: dispatch.matching_score,
      });

      timedOutCount++;

      // Track jobs that need next dispatch
      if (!processedJobIds.has(dispatch.job_id)) {
        processedJobIds.add(dispatch.job_id);
      }
    }

    // Trigger next dispatch for each affected job
    let nextDispatchCount = 0;
    for (const jobId of processedJobIds) {
      const result = await initiateDispatch(jobId);
      if (result.success) {
        nextDispatchCount++;
      } else {
        // Mark as exhausted if no more workers
        await supabase
          .from("jobs")
          .update({ dispatch_status: "exhausted" })
          .eq("id", jobId);
      }
    }

    routeLogger.info("Dispatch timeout handler completed", {
      requestId,
      timedOut: timedOutCount,
      nextDispatches: nextDispatchCount,
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${timedOutCount} timed out dispatches, triggered ${nextDispatchCount} next dispatches`,
      timedOut: timedOutCount,
      nextDispatches: nextDispatchCount,
    });
  } catch (error) {
    routeLogger.error("Unexpected error in dispatch-timeout cron", error, {
      requestId,
    });
    return errorResponse(500, "INTERNAL_ERROR", request);
  }
}
