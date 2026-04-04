/**
 * Dispatch Analytics API
 *
 * GET /api/analytics/dispatch?businessId=xxx&period=7d|30d|90d
 * Returns dispatch statistics for a business in a given period.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  badRequestErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("analytics/dispatch");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const period = searchParams.get("period") || "7d";

  const { startTime, requestId } = logger.requestStart(request, {
    route: "analytics/dispatch",
    businessId,
    period,
  });

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    // Validate businessId
    if (!businessId) {
      return badRequestErrorResponse("businessId is required", request);
    }

    // Parse period
    let days: number;
    switch (period) {
      case "7d":
        days = 7;
        break;
      case "30d":
        days = 30;
        break;
      case "90d":
        days = 90;
        break;
      default:
        return badRequestErrorResponse("period must be 7d, 30d, or 90d", request);
    }

    const supabase = await createClient();

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // Query dispatch_queue for the business in the period
    const { data: dispatches, error: dispatchError } = await (supabase as any)
      .from("dispatch_queue")
      .select(`
        id,
        status,
        dispatched_at,
        responded_at,
        response_time_seconds,
        worker_id,
        workers:worker_id (
          id,
          full_name
        )
      `)
      .eq("business_id", businessId)
      .gte("dispatched_at", startDate.toISOString())
      .lte("dispatched_at", now.toISOString());

    if (dispatchError) {
      routeLogger.error("Failed to fetch dispatch_queue", dispatchError, { requestId });
      return errorResponse(500, "Failed to fetch dispatch analytics", request);
    }

    // Calculate totals
    const totalDispatches = dispatches?.length || 0;
    const totalAccepted = dispatches?.filter((d: any) => d.status === "accepted").length || 0;
    const totalRejected = dispatches?.filter((d: any) => d.status === "rejected").length || 0;
    const totalTimedOut = dispatches?.filter((d: any) => d.status === "timed_out").length || 0;

    // Calculate acceptance rate
    const acceptanceRate = totalDispatches > 0 
      ? Math.round((totalAccepted / totalDispatches) * 100 * 10) / 10 
      : 0;

    // Calculate avg response time (only for responded dispatches)
    const respondedDispatches = dispatches?.filter((d: any) => d.response_time_seconds !== null) || [];
    const avgResponseTimeSeconds = respondedDispatches.length > 0
      ? Math.round(respondedDispatches.reduce((sum: number, d: any) => sum + (d.response_time_seconds || 0), 0) / respondedDispatches.length)
      : 0;

    // Calculate avg dispatches per job
    const uniqueJobIds = new Set(dispatches?.map((d: any) => d.job_id) || []);
    const avgDispatchesPerJob = uniqueJobIds.size > 0
      ? Math.round((totalDispatches / uniqueJobIds.size) * 10) / 10
      : 0;

    // Query bookings for jobs fulfilled and exhausted
    const jobIds = Array.from(uniqueJobIds);
    
    let jobsFulfilled = 0;
    let jobsExhausted = 0;
    
    if (jobIds.length > 0) {
      // Get jobs to check dispatch_status
      const { data: jobs } = await (supabase as any)
        .from("jobs")
        .select("id, dispatch_status")
        .in("id", jobIds);

      jobsFulfilled = jobs?.filter((j: any) => j.dispatch_status === "fulfilled").length || 0;
      jobsExhausted = jobs?.filter((j: any) => j.dispatch_status === "exhausted").length || 0;
    }

    // Calculate online worker count for this business's area
    const { data: business } = await supabase
      .from("businesses")
      .select("area")
      .eq("id", businessId)
      .single();

    let onlineWorkerCount = 0;
    if (business?.area) {
      const { count } = await (supabase as any)
        .from("workers")
        .select("*", { count: "exact", head: true })
        .eq("is_online", true)
        .eq("area", business.area);
      
      onlineWorkerCount = count || 0;
    }

    // Calculate per-worker stats for top workers
    const workerStats: Record<string, {
      workerId: string;
      name: string;
      totalDispatches: number;
      accepted: number;
      rejected: number;
      timedOut: number;
      responseTimes: number[];
    }> = {};

    dispatches?.forEach((d: any) => {
      const wid = d.worker_id;
      const name = d.workers?.full_name || "Unknown";
      
      if (!workerStats[wid]) {
        workerStats[wid] = {
          workerId: wid,
          name,
          totalDispatches: 0,
          accepted: 0,
          rejected: 0,
          timedOut: 0,
          responseTimes: [],
        };
      }
      
      workerStats[wid].totalDispatches++;
      
      if (d.status === "accepted") {
        workerStats[wid].accepted++;
        if (d.response_time_seconds) {
          workerStats[wid].responseTimes.push(d.response_time_seconds);
        }
      } else if (d.status === "rejected") {
        workerStats[wid].rejected++;
      } else if (d.status === "timed_out") {
        workerStats[wid].timedOut++;
      }
    });

    // Calculate top 10 workers by acceptance rate
    const topWorkers = Object.values(workerStats)
      .map((ws) => ({
        workerId: ws.workerId,
        name: ws.name,
        acceptanceRate: ws.totalDispatches > 0 
          ? Math.round((ws.accepted / ws.totalDispatches) * 100 * 10) / 10 
          : 0,
        avgResponseTime: ws.responseTimes.length > 0
          ? Math.round(ws.responseTimes.reduce((a, b) => a + b, 0) / ws.responseTimes.length)
          : 0,
        totalDispatches: ws.totalDispatches,
      }))
      .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
      .slice(0, 10);

    const result = {
      totalDispatches,
      totalAccepted,
      totalRejected,
      totalTimedOut,
      acceptanceRate,
      avgResponseTimeSeconds,
      avgDispatchesPerJob,
      jobsFulfilled,
      jobsExhausted,
      onlineWorkerCount,
      topWorkers,
    };

    routeLogger.info("Dispatch analytics fetched", {
      requestId,
      businessId,
      period,
      ...result,
    });

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, request, "/api/analytics/dispatch", "GET");
  }
}