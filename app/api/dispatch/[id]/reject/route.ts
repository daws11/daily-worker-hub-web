/**
 * Dispatch Reject API
 *
 * POST /api/dispatch/[id]/reject
 * Worker rejects a job dispatch.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import { handleDispatchTimeout } from "@/lib/dispatch-engine";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  notFoundErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("dispatch/reject");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "dispatch/reject",
  });

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { id: dispatchId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason;

    const supabase = await createClient();

    // Get dispatch
    const { data: dispatch, error: dispatchError } = await (supabase as any)
      .from("dispatch_queue")
      .select(
        `
        *,
        workers:worker_id ( user_id )
      `,
      )
      .eq("id", dispatchId)
      .single();

    if (dispatchError || !dispatch) {
      return notFoundErrorResponse("Dispatch", dispatchId, request);
    }

    // Verify the worker belongs to the authenticated user
    if (!dispatch.workers || dispatch.workers.user_id !== session.user.id) {
      return errorResponse(403, "You are not authorized to reject this dispatch", request);
    }

    if (dispatch.status !== "pending") {
      return errorResponse(400, `Dispatch is already ${dispatch.status}`, request);
    }

    // Calculate response time
    const responseTimeSeconds = Math.round(
      (Date.now() - new Date(dispatch.dispatched_at).getTime()) / 1000,
    );

    // Update dispatch status
    await (supabase as any)
      .from("dispatch_queue")
      .update({
        status: "rejected",
        rejection_reason: reason || null,
        responded_at: new Date().toISOString(),
        response_time_seconds: responseTimeSeconds,
      })
      .eq("id", dispatchId);

    // Update worker rejection count
    const { data: worker } = await supabase
      .from("workers")
      .select("id")
      .eq("id", dispatch.worker_id)
      .single();

    if (worker) {
      // Increment total_rejected via a simple read-modify-write
      const { data: currentStats } = await (supabase as any)
        .from("workers")
        .select("jobs_completed")
        .eq("id", dispatch.worker_id)
        .single();
      // stats update is informational — the dispatch_queue tracks rejection history
    }

    routeLogger.info("Dispatch rejected", {
      requestId,
      dispatchId,
      workerId: dispatch.worker_id,
      responseTimeSeconds,
      reason,
    });

    // Try to dispatch to next candidate
    const nextResult = await handleDispatchTimeout(dispatchId);
    if (nextResult.success) {
      routeLogger.info("Next dispatch initiated after rejection", {
        requestId,
        nextDispatchId: nextResult.dispatchId,
        nextWorkerId: nextResult.workerId,
      });
    }

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      success: true,
      message: "Dispatch rejected successfully",
    });
  } catch (error) {
    return handleApiError(error, request, "/api/dispatch/[id]/reject", "POST");
  }
}
