/**
 * Dispatch Accept API
 *
 * POST /api/dispatch/[id]/accept
 * Worker accepts a job dispatch and creates a booking.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/actions/notifications";
import { sendPushNotification } from "@/lib/actions/push-notifications";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  notFoundErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("dispatch/accept");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "dispatch/accept",
  });

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { id: dispatchId } = await params;
    const supabase = await createClient();

    // Get dispatch record with job and worker details
    const { data: dispatch, error: dispatchError } = await (supabase as any)
      .from("dispatch_queue")
      .select(
        `
        *,
        jobs:job_id (
          id, title, business_id, budget_max,
          businesses:business_id ( id, name, user_id )
        ),
        workers:worker_id (
          id, full_name, user_id
        )
      `,
      )
      .eq("id", dispatchId)
      .single();

    if (dispatchError || !dispatch) {
      return notFoundErrorResponse("Dispatch", dispatchId, request);
    }

    // Validate dispatch status
    if (dispatch.status !== "pending") {
      return errorResponse(400, `Dispatch is already ${dispatch.status}`, request);
    }

    // Check if expired
    if (new Date(dispatch.expires_at) < new Date()) {
      await (supabase as any)
        .from("dispatch_queue")
        .update({ status: "timed_out", responded_at: new Date().toISOString() })
        .eq("id", dispatchId);

      return errorResponse(400, "Dispatch has expired", request);
    }

    // Verify the worker belongs to the authenticated user
    const worker = dispatch.workers;
    if (!worker || worker.user_id !== session.user.id) {
      return errorResponse(403, "You are not authorized to accept this dispatch", request);
    }

    // PP 35/2021 compliance check - verify worker has completed KYC
    const { data: workerFull } = await supabase
      .from("workers")
      .select("kyc_status")
      .eq("id", dispatch.worker_id)
      .single();

    if (workerFull && (workerFull as any).kyc_status !== "verified") {
      return errorResponse(
        403,
        "KYC verification required. Please complete your verification first.",
        request,
      );
    }

    const job = dispatch.jobs;
    const business = job?.businesses;

    // Update dispatch status to accepted
    await (supabase as any)
      .from("dispatch_queue")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
        response_time_seconds: Math.round(
          (Date.now() - new Date(dispatch.dispatched_at).getTime()) / 1000,
        ),
      })
      .eq("id", dispatchId);

    // Create booking using existing RPC
    const { data: bookingId, error: bookingError } = await supabase.rpc(
      "create_booking_for_application",
      {
        p_job_id: dispatch.job_id,
        p_worker_id: dispatch.worker_id,
        p_business_id: job?.business_id || dispatch.business_id,
        p_application_id: dispatchId, // Use dispatch ID as application reference
        p_start_date: new Date().toISOString().split("T")[0],
        p_final_price: job?.budget_max || 0,
      },
    );

    if (bookingError || !bookingId) {
      routeLogger.error("Failed to create booking", new Error(bookingError?.message || "RPC failed"), {
        requestId,
        dispatchId,
      });

      // Rollback dispatch status
      await (supabase as any)
        .from("dispatch_queue")
        .update({ status: "pending", responded_at: null })
        .eq("id", dispatchId);

      return errorResponse(500, "Failed to create booking", request);
    }

    // Cancel other dispatches for the same job
    await (supabase as any)
      .from("dispatch_queue")
      .update({
        status: "cancelled",
        responded_at: new Date().toISOString(),
      })
      .eq("job_id", dispatch.job_id)
      .neq("id", dispatchId)
      .eq("status", "pending");

    // Update worker stats
    await (supabase as any)
      .from("workers")
      .update({
        jobs_completed: (supabase as any).rpc("increment", { val: 1 }),
      })
      .eq("id", dispatch.worker_id);

    // Update job status
    await supabase
      .from("jobs")
      .update({ status: "in_progress" })
      .eq("id", dispatch.job_id);

    // Notify business owner
    if (business?.user_id) {
      await createNotification(
        business.user_id,
        "✅ Worker Ditemukan!",
        `${worker.full_name} menerima pekerjaan "${job?.title}". Booking sedang diproses.`,
        `/business/bookings`,
      );

      await sendPushNotification(
        business.user_id,
        "✅ Worker Ditemukan!",
        `${worker.full_name} menerima pekerjaan "${job?.title}".`,
        `/business/bookings`,
      );
    }

    routeLogger.info("Dispatch accepted, booking created", {
      requestId,
      dispatchId,
      bookingId,
      workerId: dispatch.worker_id,
    });

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      success: true,
      bookingId,
      message: "Dispatch accepted successfully. Booking has been created.",
    });
  } catch (error) {
    return handleApiError(error, request, "/api/dispatch/[id]/accept", "POST");
  }
}
