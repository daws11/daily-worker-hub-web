/**
 * Job Dispatch Status API
 *
 * GET /api/jobs/[id]/dispatch-status
 * Returns dispatch status and history for a job.
 */

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

const routeLogger = logger.createApiLogger("jobs/dispatch-status");

export interface DispatchStatusHistory {
  dispatchId: string;
  workerId: string;
  workerName: string;
  status: string;
  matchingScore: number;
  dispatchedAt: string;
  respondedAt: string | null;
  responseTimeSeconds: number | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "jobs/dispatch-status",
  });

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { id: jobId } = await params;
    const supabase = await createClient();

    // Verify job exists
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, status")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return notFoundErrorResponse("Job", jobId, request);
    }

    // Get all dispatches for this job
    const { data: dispatches, error: dispatchError } = await (supabase as any)
      .from("dispatch_queue")
      .select(
        `
        id,
        worker_id,
        status,
        matching_score,
        dispatched_at,
        responded_at,
        response_time_seconds,
        workers:worker_id ( full_name )
      `,
      )
      .eq("job_id", jobId)
      .order("dispatched_at", { ascending: true });

    if (dispatchError) {
      routeLogger.error("Failed to fetch dispatches", new Error(dispatchError.message), { requestId });
      return errorResponse(500, "Failed to fetch dispatch status", request);
    }

    const allDispatches = dispatches || [];
    const totalDispatched = allDispatches.length;
    const totalRejected = allDispatches.filter(
      (d: any) => d.status === "rejected" || d.status === "timed_out",
    ).length;

    // Find current pending dispatch
    const currentDispatch = allDispatches.find((d: any) => d.status === "pending");

    // Build history
    const history: DispatchStatusHistory[] = allDispatches.map((d: any) => ({
      dispatchId: d.id,
      workerId: d.worker_id,
      workerName: d.workers?.full_name || "Unknown",
      status: d.status,
      matchingScore: d.matching_score,
      dispatchedAt: d.dispatched_at,
      respondedAt: d.responded_at,
      responseTimeSeconds: d.response_time_seconds,
    }));

    // Determine dispatch status
    let dispatchStatus = "none";
    if (allDispatches.some((d: any) => d.status === "accepted")) {
      dispatchStatus = "accepted";
    } else if (currentDispatch) {
      dispatchStatus = "waiting";
    } else if (totalRejected > 0 && totalRejected === totalDispatched) {
      dispatchStatus = "all_rejected";
    }

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      jobId,
      dispatchStatus,
      totalDispatched,
      totalRejected,
      currentWorker: currentDispatch
        ? {
            dispatchId: currentDispatch.id,
            workerId: currentDispatch.worker_id,
            workerName: currentDispatch.workers?.full_name || "Unknown",
            matchingScore: currentDispatch.matching_score,
          }
        : null,
      history,
    });
  } catch (error) {
    return handleApiError(error, request, "/api/jobs/[id]/dispatch-status", "GET");
  }
}
