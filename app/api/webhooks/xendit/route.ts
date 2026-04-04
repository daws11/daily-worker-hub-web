/**
 * Xendit Webhook Handler
 *
 * Handles payment callbacks from Xendit payment gateway.
 * Updates payment transaction status and wallet balance upon successful payment.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { xenditGateway, type WebhookPayload } from "@/lib/payments";
import { logger } from "@/lib/logger";
import { errorResponse } from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("webhooks/xendit");

/**
 * POST /api/webhooks/xendit
 *
 * Handle Xendit payment callback
 *
 * Headers:
 * - X-Callback-Token: Webhook verification token
 *
 * Body:
 * - id: Payment ID
 * - external_id: External transaction ID
 * - status: Payment status (PENDING, PAID, EXPIRED, FAILED)
 * - amount: Payment amount
 * - paid_at: Payment timestamp (if paid)
 * - payment_method: Payment method used
 * - payment_channel: Payment channel used
 */
export async function POST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "webhooks/xendit",
  });

  try {
    // Get callback token from header
    const callbackToken = request.headers.get("X-Callback-Token");

    // Parse webhook payload
    const payload = await request.json();

    // Audit log for all incoming webhook requests
    logger.audit("xendit_webhook_received", {
      requestId,
      id: payload.id,
      external_id: payload.external_id,
      status: payload.status,
      amount: payload.amount,
    });

    routeLogger.info("Received Xendit webhook callback", {
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
      logger.audit("xendit_webhook_invalid_token", {
        requestId,
        orderId: payload.external_id,
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
      id: paymentId,
      external_id: transactionId,
      status,
      amount,
      paid_at: paidAt,
      payment_method: paymentMethod,
      payment_channel: paymentChannel,
      failure_reason: failureReason,
    } = payload;

    // Map Xendit status to internal status
    const internalStatus = mapXenditStatus(status);

    // Create standardized webhook payload
    const webhookPayload: WebhookPayload = {
      id: paymentId,
      externalId: transactionId,
      provider: "xendit",
      amount,
      status: internalStatus,
      paidAt,
      paymentMethod,
      paymentChannel,
      rawData: payload,
    };

    // Process the webhook
    const result = await processWebhook(webhookPayload, failureReason);

    if (!result.success) {
      routeLogger.error("Webhook processing failed", new Error(result.error), {
        requestId,
        transactionId,
      });

      // Audit log for processing failure
      logger.audit("xendit_webhook_processing_failed", {
        requestId,
        transactionId,
        error: result.error,
      });

      logger.requestError(request, new Error(result.error), 500, startTime, {
        requestId,
      });

      return errorResponse(500, result.error, request);
    }

    routeLogger.info("Xendit webhook processed successfully", {
      requestId,
      transactionId,
      status: internalStatus,
    });

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    // Audit log for successful processing
    logger.audit("xendit_webhook_processed", {
      requestId,
      transactionId,
      status: internalStatus,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    routeLogger.error("Unexpected error in Xendit webhook", error, {
      requestId,
    });

    // Audit log for unexpected error
    logger.audit("xendit_webhook_error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    logger.requestError(request, error, 500, startTime, { requestId });

    return errorResponse(500, "SERVER_INTERNAL_ERROR", request);
  }
}

/**
 * Process the webhook payload
 */
async function processWebhook(
  payload: WebhookPayload,
  failureReason?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Find the payment transaction
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", payload.externalId)
      .single();

    if (txError || !transaction) {
      routeLogger.warn("Transaction not found — acknowledging to prevent retries", {
        transactionId: payload.externalId,
      });
      // Return success so gateway doesn't retry for missing transaction
      return { success: true };
    }

    // Skip if already processed
    if (transaction.status === payload.status) {
      routeLogger.info("Transaction already processed", {
        transactionId: payload.externalId,
      });
      return { success: true };
    }

    // Guard against status regression (e.g., success → expired)
    if (transaction.status === 'paid' && payload.status !== 'paid') {
      routeLogger.warn("Ignoring status regression from paid", {
        transactionId: payload.externalId,
        currentStatus: transaction.status,
        webhookStatus: payload.status,
      });
      return { success: true };
    }

    // Log amount mismatch for monitoring
    if (payload.amount !== transaction.amount) {
      routeLogger.warn("Webhook amount mismatch with transaction", {
        transactionId: payload.externalId,
        transactionAmount: transaction.amount,
        webhookAmount: payload.amount,
      });
    }

    const updateData: Record<string, unknown> = {
      status: payload.status,
      provider_payment_id: payload.id,
      updated_at: new Date().toISOString(),
    };

    if (payload.paidAt) {
      updateData.paid_at = payload.paidAt;
    }

    if (failureReason) {
      updateData.failure_reason = failureReason;
    }

    if (payload.paymentMethod) {
      const existingMetadata = (transaction.metadata || {}) as Record<string, unknown>;
      updateData.metadata = {
        ...existingMetadata,
        payment_method: payload.paymentMethod,
        payment_channel: payload.paymentChannel,
      };
    }

    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update(updateData)
      .eq("id", transaction.id);

    if (updateError) {
      routeLogger.error("Failed to update transaction", updateError, {
        transactionId: payload.externalId,
      });
      return { success: false, error: "Failed to update transaction" };
    }

    routeLogger.info("Transaction status updated", {
      transactionId: payload.externalId,
      oldStatus: transaction.status,
      newStatus: payload.status,
    });

    // If payment is successful, credit the wallet
    if (payload.status === "paid") {
      const creditResult = await creditWallet(
        supabase,
        transaction.business_id,
        transaction.amount - (transaction.fee_amount || 0),
        transaction.id,
      );

      if (!creditResult.success) {
        routeLogger.error(
          "Failed to credit wallet",
          new Error(creditResult.error),
          { transactionId: payload.externalId },
        );
        return { success: false, error: "Failed to credit wallet" };
      }
    }

    return { success: true };
  } catch (error) {
    routeLogger.error("Webhook processing error", error, {});
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Credit the business wallet
 */
async function creditWallet(
  supabase: any,
  businessId: string,
  amount: number,
  transactionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (walletError) {
      return { success: false, error: "Failed to get wallet" };
    }

    if (!wallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from("wallets")
        .insert({
          business_id: businessId,
          balance: amount,
          currency: "IDR",
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: "Failed to create wallet" };
      }

      // Record transaction
      await recordWalletTransaction(
        supabase,
        newWallet.id,
        amount,
        transactionId,
        "top_up",
      );

      routeLogger.info("Wallet created and credited", {
        businessId,
        amount,
        transactionId,
      });
      return { success: true };
    }

    // Update existing wallet balance
    const newBalance = wallet.balance + amount;

    const { error: updateError } = await supabase
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    if (updateError) {
      return { success: false, error: "Failed to update wallet balance" };
    }

    // Record transaction
    await recordWalletTransaction(
      supabase,
      wallet.id,
      amount,
      transactionId,
      "top_up",
    );

    routeLogger.info("Wallet credited successfully", {
      businessId,
      amount,
      transactionId,
    });
    return { success: true };
  } catch (error) {
    routeLogger.error("Credit wallet error", error, {
      businessId,
      transactionId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Record wallet transaction
 */
async function recordWalletTransaction(
  supabase: any,
  walletId: string,
  amount: number,
  referenceId: string,
  type: "top_up" | "payment" | "refund" | "payout",
): Promise<void> {
  try {
    await supabase.from("wallet_transactions").insert({
      wallet_id: walletId,
      type,
      amount,
      reference_id: referenceId,
      description: `Payment via Xendit - ${type}`,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log but don't fail - transaction is already complete
    routeLogger.warn("Failed to record wallet transaction", {
      walletId,
      referenceId,
      type,
    });
  }
}

/**
 * Map Xendit status to internal status
 */
function mapXenditStatus(
  status: string,
): "pending" | "paid" | "failed" | "expired" | "cancelled" {
  const statusMap: Record<
    string,
    "pending" | "paid" | "failed" | "expired" | "cancelled"
  > = {
    PENDING: "pending",
    PAID: "paid",
    COMPLETED: "paid",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
    FAILED: "failed",
  };

  return statusMap[status] || "pending";
}

/**
 * GET /api/webhooks/xendit
 *
 * Health check endpoint
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "webhooks/xendit",
  });

  routeLogger.info("Health check for Xendit webhook", { requestId });
  logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

  return NextResponse.json({
    status: "ok",
    provider: "xendit",
    timestamp: new Date().toISOString(),
  });
}
