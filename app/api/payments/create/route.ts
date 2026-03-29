/**
 * Payment Creation API Route
 *
 * Creates a new payment transaction using the specified payment gateway.
 * Supports both Xendit and Midtrans payment providers.
 *
 * Rate limited: 10 requests per minute (payment endpoints)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import type { Json } from "@/lib/supabase/types";
import {
  createInvoice,
  calculateFee,
  isProviderEnabled,
  type PaymentProvider,
  type CreateInvoiceInput,
} from "@/lib/payments";
import { PAYMENT_CONSTANTS } from "@/lib/types/payment";
import { logger } from "@/lib/logger";
import { parseRequest } from "@/lib/validations";
import { createPaymentSchema } from "@/lib/validations/payment";
import { withRateLimit } from "@/lib/rate-limit";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
  notFoundErrorResponse,
  externalServiceErrorResponse,
} from "@/lib/api/error-response";
import { ErrorCode } from "@/lib/api/errors";

const routeLogger = logger.createApiLogger("payments/create");

/**
 * @openapi
 * /api/payments/create:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create a payment transaction
 *     description: Create a new top-up payment transaction for a business wallet using the specified payment provider
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentCreate'
 *     responses:
 *       200:
 *         description: Payment transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentCreateResponse'
 *       400:
 *         description: Validation error or invalid provider
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Business not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to create payment transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function handlePOST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "payments/create",
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
    const parseResult = await parseRequest(request, createPaymentSchema);

    if (!parseResult.success) {
      routeLogger.warn("Validation failed", { requestId });
      return (parseResult as { error: NextResponse }).error;
    }

    const {
      business_id,
      amount,
      provider = "xendit",
      payment_method,
      customer_email,
      customer_name,
      metadata,
    } = parseResult.data;

    // Audit log for all payment creation requests
    logger.audit("payment_create_request", {
      requestId,
      businessId: business_id,
      amount,
      provider,
      paymentMethod: payment_method,
    });

    // Validate provider
    const paymentProvider = provider as PaymentProvider;
    if (!isProviderEnabled(paymentProvider)) {
      routeLogger.warn("Payment provider not enabled", { requestId, provider });
      logger.requestError(
        request,
        new Error(`Payment provider '${provider}' is not enabled`),
        400,
        startTime,
        { requestId },
      );

      return errorResponse(
        400,
        {
          code: ErrorCode.ERROR_BAD_REQUEST,
          details: { message: `Payment provider '${provider}' is not enabled` },
        },
        request,
      );
    }

    // Get business info
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, user_id")
      .eq("id", business_id)
      .single();

    if (businessError || !business) {
      routeLogger.error(
        "Business not found",
        businessError || new Error("Not found"),
        { requestId, businessId: business_id },
      );
      logger.requestError(
        request,
        new Error("Business not found"),
        404,
        startTime,
        { requestId },
      );

      return notFoundErrorResponse("Business", business_id, request);
    }

    // Calculate fee
    const feeAmount = calculateFee(amount, payment_method);
    const totalAmount = amount + feeAmount;

    // Generate unique transaction ID
    const transactionId = `payment_${business_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    routeLogger.info("Creating payment transaction", {
      requestId,
      transactionId,
      businessId: business_id,
      amount: totalAmount,
      provider,
    });

    // Create pending transaction in database
    const txData = {
      id: transactionId,
      business_id,
      amount: totalAmount,
      status: "pending_review" as const,
      payment_provider: paymentProvider,
      provider_payment_id: null,
      payment_url: null,
      qris_expires_at: new Date(
        Date.now() + PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES * 60000,
      ).toISOString(),
      fee_amount: feeAmount,
      metadata: (metadata || {}) as Json,
    };
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .insert(txData)
      .select()
      .single();

    if (txError || !transaction) {
      routeLogger.error(
        "Failed to create transaction",
        txError || new Error("Unknown error"),
        { requestId, businessId: business_id },
      );
      logger.requestError(
        request,
        new Error("Failed to create payment transaction"),
        500,
        startTime,
        { requestId },
      );

      return errorResponse(
        500,
        ErrorCode.PAYMENT_CREATION_FAILED,
        request,
      );
    }

    // Audit log for transaction creation
    logger.audit("payment_transaction_created", {
      requestId,
      transactionId,
      businessId: business_id,
      amount: totalAmount,
      feeAmount,
      provider,
    });

    // Create invoice with payment gateway
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

      const invoiceInput: CreateInvoiceInput = {
        externalId: transactionId,
        amount: totalAmount,
        description: `Top-up wallet untuk ${business.name}`,
        customerEmail: customer_email,
        customerName: customer_name || business.name,
        expiryMinutes: PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES,
        paymentMethod: payment_method,
        successRedirectUrl: `${baseUrl}/business/wallet?payment=success`,
        failureRedirectUrl: `${baseUrl}/business/wallet?payment=failed`,
        callbackUrl: `${baseUrl}/api/webhooks/${paymentProvider}`,
        metadata: {
          business_id,
          business_name: business.name,
          original_amount: amount,
          fee_amount: feeAmount,
        },
      };

      const invoice = await createInvoice(invoiceInput, paymentProvider);

      // Update transaction with payment details
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          payment_url: invoice.invoiceUrl,
          provider_payment_id: invoice.id,
          metadata: {
            ...metadata,
            invoice_id: invoice.id,
            invoice_url: invoice.invoiceUrl,
            qr_string: invoice.qrString,
            token: invoice.token,
            va_number: invoice.vaNumber,
          },
        })
        .eq("id", transactionId);

      if (updateError) {
        routeLogger.warn("Failed to update transaction with payment details", {
          requestId,
          transactionId,
          error: updateError.message,
        });
        // Don't fail - payment URL is still valid
      }

      routeLogger.info("Payment invoice created successfully", {
        requestId,
        transactionId,
        invoiceId: invoice.id,
        provider,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, {
        requestId,
        transactionId,
      });

      // Audit log for successful invoice creation
      logger.audit("payment_invoice_created", {
        requestId,
        transactionId,
        invoiceId: invoice.id,
        provider,
        amount: totalAmount,
      });

      // Return success response
      return NextResponse.json({
        success: true,
        data: {
          transaction: {
            id: transactionId,
            amount: totalAmount,
            original_amount: amount,
            fee_amount: feeAmount,
            status: "pending",
            provider: paymentProvider,
            created_at: transaction.created_at,
            expires_at: transaction.qris_expires_at,
          },
          payment: {
            id: invoice.id,
            invoice_url: invoice.invoiceUrl,
            qr_string: invoice.qrString,
            token: invoice.token,
            va_number: invoice.vaNumber,
            bill_key: invoice.billKey,
            biller_code: invoice.billerCode,
          },
        },
      });
    } catch (invoiceError) {
      // Mark transaction as failed
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          failure_reason:
            invoiceError instanceof Error
              ? invoiceError.message
              : "Failed to create invoice",
        })
        .eq("id", transactionId);

      routeLogger.error("Failed to create invoice", invoiceError, {
        requestId,
        transactionId,
        provider,
      });

      // Audit log for failed invoice creation
      logger.audit("payment_invoice_failed", {
        requestId,
        transactionId,
        provider,
        error:
          invoiceError instanceof Error
            ? invoiceError.message
            : "Unknown error",
      });

      logger.requestError(request, invoiceError, 500, startTime, {
        requestId,
        transactionId,
      });

      return externalServiceErrorResponse(
        paymentProvider,
        {
          message:
            invoiceError instanceof Error
              ? invoiceError.message
              : "Unknown error",
        },
        request,
      );
    }
  } catch (error) {
    routeLogger.error("Unexpected error in POST /api/payments/create", error, {
      requestId: (request as any).requestId,
    });
    logger.requestError(request, error, 500, startTime, {});

    return handleApiError(error, request, "/api/payments/create", "POST");
  }
}

/**
 * @openapi
 * /api/payments/create:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Calculate payment fees
 *     description: Calculate fees for a potential payment transaction. Public endpoint for fee preview.
 *     security: []
 *     parameters:
 *       - name: amount
 *         in: query
 *         required: true
 *         description: Payment amount in IDR
 *         schema:
 *           type: number
 *           minimum: 50000
 *           maximum: 10000000
 *       - name: provider
 *         in: query
 *         description: Payment provider
 *         schema:
 *           type: string
 *           enum: [xendit, midtrans]
 *           default: xendit
 *       - name: payment_method
 *         in: query
 *         description: Payment method (e.g., qris, bank_transfer)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fee calculation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                     fee_amount:
 *                       type: number
 *                     total_amount:
 *                       type: number
 *                     provider:
 *                       type: string
 *                     min_amount:
 *                       type: number
 *                     max_amount:
 *                       type: number
 *       400:
 *         description: Invalid amount
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
async function handleGET(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "payments/create",
  });

  try {
    const { searchParams } = new URL(request.url);
    const amount = parseInt(searchParams.get("amount") || "0");
    const provider = (searchParams.get("provider") ||
      "xendit") as PaymentProvider;
    const paymentMethod = searchParams.get("payment_method") || undefined;

    if (!amount || amount <= 0) {
      routeLogger.warn("Invalid amount in GET request", { requestId, amount });
      logger.requestError(
        request,
        new Error("Valid amount is required"),
        400,
        startTime,
        { requestId },
      );

      return errorResponse(
        400,
        {
          code: ErrorCode.VALIDATION_ERROR,
          details: { message: "Valid amount is required" },
        },
        request,
      );
    }

    // Validate amount limits
    if (amount < PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT) {
      routeLogger.info("Amount validation: below minimum", {
        requestId,
        amount,
        minAmount: PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT,
      });

      return NextResponse.json({
        valid: false,
        error: `Minimum top-up amount is Rp ${PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT.toLocaleString("id-ID")}`,
        min_amount: PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT,
      });
    }

    if (amount > PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT) {
      routeLogger.info("Amount validation: above maximum", {
        requestId,
        amount,
        maxAmount: PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT,
      });

      return NextResponse.json({
        valid: false,
        error: `Maximum top-up amount is Rp ${PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT.toLocaleString("id-ID")}`,
        max_amount: PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT,
      });
    }

    // Calculate fee
    const feeAmount = calculateFee(amount, paymentMethod);
    const totalAmount = amount + feeAmount;

    routeLogger.info("Payment fee calculated", {
      requestId,
      amount,
      feeAmount,
      totalAmount,
      provider,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      valid: true,
      data: {
        amount,
        fee_amount: feeAmount,
        total_amount: totalAmount,
        provider,
        payment_method: paymentMethod,
        min_amount: PAYMENT_CONSTANTS.MIN_TOP_UP_AMOUNT,
        max_amount: PAYMENT_CONSTANTS.MAX_TOP_UP_AMOUNT,
        expiry_minutes: PAYMENT_CONSTANTS.QRIS_EXPIRY_MINUTES,
      },
    });
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/payments/create", error, {
      requestId,
    });
    logger.requestError(request, error, 500, startTime, { requestId });

    return handleApiError(error, request, "/api/payments/create", "GET");
  }
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
