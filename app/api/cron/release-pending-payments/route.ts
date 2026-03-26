import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { releaseFundsAction } from "@/lib/actions/wallets";
import { createNotification } from "@/lib/actions/notifications";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

const routeLogger = logger.createApiLogger("cron/release-pending-payments");

/**
 * Cron endpoint to auto-release pending payments after review period
 * Should be called every hour by Vercel Cron or external scheduler
 *
 * Security: Requires CRON_SECRET header for authentication
 *
 * IMPORTANT: Set CRON_SECRET environment variable in Vercel dashboard
 * Example: Set a secure random string like `openssl rand -base64 32`
 *
 * Query: Find bookings where:
 * - status = 'completed'
 * - payment_status = 'pending_review'
 * - review_deadline < NOW()
 *
 * Action: Release funds to worker's available balance
 */
async function handlePOST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "cron/release-pending-payments",
  });

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      routeLogger.warn("Unauthorized cron access attempt", { requestId });
      logger.requestError(request, new Error("Unauthorized"), 401, startTime, {
        requestId,
      });

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    routeLogger.info("Starting auto-release cron job", { requestId });

    // Audit log for cron job start
    logger.audit("cron_job_started", {
      requestId,
      jobName: "release_pending_payments",
    });

    const supabase = await createClient();

    // Find bookings ready for auto-release
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        worker_id,
        final_price,
        review_deadline,
        workers (
          id,
          user_id,
          full_name
        ),
        jobs (
          id,
          title
        )
      `,
      )
      .eq("status", "completed")
      .eq("payment_status", "pending_review")
      .lt("review_deadline", new Date().toISOString())
      .limit(100); // Process in batches

    if (fetchError) {
      routeLogger.error(
        "Error fetching bookings for auto-release",
        fetchError,
        { requestId },
      );
      logger.requestError(
        request,
        new Error("Failed to fetch bookings"),
        500,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 },
      );
    }

    if (!bookings || bookings.length === 0) {
      routeLogger.info("No bookings to release", { requestId });
      logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

      return NextResponse.json({
        success: true,
        message: "No bookings to release",
        released: 0,
      });
    }

    routeLogger.info(`Found ${bookings.length} bookings for auto-release`, {
      requestId,
      count: bookings.length,
    });

    let releasedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    // Process each booking
    for (const booking of bookings) {
      try {
        const worker = booking.workers as any;
        const job = booking.jobs as any;

        if (!worker || !booking.final_price) {
          failedCount++;
          results.push({
            bookingId: booking.id,
            status: "skipped",
            reason: "Missing worker or price",
          });
          continue;
        }

        // Release funds
        const releaseResult = await releaseFundsAction(
          worker.user_id,
          booking.final_price,
          booking.id,
          "Pembayaran otomatis tersedia setelah periode review",
        );

        if (releaseResult.success) {
          // Update booking payment status to paid
          await supabase
            .from("bookings")
            .update({ payment_status: "paid" })
            .eq("id", booking.id);

          // Notify worker
          await createNotification(
            worker.user_id,
            "Pembayaran Tersedia",
            `Pembayaran Rp ${booking.final_price.toLocaleString("id-ID")} untuk ${job?.title || "pekerjaan"} telah tersedia untuk ditarik`,
            "/worker/wallet",
          );

          releasedCount++;
          results.push({
            bookingId: booking.id,
            status: "released",
            amount: booking.final_price,
          });

          // Audit log for each successful release
          logger.audit("payment_auto_released", {
            requestId,
            bookingId: booking.id,
            workerId: worker.id,
            amount: booking.final_price,
          });

          routeLogger.info("Payment released for booking", {
            requestId,
            bookingId: booking.id,
            workerId: worker.id,
            amount: booking.final_price,
          });
        } else {
          failedCount++;
          results.push({
            bookingId: booking.id,
            status: "failed",
            error: releaseResult.error,
          });

          routeLogger.error(
            "Failed to release payment for booking",
            new Error(releaseResult.error),
            { requestId, bookingId: booking.id },
          );
        }
      } catch (error) {
        failedCount++;
        results.push({
          bookingId: booking.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });

        routeLogger.error("Error processing booking for auto-release", error, {
          requestId,
          bookingId: booking.id,
        });
      }
    }

    // Audit log for cron job completion
    logger.audit("cron_job_completed", {
      requestId,
      jobName: "release_pending_payments",
      releasedCount,
      failedCount,
    });

    routeLogger.info("Auto-release cron job completed", {
      requestId,
      total: bookings.length,
      releasedCount,
      failedCount,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      releasedCount,
      failedCount,
    });

    return NextResponse.json({
      success: true,
      message: `Released ${releasedCount} payments, ${failedCount} failed`,
      released: releasedCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    routeLogger.error("Unexpected error in auto-release cron", error, {
      requestId,
    });

    // Audit log for cron job failure
    logger.audit("cron_job_failed", {
      requestId,
      jobName: "release_pending_payments",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withRateLimit(handlePOST as any, {
  type: "api-public",
  userBased: false,
});
