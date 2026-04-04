/**
 * Worker Available Jobs API
 *
 * GET /api/workers/available-jobs
 * Returns pending dispatches for the authenticated worker.
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

const routeLogger = logger.createApiLogger("workers/available-jobs");

export interface AvailableJob {
  dispatchId: string;
  jobId: string;
  title: string;
  businessName: string;
  budgetMin: number;
  budgetMax: number;
  address: string | null;
  distanceKm: number | null;
  matchingScore: number;
  scoreBreakdown: {
    skill: number;
    distance: number;
    rating: number;
    tier: number;
  };
  timeRemainingSeconds: number;
  expiresAt: string;
  dispatchedAt: string;
}

export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "workers/available-jobs",
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
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (workerError || !worker) {
      return errorResponse(404, "Worker profile not found", request);
    }

    // Get pending dispatches joined with job details
    const { data: dispatches, error: dispatchError } = await (supabase as any)
      .from("dispatch_queue")
      .select(
        `
        id,
        job_id,
        matching_score,
        score_breakdown,
        distance_km,
        expires_at,
        dispatched_at,
        jobs:job_id (
          id,
          title,
          budget_min,
          budget_max,
          address,
          businesses:business_id ( name )
        )
      `,
      )
      .eq("worker_id", worker.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("dispatched_at", { ascending: false });

    if (dispatchError) {
      routeLogger.error("Failed to fetch dispatches", new Error(dispatchError.message), { requestId });
      return errorResponse(500, "Failed to fetch available jobs", request);
    }

    const now = Date.now();

    const jobs: AvailableJob[] = (dispatches || []).map((d: any) => {
      const expiresAtMs = new Date(d.expires_at).getTime();
      const timeRemaining = Math.max(0, Math.round((expiresAtMs - now) / 1000));

      return {
        dispatchId: d.id,
        jobId: d.job_id,
        title: d.jobs?.title || "Unknown Job",
        businessName: d.jobs?.businesses?.name || "Unknown Business",
        budgetMin: d.jobs?.budget_min || 0,
        budgetMax: d.jobs?.budget_max || 0,
        address: d.jobs?.address || null,
        distanceKm: d.distance_km,
        matchingScore: d.matching_score,
        scoreBreakdown: d.score_breakdown || { skill: 0, distance: 0, rating: 0, tier: 0 },
        timeRemainingSeconds: timeRemaining,
        expiresAt: d.expires_at,
        dispatchedAt: d.dispatched_at,
      };
    });

    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      count: jobs.length,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    return handleApiError(error, request, "/api/workers/available-jobs", "GET");
  }
}
