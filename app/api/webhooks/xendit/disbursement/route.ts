/**
 * Xendit Disbursement Webhook Handler
 *
 * Handles disbursement callbacks from Xendit payment gateway.
 * Updates payout request status and handles refunds on failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { xenditGateway } from "@/lib/payments";
import { logger } from "@/lib/logger";
import { errorResponse } from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("webhooks/xendit/disbursement");

/**
 * POST /api/webhooks/xendit/disbursement
 *
 * Handle Xendit disbursement callback
 *
 * Headers:
 * - X-Callback-Token: Webhook verification token
 *
 * Body:
 * - id: Disbursement ID
 * - external_id: External payout request ID
 * - status: Disbursement status (PENDING, PROCESSING, COMPLETED, FAILED)
 * - amount: Disbursement amount
 * - bank_code: Bank code
 * - account_holder_name: Account holder name
 * - completed_at: Completion timestamp (if completed)
 * - failure_reason: Failure reason (if failed)
 */
export async function POST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "webhooks/xendit/disbursement",
  });

  try {
    // Get callback token from header
    const callbackToken = request.headers.get("X-Callback-Token");

    // Parse webhook payload
    const payload = await request.json();

    // Audit log for all incoming disbursement webhook requests
    logger.audit("xendit_disbursement_webhook_received", {
      requestId,
      id: payload.id,
      external_id: payload.external_id,
      status: payload.status,
      amount: payload.amount,
    });

    routeLogger.info("Received Xendit disbursement callback", {
      requestId,
      id: payload.id,
      external_id: payload.external_id,
      status: payload.status,
      amount: payload.amount,
    });

    // Verify webhook signature
    if (!xenditGateway.verifyWebhookSignature(callbackToken)) {
      routeLogger.warn("Invalid callback token", { requestId });

      // Audit log for invalid token
      logger.audit("xendit_disbursement_webhook_invalid_token", {
        requestId,
        externalId: payload.external_id,
        reason: "Invalid callback token",
      });

      logger.requestError(
        request,
        new Error("Invalid callback token"),
        401,
        startTime,
        { requestId },
      );

      return errorResponse(401, "AUTH_UNAUTHORIZED", request);
    }

    // Extract relevant data
    const {
      id: disbursementId,
      external_id: externalId,
      status,
      amount,
      completed_at: completedAt,
      failure_reason: failureReason,
    } = payload;

    // Map Xendit status to internal status
    const internalStatus = mapDisbursementStatus(status);

    // Process the webhook
    const result = await processDisbursementWebhook({
      disbursementId,
      externalId,
      status: internalStatus,
      amount,
      completedAt,
      failureReason,
      rawData: payload,
    });

    if (!result.success) {
      routeLogger.error(
        "Disbursement webhook processing failed",
        new Error(result.error),
        { requestId, externalId },
      );

      // Audit log for processing failure
      logger.audit("xendit_disbursement_webhook_processing_failed", {
        requestId,
        externalId,
        error: result.error,
      });

      logger.requestError(request, new Error(result.error), 500, startTime, {
        requestId,
      });

      return errorResponse(500, result.error ?? "Unknown error", request);
    }

    routeLogger.info("Disbursement webhook processed successfully", {
      requestId,
      externalId,
      status: internalStatus,
    });

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    // Audit log for successful processing
    logger.audit("xendit_disbursement_webhook_processed", {
      requestId,
      externalId,
      status: internalStatus,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    routeLogger.error("Unexpected error in disbursement webhook", error, {
      requestId,
    });

    // Audit log for unexpected error
    logger.audit("xendit_disbursement_webhook_error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    logger.requestError(request, error, 500, startTime, { requestId });

    return errorResponse(500, "SERVER_INTERNAL_ERROR", request);
  }
}

/**
 * Process the disbursement webhook payload
 */
async function processDisbursementWebhook(payload: {
  disbursementId: string;
  externalId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  amount: number;
  completedAt?: string;
  failureReason?: string;
  rawData: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Find the payout request by external ID in metadata
    const { data: payoutRequests, error: searchError } = await (supabase as any)
      .from("payout_requests")
      .select("*")
      .eq("payment_provider", "xendit")
      .contains("metadata", { external_id: payload.externalId })
      .limit(1);

    if (searchError) {
      routeLogger.error("Search error for payout request", searchError, {
        externalId: payload.externalId,
      });
      return { success: false, error: "Failed to search payout request" };
    }

    if (!payoutRequests || payoutRequests.length === 0) {
      routeLogger.warn("Payout request not found", {
        externalId: payload.externalId,
      });
      return { success: false, error: "Payout request not found" };
    }

    const payoutRequest = payoutRequests[0];

    // Skip if already completed or failed
    if (
      payoutRequest.status === "completed" ||
      payoutRequest.status === "failed"
    ) {
      routeLogger.info("Payout already processed", {
        payoutRequestId: payoutRequest.id,
        externalId: payload.externalId,
      });
      return { success: true };
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: payload.status,
      provider_payout_id: payload.disbursementId,
      provider_response: payload.rawData,
      updated_at: new Date().toISOString(),
    };

    if (payload.status === "completed" && payload.completedAt) {
      updateData.completed_at = payload.completedAt;
    }

    if (payload.status === "failed" && payload.failureReason) {
      updateData.failed_at = new Date().toISOString();
      updateData.failure_reason = payload.failureReason;
    }

    // Update payout request status
    const { error: updateError } = await (supabase as any)
      .from("payout_requests")
      .update(updateData)
      .eq("id", payoutRequest.id);

    if (updateError) {
      routeLogger.error("Failed to update payout request", updateError, {
        payoutRequestId: payoutRequest.id,
      });
      return { success: false, error: "Failed to update payout request" };
    }

    routeLogger.info("Payout request status updated", {
      payoutRequestId: payoutRequest.id,
      externalId: payload.externalId,
      newStatus: payload.status,
    });

    // Handle status-specific actions
    if (payload.status === "completed") {
      // Finalize
      await finalizeSuccessfulPayout(supabase, payoutRequest);
    } else if (payload.status === "failed" || payload.status === "cancelled") {
      // Refund
      await refundFailedPayout(supabase, payoutRequest, payload.failureReason);
    }

    // Audit log for status change
    logger.audit("payout_status_changed", {
      externalId: payload.externalId,
      payoutRequestId: payoutRequest.id,
      newStatus: payload.status,
      amount: payload.amount,
    });

    return { success: true };
  } catch (error) {
    routeLogger.error("Disbursement webhook processing error", error, {});
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Finalize a successful payout
 */
async function finalizeSuccessfulPayout(
  supabase: any,
  payoutRequest: any,
): Promise<void> {
  try {
    // Update wallet transaction status
    await (supabase as any)
      .from("wallet_transactions")
      .update({ status: "paid" })
      .eq("reference_id", payoutRequest.id);

    // Audit log for successful finalization
    logger.audit("payout_finalized", {
      payoutRequestId: payoutRequest.id,
      workerId: payoutRequest.worker_id,
      amount: payoutRequest.amount,
    });

    routeLogger.info("Payout finalized successfully", {
      payoutRequestId: payoutRequest.id,
    });
  } catch (error) {
    routeLogger.error("Error finalizing payout", error, {
      payoutRequestId: payoutRequest.id,
    });
  }
}

/**
 * Refund a failed payout
 */
async function refundFailedPayout(
  supabase: any,
  payoutRequest: any,
  failureReason?: string,
): Promise<void> {
  try {
    // Get worker's user_id first
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("user_id")
      .eq("id", payoutRequest.worker_id)
      .single();

    if (workerError || !worker) {
      routeLogger.error(
        "Worker not found for refund",
        workerError || new Error("Not found"),
        { payoutRequestId: payoutRequest.id },
      );
      return;
    }

    // Get worker's wallet
    const { data: wallet, error: walletError } = await (supabase as any)
      .from("wallets")
      .select("*")
      .eq("user_id", worker.user_id)
      .single();

    if (walletError || !wallet) {
      routeLogger.error(
        "Wallet not found for refund",
        walletError || new Error("Not found"),
        { payoutRequestId: payoutRequest.id },
      );
      return;
    }

    // Refund full amount (including fee)
    const { error: refundError } = await (supabase as any)
      .from("wallets")
      .update({
        balance: wallet.balance + payoutRequest.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    if (refundError) {
      routeLogger.error("Failed to refund wallet", refundError, {
        walletId: wallet.id,
        payoutRequestId: payoutRequest.id,
      });
      return;
    }

    // Create refund transaction record
    await (supabase as any).from("wallet_transactions").insert({
      wallet_id: wallet.id,
      type: "refund",
      status: "paid",
      amount: payoutRequest.amount,
      description: `Refund for failed withdrawal - ${failureReason || "Disbursement failed"}`,
      reference_id: payoutRequest.id,
    });

    // Update original transaction as refunded
    await (supabase as any)
      .from("wallet_transactions")
      .update({ status: "refunded" })
      .eq("reference_id", payoutRequest.id)
      .eq("type", "payout");

    // Audit log for refund
    logger.audit("payout_refunded", {
      payoutRequestId: payoutRequest.id,
      workerId: payoutRequest.worker_id,
      amount: payoutRequest.amount,
      reason: failureReason,
    });

    routeLogger.info("Payout refunded successfully", {
      payoutRequestId: payoutRequest.id,
      workerId: payoutRequest.worker_id,
      amount: payoutRequest.amount,
    });
  } catch (error) {
    routeLogger.error("Error refunding payout", error, {
      payoutRequestId: payoutRequest.id,
    });
  }
}

/**
 * Map Xendit disbursement status to internal status
 */
function mapDisbursementStatus(
  status: string,
): "pending" | "processing" | "completed" | "failed" | "cancelled" {
  const statusMap: Record<
    string,
    "pending" | "processing" | "completed" | "failed" | "cancelled"
  > = {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled",
  };

  return statusMap[status] || "pending";
}

/**
 * GET /api/webhooks/xendit/disbursement
 *
 * Health check endpoint
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "webhooks/xendit/disbursement",
  });

  routeLogger.info("Health check for Xendit disbursement webhook", {
    requestId,
  });
  logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

  return NextResponse.json({
    status: "ok",
    provider: "xendit",
    endpoint: "disbursement",
    timestamp: new Date().toISOString(),
  });
}
