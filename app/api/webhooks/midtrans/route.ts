/**
 * Midtrans Webhook Handler
 *
 * Handles payment callbacks from Midtrans payment gateway.
 * Updates payment transaction status and wallet balance upon successful payment.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { midtransGateway, type WebhookPayload } from "@/lib/payments";
import { logger } from "@/lib/logger";
import { errorResponse } from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("webhooks/midtrans");

/**
 * Midtrans webhook notification payload
 */
interface MidtransNotification {
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  currency: string;
  payment_type: string;
  transaction_time: string;
  transaction_status:
    | "pending"
    | "capture"
    | "settlement"
    | "deny"
    | "cancel"
    | "expire"
    | "failure";
  fraud_status?: "accept" | "challenge" | "deny";
  status_code: string;
  status_message: string;
  va_numbers?: Array<{
    bank: string;
    va_number: string;
  }>;
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
  qr_string?: string;
  settlement_time?: string;
  expiry_time?: string;
  signature_key: string;
}

/**
 * POST /api/webhooks/midtrans
 *
 * Handle Midtrans payment notification
 *
 * Headers:
 * - Content-Type: application/json
 *
 * Body:
 * - transaction_id: Midtrans transaction ID
 * - order_id: External order ID
 * - gross_amount: Payment amount
 * - transaction_status: Payment status
 * - fraud_status: Fraud check status (for card payments)
 * - signature_key: SHA-512 signature for verification
 */
export async function POST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "webhooks/midtrans",
  });

  try {
    // Parse webhook payload
    const payload: MidtransNotification = await request.json();

    // Audit log for all incoming webhook requests
    logger.audit("midtrans_webhook_received", {
      requestId,
      transactionId: payload.transaction_id,
      orderId: payload.order_id,
      status: payload.transaction_status,
      fraudStatus: payload.fraud_status,
      grossAmount: payload.gross_amount,
    });

    routeLogger.info("Received Midtrans webhook notification", {
      requestId,
      transaction_id: payload.transaction_id,
      order_id: payload.order_id,
      transaction_status: payload.transaction_status,
      fraud_status: payload.fraud_status,
      gross_amount: payload.gross_amount,
    });

    // Verify webhook signature
    const isValidSignature = midtransGateway.verifyWebhookSignature(
      payload.signature_key,
      payload.order_id,
      payload.status_code,
      payload.gross_amount,
    );

    if (!isValidSignature) {
      routeLogger.warn("Invalid webhook signature", {
        requestId,
        transactionId: payload.transaction_id,
      });

      // Audit log for invalid signature
      logger.audit("midtrans_webhook_invalid_signature", {
        requestId,
        orderId: payload.order_id,
        reason: "Invalid signature",
      });

      logger.requestError(
        request,
        new Error("Invalid signature"),
        401,
        startTime,
        { requestId },
      );

      return errorResponse(401, "AUTH_UNAUTHORIZED", request);
    }

    // Map Midtrans status to internal status
    const internalStatus = mapMidtransStatus(
      payload.transaction_status,
      payload.fraud_status,
    );

    // Create standardized webhook payload
    const webhookPayload: WebhookPayload = {
      id: payload.transaction_id,
      externalId: payload.order_id,
      provider: "midtrans",
      amount: Number(payload.gross_amount),
      status: internalStatus,
      paidAt: payload.settlement_time,
      paymentMethod: payload.payment_type,
      paymentChannel: payload.va_numbers?.[0]?.bank || payload.payment_type,
      rawData: payload as unknown as Record<string, unknown>,
    };

    // Process the webhook
    const result = await processWebhook(webhookPayload, payload);

    if (!result.success) {
      routeLogger.error("Webhook processing failed", new Error(result.error), {
        requestId,
        orderId: payload.order_id,
      });

      // Audit log for processing failure
      logger.audit("midtrans_webhook_processing_failed", {
        requestId,
        orderId: payload.order_id,
        error: result.error,
      });

      logger.requestError(request, new Error(result.error), 500, startTime, {
        requestId,
      });

      return errorResponse(500, result.error, request);
    }

    routeLogger.info("Midtrans webhook processed successfully", {
      requestId,
      orderId: payload.order_id,
      status: internalStatus,
    });

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    // Audit log for successful processing
    logger.audit("midtrans_webhook_processed", {
      requestId,
      orderId: payload.order_id,
      status: internalStatus,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    routeLogger.error("Unexpected error in Midtrans webhook", error, {
      requestId,
    });

    // Audit log for unexpected error
    logger.audit("midtrans_webhook_error", {
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
  rawPayload: MidtransNotification,
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

    // Skip if already processed to this status
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

    if (rawPayload.fraud_status === "challenge") {
      routeLogger.info("Transaction in challenge status", {
        transactionId: payload.externalId,
      });
      // Could implement manual review notification here
    }

    // Update transaction status
    const updateData: Record<string, unknown> = {
      status: payload.status,
      provider_payment_id: payload.id,
      updated_at: new Date().toISOString(),
    };

    if (payload.paidAt) {
      updateData.paid_at = payload.paidAt;
    }

    if (payload.status === "failed") {
      updateData.failure_reason = getFailureReason(rawPayload);
    }

    if (payload.paymentMethod) {
      const existingMetadata = (transaction.metadata || {}) as Record<string, unknown>;
      updateData.metadata = {
        ...existingMetadata,
        payment_method: payload.paymentMethod,
        payment_channel: payload.paymentChannel,
        va_number:
          rawPayload.va_numbers?.[0]?.va_number || rawPayload.permata_va_number,
        bill_key: rawPayload.bill_key,
        biller_code: rawPayload.biller_code,
        fraud_status: rawPayload.fraud_status,
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
      description: `Payment via Midtrans - ${type}`,
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
 * Map Midtrans status to internal status
 */
function mapMidtransStatus(
  status: string,
  fraudStatus?: string,
): "pending" | "paid" | "failed" | "expired" | "cancelled" {
  // Handle fraud status first for card transactions
  if (fraudStatus === "deny" || fraudStatus === "challenge") {
    return "failed";
  }

  const statusMap: Record<
    string,
    "pending" | "paid" | "failed" | "expired" | "cancelled"
  > = {
    pending: "pending",
    capture: "paid",
    settlement: "paid",
    deny: "failed",
    cancel: "cancelled",
    expire: "expired",
    failure: "failed",
  };

  return statusMap[status] || "pending";
}

/**
 * Get human-readable failure reason
 */
function getFailureReason(payload: MidtransNotification): string {
  if (payload.fraud_status === "deny") {
    return "Payment denied due to fraud detection";
  }
  if (payload.fraud_status === "challenge") {
    return "Payment requires manual verification";
  }
  if (payload.transaction_status === "deny") {
    return "Payment denied by payment provider";
  }
  if (payload.transaction_status === "cancel") {
    return "Payment was cancelled";
  }
  if (payload.transaction_status === "expire") {
    return "Payment expired";
  }
  if (payload.transaction_status === "failure") {
    return "Payment failed";
  }
  return payload.status_message || "Unknown error";
}

/**
 * GET /api/webhooks/midtrans
 *
 * Health check endpoint
 */
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "webhooks/midtrans",
  });

  routeLogger.info("Health check for Midtrans webhook", { requestId });
  logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

  return NextResponse.json({
    status: "ok",
    provider: "midtrans",
    timestamp: new Date().toISOString(),
  });
}
