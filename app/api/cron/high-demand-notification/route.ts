/**
 * High Demand Notification Cron
 *
 * POST /api/cron/high-demand-notification
 *
 * When >= 3 jobs are exhausted in the last 30 minutes in an area,
 * notifies offline workers in that area via push notification.
 *
 * This should be triggered by a cron job (e.g., every 15 minutes).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/actions/notifications";
import { logger } from "@/lib/logger";

const routeLogger = logger.createApiLogger("cron/high-demand-notification");

const EXHAUSTED_THRESHOLD = 3;
const LOOKBACK_MINUTES = 30;
const NOTIFICATION_BATCH_SIZE = 50;

interface ExhaustiveJob {
  id: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
}

interface OfflineWorker {
  id: string;
  user_id: string;
  full_name: string;
  current_lat: number | null;
  current_lng: number | null;
}

function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "cron/high-demand-notification",
  });

  // Optional: verify cron secret header in production
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && cronSecret !== expectedSecret) {
    routeLogger.warn("Unauthorized cron attempt", { requestId });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Step 1: Find exhausted jobs in the last 30 minutes
    const cutoffTime = new Date(
      Date.now() - LOOKBACK_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: exhaustedJobs, error: jobsError } = await (supabase as any)
      .from("jobs")
      .select("id, lat, lng, address")
      .eq("dispatch_status", "exhausted")
      .gte("updated_at", cutoffTime);

    if (jobsError) {
      routeLogger.error("Failed to fetch exhausted jobs", jobsError, { requestId });
      return NextResponse.json(
        { error: "Failed to fetch exhausted jobs" },
        { status: 500 },
      );
    }

    if (!exhaustedJobs || exhaustedJobs.length < EXHAUSTED_THRESHOLD) {
      routeLogger.info("Not enough exhausted jobs", {
        requestId,
        count: exhaustedJobs?.length || 0,
        threshold: EXHAUSTED_THRESHOLD,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, { requestId });
      return NextResponse.json({
        success: true,
        message: "Not enough exhausted jobs to trigger notification",
        exhaustedCount: exhaustedJobs?.length || 0,
        threshold: EXHAUSTED_THRESHOLD,
      });
    }

    routeLogger.info("High demand detected", {
      requestId,
      exhaustedJobsCount: exhaustedJobs.length,
    });

    // Step 2: Group jobs by area (using centroid of exhausted jobs)
    // Calculate average location
    const jobsWithLocation = (exhaustedJobs as ExhaustiveJob[]).filter(
      (j) => j.lat !== null && j.lng !== null,
    );

    if (jobsWithLocation.length === 0) {
      routeLogger.warn("No exhausted jobs with location data", { requestId });
      return NextResponse.json({
        success: true,
        message: "No location data available for exhausted jobs",
      });
    }

    const avgLat =
      jobsWithLocation.reduce((sum, j) => sum + (j.lat ?? 0), 0) /
      jobsWithLocation.length;
    const avgLng =
      jobsWithLocation.reduce((sum, j) => sum + (j.lng ?? 0), 0) /
      jobsWithLocation.length;

    // Step 3: Find offline workers who were online recently (within 2 hours)
    // and have location data
    const offlineCutoff = new Date(
      Date.now() - 2 * 60 * 60 * 1000,
    ).toISOString();

    const { data: offlineWorkers, error: workersError } = await (supabase as any)
      .from("workers")
      .select("id, user_id, full_name, current_lat, current_lng")
      .eq("is_online", false)
      .gte("last_location_update", offlineCutoff)
      .not("current_lat", "is", null)
      .not("current_lng", "is", null)
      .limit(100);

    if (workersError) {
      routeLogger.error("Failed to fetch offline workers", workersError, {
        requestId,
      });
      return NextResponse.json(
        { error: "Failed to fetch offline workers" },
        { status: 500 },
      );
    }

    if (!offlineWorkers || offlineWorkers.length === 0) {
      routeLogger.info("No offline workers found to notify", { requestId });
      logger.requestSuccess(request, { status: 200 }, startTime, { requestId });
      return NextResponse.json({
        success: true,
        message: "No offline workers found",
        notifiedCount: 0,
      });
    }

    // Step 4: Filter workers within ~15km of the exhausted jobs area
    const nearbyWorkers = (offlineWorkers as OfflineWorker[]).filter(
      (worker) => {
        if (worker.current_lat === null || worker.current_lng === null) {
          return false;
        }
        const distance = calculateHaversineDistance(
          avgLat,
          avgLng,
          worker.current_lat,
          worker.current_lng,
        );
        return distance <= 15; // Within 15km radius
      },
    );

    if (nearbyWorkers.length === 0) {
      routeLogger.info("No nearby offline workers found", {
        requestId,
        centerLat: avgLat,
        centerLng: avgLng,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, { requestId });
      return NextResponse.json({
        success: true,
        message: "No nearby offline workers",
        notifiedCount: 0,
      });
    }

    // Step 5: Send push notifications to nearby offline workers
    const notificationTitle = "🔔 3+ Job Tersedia di Areamu!";
    const notificationBody =
      "Ada banyak lowongan di areamu. Buka app untuk lihat dan accept job sekarang!";
    const notificationDeepLink = "/worker/dispatches";

    let notifiedCount = 0;
    let failedCount = 0;

    // Process in batches
    for (let i = 0; i < nearbyWorkers.length; i += NOTIFICATION_BATCH_SIZE) {
      const batch = nearbyWorkers.slice(i, i + NOTIFICATION_BATCH_SIZE);

      await Promise.all(
        batch.map(async (worker) => {
          try {
            await createNotification(
              worker.user_id,
              notificationTitle,
              notificationBody,
              notificationDeepLink,
            );
            notifiedCount++;
          } catch (error) {
            routeLogger.error("Failed to send notification", error, {
              requestId,
              workerId: worker.id,
            });
            failedCount++;
          }
        }),
      );
    }

    routeLogger.info("High demand notifications sent", {
      requestId,
      notifiedCount,
      failedCount,
      exhaustedJobsCount: exhaustedJobs.length,
      nearbyWorkersCount: nearbyWorkers.length,
    });

    logger.requestSuccess(
      request,
      { status: 200 },
      startTime,
      {
        requestId,
        notifiedCount,
        failedCount,
        exhaustedCount: exhaustedJobs.length,
      },
    );

    return NextResponse.json({
      success: true,
      message: "High demand notifications sent",
      notifiedCount,
      failedCount,
      exhaustedCount: exhaustedJobs.length,
      nearbyWorkersCount: nearbyWorkers.length,
    });
  } catch (error) {
    routeLogger.error("Cron failed", error as Error, { requestId });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Also support GET for manual testing
export async function GET(request: Request) {
  return POST(request);
}