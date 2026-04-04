/**
 * Job Dispatch API
 *
 * POST /api/jobs/[id]/dispatch
 * Initiates dispatch for a job - auto or manual mode.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import { initiateDispatch, DISPATCH_CONFIG } from "@/lib/dispatch-engine";
import { createNotification } from "@/lib/actions/notifications";
import { sendPushNotification } from "@/lib/actions/push-notifications";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  notFoundErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("jobs/dispatch");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "jobs/dispatch",
  });

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { mode = "auto", workerIds } = body;

    const supabase = await createClient();

    // Verify job exists and user owns the business
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, businesses(id, user_id)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return notFoundErrorResponse("Job", jobId, request);
    }

    // Verify ownership
    const business = (job as any).businesses;
    if (!business || business.user_id !== session.user.id) {
      return errorResponse(403, "You don't have permission to dispatch this job", request);
    }

    if (mode === "auto") {
      // Auto-dispatch: use dispatch engine
      const result = await initiateDispatch(jobId, business.id);

      if (!result.success) {
        return errorResponse(404, result.error || "No available workers found", request);
      }

      routeLogger.info("Auto dispatch initiated", { requestId, ...result });
      logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

      return NextResponse.json({
        success: true,
        dispatchId: result.dispatchId,
        workerId: result.workerId,
        workerName: result.workerName,
        matchingScore: result.matchingScore,
        expiresAt: result.expiresAt,
      });
    } else if (mode === "manual") {
      // Manual dispatch: dispatch to selected workers
      if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
        return errorResponse(400, "workerIds is required for manual dispatch", request);
      }

      const targetWorkerId = workerIds[0]; // Dispatch to first selected worker
      const expiresAt = new Date(
        Date.now() + DISPATCH_CONFIG.EXPIRY_SECONDS * 1000,
      ).toISOString();

      // Get worker details
      const { data: worker } = await supabase
        .from("workers")
        .select("id, full_name, user_id")
        .eq("id", targetWorkerId)
        .single();

      if (!worker) {
        return errorResponse(404, "Worker not found", request);
      }

      // Create dispatch record
      const { data: dispatch, error: dispatchError } = await (supabase as any)
        .from("dispatch_queue")
        .insert({
          job_id: jobId,
          worker_id: targetWorkerId,
          business_id: business.id,
          status: "pending",
          matching_score: 0, // Manual dispatch has no auto-calculated score
          score_breakdown: { skill: 0, distance: 0, rating: 0, tier: 0 },
          expires_at: expiresAt,
          dispatched_at: new Date().toISOString(),
          attempt_number: 1,
        })
        .select()
        .single();

      if (dispatchError || !dispatch) {
        routeLogger.error("Failed to create manual dispatch", new Error(dispatchError?.message || "Insert failed"), { requestId });
        return errorResponse(500, "Failed to create dispatch", request);
      }

      // Notify worker
      await createNotification(
        (worker as any).user_id,
        "🔔 Pekerjaan Baru!",
        `Anda dipilih untuk pekerjaan baru. Buka untuk melihat detail.`,
        `/worker/jobs/${jobId}`,
      );

      await sendPushNotification(
        (worker as any).user_id,
        "🔔 Pekerjaan Baru!",
        `Anda dipilih untuk pekerjaan baru.`,
        `/worker/jobs/${jobId}`,
      );

      routeLogger.info("Manual dispatch created", { requestId, dispatchId: dispatch.id, workerId: targetWorkerId });
      logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

      return NextResponse.json({
        success: true,
        dispatchId: dispatch.id,
        workerId: targetWorkerId,
        workerName: (worker as any).full_name,
        matchingScore: 0,
        expiresAt,
      });
    } else {
      return errorResponse(400, "Invalid mode. Use 'auto' or 'manual'", request);
    }
  } catch (error) {
    return handleApiError(error, request, "/api/jobs/[id]/dispatch", "POST");
  }
}
