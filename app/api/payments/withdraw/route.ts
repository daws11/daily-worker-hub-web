/**
 * Withdrawal API Endpoint
 *
 * POST /api/payments/withdraw
 *
 * Creates a withdrawal request for a worker to receive their earnings
 * via bank transfer through Xendit Disbursement API.
 *
 * Rate limited: 10 requests per minute (payment endpoints)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { xenditGateway } from "@/lib/payments";
import { PAYMENT_CONSTANTS } from "@/lib/types/payment";
import { logger } from "@/lib/logger";
import { parseRequest } from "@/lib/validations";
import { withRateLimit } from "@/lib/rate-limit";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  notFoundErrorResponse,
  externalServiceErrorResponse,
} from "@/lib/api/error-response";
import { ErrorCode } from "@/lib/api/errors";
import { z } from "zod";

const routeLogger = logger.createApiLogger("payments/withdraw");

// Simple withdrawal request schema for this specific endpoint
const withdrawalRequestSchema = z.object({
  workerId: z
    .string()
    .min(1, "Worker ID wajib diisi")
    .uuid("Worker ID tidak valid"),

  amount: z
    .number({
      error: "Jumlah withdrawal harus berupa angka",
    })
    .min(
      PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT,
      `Withdrawal minimal Rp ${PAYMENT_CONSTANTS.MIN_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
    )
    .max(
      PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT,
      `Withdrawal maksimal Rp ${PAYMENT_CONSTANTS.MAX_PAYOUT_AMOUNT.toLocaleString("id-ID")}`,
    ),

  bankAccountId: z
    .string()
    .min(1, "Bank Account ID wajib diisi")
    .uuid("Bank Account ID tidak valid"),
});

/**
 * @openapi
 * /api/payments/withdraw:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create a withdrawal request
 *     description: Create a withdrawal request for a worker to receive their earnings via bank transfer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WithdrawRequest'
 *     responses:
 *       200:
 *         description: Withdrawal request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WithdrawResponse'
 *       400:
 *         description: Validation error or insufficient balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Worker, wallet, or bank account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to process withdrawal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function handlePOST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "payments/withdraw",
  });

  try {
    const supabase = await createClient();

    // Authentication check
    const session = await getServerSession();
    if (!session?.user?.id) {
      routeLogger.warn("Unauthorized access attempt", { requestId });
      logger.requestError(request, new Error("Unauthorized"), 401, startTime, {
        requestId,
      });
      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    // Validate request body with Zod schema
    const parseResult = await parseRequest(request, withdrawalRequestSchema);

    if (!parseResult.success) {
      routeLogger.warn("Validation failed", { requestId });
      return (parseResult as unknown as { error: NextResponse }).error;
    }

    const { workerId, amount, bankAccountId } = parseResult.data;

    // Audit log for all withdrawal requests
    logger.audit("withdrawal_request", {
      requestId,
      workerId,
      amount,
      bankAccountId,
    });

    // Get worker info
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id, user_id, full_name")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      routeLogger.error(
        "Worker not found",
        workerError || new Error("Not found"),
        { requestId, workerId },
      );
      logger.requestError(
        request,
        new Error("Worker not found"),
        404,
        startTime,
        { requestId },
      );

      return notFoundErrorResponse("Worker", workerId, request);
    }

    // Get worker's wallet
    const { data: wallet, error: walletError } = await (supabase as any)
      .from("wallets")
      .select("*")
      .eq("user_id", worker.user_id)
      .maybeSingle();

    if (walletError) {
      routeLogger.error("Error fetching wallet", walletError, {
        requestId,
        workerId,
      });
      logger.requestError(
        request,
        new Error("Failed to fetch wallet"),
        500,
        startTime,
        { requestId },
      );

      return errorResponse(
        500,
        {
          code: ErrorCode.SERVER_INTERNAL_ERROR,
          details: { message: "Failed to fetch wallet" },
        },
        request,
      );
    }

    if (!wallet) {
      routeLogger.warn("Wallet not found", { requestId, workerId });
      logger.requestError(
        request,
        new Error("Wallet not found"),
        404,
        startTime,
        { requestId },
      );

      return notFoundErrorResponse("Wallet", workerId, request);
    }

    // Check available balance
    if (wallet.balance < amount) {
      routeLogger.warn("Insufficient balance", {
        requestId,
        workerId,
        availableBalance: wallet.balance,
        requestedAmount: amount,
      });
      logger.requestError(
        request,
        new Error("Insufficient balance"),
        400,
        startTime,
        { requestId },
      );

      return errorResponse(
        400,
        {
          code: ErrorCode.ERROR_BAD_REQUEST,
          details: {
            message: "Insufficient balance",
            availableBalance: wallet.balance,
            requestedAmount: amount,
          },
        },
        request,
      );
    }

    // Get bank account details
    const { data: bankAccount, error: bankError } = await (supabase as any)
      .from("bank_accounts")
      .select("*")
      .eq("id", bankAccountId)
      .eq("worker_id", workerId)
      .single();

    if (bankError || !bankAccount) {
      routeLogger.error(
        "Bank account not found",
        bankError || new Error("Not found"),
        { requestId, bankAccountId, workerId },
      );
      logger.requestError(
        request,
        new Error("Bank account not found or does not belong to worker"),
        404,
        startTime,
        { requestId },
      );

      return errorResponse(
        404,
        {
          code: ErrorCode.RESOURCE_NOT_FOUND,
          details: { message: "Bank account not found or does not belong to worker" },
        },
        request,
      );
    }

    // Calculate fees (1% or minimum Rp 5,000)
    const feeAmount = Math.max(
      amount * PAYMENT_CONSTANTS.DEFAULT_PAYOUT_FEE_PERCENTAGE,
      5000,
    );
    const netAmount = amount - feeAmount;

    // Generate external ID for disbursement
    const externalId = `payout-${workerId}-${Date.now()}`;

    routeLogger.info("Creating withdrawal request", {
      requestId,
      workerId,
      amount,
      netAmount,
      bankAccountId,
    });

    // Create payout request record (pending)
    const { data: payoutRequest, error: payoutError } = await (supabase as any)
      .from("payout_requests")
      .insert({
        worker_id: workerId,
        amount: amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        bank_code: bankAccount.bank_code,
        bank_account_number: bankAccount.bank_account_number,
        bank_account_name: bankAccount.bank_account_name,
        status: "pending",
        payment_provider: "xendit",
        metadata: {
          external_id: externalId,
          bank_account_id: bankAccountId,
        },
      })
      .select()
      .single();

    if (payoutError || !payoutRequest) {
      routeLogger.error(
        "Error creating payout request",
        payoutError || new Error("Unknown error"),
        { requestId, workerId },
      );
      logger.requestError(
        request,
        new Error("Failed to create payout request"),
        500,
        startTime,
        { requestId },
      );

      return errorResponse(
        500,
        {
          code: ErrorCode.SERVER_INTERNAL_ERROR,
          details: { message: "Failed to create payout request" },
        },
        request,
      );
    }

    // Audit log for payout request creation
    logger.audit("payout_request_created", {
      requestId,
      payoutRequestId: payoutRequest.id,
      workerId,
      amount,
      feeAmount,
      netAmount,
      externalId,
    });

    // Deduct available_balance from wallet (hold until completed)
    // available_balance represents funds that are held/reserved for pending withdrawals
    const { error: updateWalletError } = await (supabase as any)
      .from("wallets")
      .update({
        available_balance: wallet.available_balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    if (updateWalletError) {
      routeLogger.error("Error updating wallet balance", updateWalletError, {
        requestId,
        walletId: wallet.id,
      });

      // Rollback payout request
      await (supabase as any)
        .from("payout_requests")
        .delete()
        .eq("id", payoutRequest.id);

      logger.requestError(
        request,
        new Error("Failed to update wallet balance"),
        500,
        startTime,
        { requestId },
      );

      return errorResponse(
        500,
        {
          code: ErrorCode.SERVER_INTERNAL_ERROR,
          details: { message: "Failed to update wallet balance" },
        },
        request,
      );
    }

    // Create hold transaction record
    await (supabase as any).from("wallet_transactions").insert({
      wallet_id: wallet.id,
      type: "payout",
      status: "pending_review",
      amount: amount,
      description: `Withdrawal to ${bankAccount.bank_code} - ${bankAccount.bank_account_number}`,
      reference_id: payoutRequest.id,
    });

    routeLogger.info("Wallet balance held for payout", {
      requestId,
      walletId: wallet.id,
      amount,
      payoutRequestId: payoutRequest.id,
    });

    // Create disbursement via Xendit
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://api.dailyworkerhub.com"}/api/webhooks/xendit/disbursement`;

      const disbursement = await xenditGateway.createDisbursement({
        externalId: externalId,
        amount: netAmount,
        bankDetails: {
          bankCode: bankAccount.bank_code,
          accountNumber: bankAccount.bank_account_number,
          accountHolderName: bankAccount.bank_account_name,
        },
        description: `Worker withdrawal - ${worker.full_name}`,
        emailTo: worker.user_id, // Will be replaced with actual email if available
        callbackUrl: webhookUrl,
        metadata: {
          payout_request_id: payoutRequest.id,
          worker_id: workerId,
          fee_amount: feeAmount,
        },
      });

      // Update payout request with provider ID
      await (supabase as any)
        .from("payout_requests")
        .update({
          provider_payout_id: disbursement.id,
          status: "processing",
          provider_response: disbursement,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutRequest.id);

      // Update transaction status
      await (supabase as any)
        .from("wallet_transactions")
        .update({ status: "paid" })
        .eq("reference_id", payoutRequest.id);

      routeLogger.info("Disbursement created successfully", {
        requestId,
        payoutRequestId: payoutRequest.id,
        disbursementId: disbursement.id,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, {
        requestId,
        payoutRequestId: payoutRequest.id,
      });

      // Audit log for successful disbursement creation
      logger.audit("disbursement_created", {
        requestId,
        payoutRequestId: payoutRequest.id,
        disbursementId: disbursement.id,
        workerId,
        netAmount,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: payoutRequest.id,
          externalId: externalId,
          disbursementId: disbursement.id,
          amount: amount,
          feeAmount: feeAmount,
          netAmount: netAmount,
          status: "processing",
          estimatedArrival: disbursement.estimatedArrival,
          bankCode: bankAccount.bank_code,
          accountNumber: bankAccount.bank_account_number,
          createdAt: payoutRequest.created_at,
        },
      });
    } catch (disbursementError) {
      routeLogger.error("Disbursement failed", disbursementError, {
        requestId,
        payoutRequestId: payoutRequest.id,
      });

      // Refund wallet balance
      await (supabase as any)
        .from("wallets")
        .update({
          balance: wallet.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      // Update payout request as failed
      await (supabase as any)
        .from("payout_requests")
        .update({
          status: "failed",
          failure_reason:
            disbursementError instanceof Error
              ? disbursementError.message
              : "Disbursement failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutRequest.id);

      // Update transaction status
      await (supabase as any)
        .from("wallet_transactions")
        .update({ status: "refunded" })
        .eq("reference_id", payoutRequest.id);

      // Audit log for failed disbursement
      logger.audit("disbursement_failed", {
        requestId,
        payoutRequestId: payoutRequest.id,
        workerId,
        amount,
        error:
          disbursementError instanceof Error
            ? disbursementError.message
            : "Unknown error",
      });

      logger.requestError(request, disbursementError, 500, startTime, {
        requestId,
        payoutRequestId: payoutRequest.id,
      });

      return errorResponse(
        500,
        {
          code: ErrorCode.EXTERNAL_SERVICE_ERROR,
          details: {
            message: "Failed to process withdrawal",
            details:
              disbursementError instanceof Error
                ? disbursementError.message
                : "Unknown error",
          },
        },
        request,
      );
    }
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/payments/withdraw",
      error,
      { requestId },
    );
    logger.requestError(request, error, 500, startTime, { requestId });

    return handleApiError(error, request, requestId, "POST");
  }
}

/**
 * @openapi
 * /api/payments/withdraw:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Health check for withdraw endpoint
 *     description: Returns the status of the withdrawal endpoint
 *     security: []
 *     responses:
 *       200:
 *         description: Endpoint status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 endpoint:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
async function handleGET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "payments/withdraw",
  });

  routeLogger.info("Health check for withdraw endpoint", { requestId });
  logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

  return NextResponse.json({
    status: "ok",
    endpoint: "withdraw",
    timestamp: new Date().toISOString(),
  });
}

// Export handlers with rate limiting
export const POST = withRateLimit(handlePOST, {
  type: "payment",
  userBased: true,
});
export const GET = withRateLimit(handleGET, {
  type: "api-public",
  userBased: false,
});
