import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { verifyFcmToken } from "@/lib/firebase-admin";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("notifications/register-token");

/**
 * POST /api/notifications/register-token
 * Register an FCM device token for the authenticated user
 *
 * Request body:
 * - token: FCM device token (required)
 * - deviceType: 'web' | 'android' | 'ios' (required)
 * - deviceId: Unique device identifier (optional)
 * - deviceName: Human-readable device name (optional)
 */
export async function POST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications/register-token",
  });

  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      routeLogger.warn("Unauthorized access attempt", { requestId });
      logger.requestError(
        request,
        new Error("Tidak terautentikasi"),
        401,
        startTime,
        { requestId },
      );

      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const body = await request.json();
    const { token, deviceType, deviceId, deviceName } = body;

    // Validate required fields
    if (!token) {
      return errorResponse(
        400,
        { code: "VALIDATION_ERROR", i18nKey: "errors.validationFailed", details: { field: "token" } },
        request,
      );
    }

    if (!deviceType || !["web", "android", "ios"].includes(deviceType)) {
      return errorResponse(
        400,
        {
          code: "VALIDATION_ERROR",
          i18nKey: "errors.validationFailed",
          details: { message: "Tipe perangkat tidak valid. Gunakan: web, android, atau ios" },
        },
        request,
      );
    }

    // Verify token validity (optional but recommended)
    const isValid = await verifyFcmToken(token);
    if (!isValid) {
      routeLogger.warn("Invalid FCM token provided", {
        requestId,
        userId: user.id,
      });
      // Still store it, but mark as potentially invalid
    }

    // Check if token already exists
    const { data: existingToken } = await (supabase as any)
      .from("user_fcm_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("token", token)
      .single();

    if (existingToken) {
      // Update existing token
      const { data, error } = await (supabase as any)
        .from("user_fcm_tokens")
        .update({
          is_active: true,
          last_used_at: new Date().toISOString(),
          device_name: deviceName || existingToken.device_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingToken.id)
        .select()
        .single();

      if (error) {
        routeLogger.error("Failed to update FCM token", error, {
          requestId,
          userId: user.id,
        });
        logger.requestError(
          request,
          new Error("Gagal memperbarui token FCM"),
          500,
          startTime,
          { requestId },
        );

        return errorResponse(
          500,
          { code: "DB_UPDATE_ERROR", i18nKey: "errors.serverError", details: error.message },
          request,
        );
      }

      routeLogger.info("FCM token updated", {
        requestId,
        userId: user.id,
        tokenId: data.id,
      });
      return NextResponse.json({
        success: true,
        message: "Token FCM diperbarui",
        data,
      });
    }

    // Create new token
    const { data, error } = await (supabase as any)
      .from("user_fcm_tokens")
      .insert({
        user_id: user.id,
        token,
        device_type: deviceType,
        device_id: deviceId || null,
        device_name: deviceName || null,
        is_active: true,
        last_used_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      routeLogger.error("Failed to register FCM token", error, {
        requestId,
        userId: user.id,
      });
      logger.requestError(
        request,
        new Error("Gagal mendaftarkan token FCM"),
        500,
        startTime,
        { requestId },
      );

      return errorResponse(
        500,
        { code: "DB_INSERT_ERROR", i18nKey: "errors.serverError", details: error.message },
        request,
      );
    }

    // Create default notification preferences if not exists
    const { error: prefError } = await (supabase as any)
      .from("notification_preferences")
      .upsert({ user_id: user.id }, { onConflict: "user_id" });

    if (prefError) {
      routeLogger.warn("Failed to create notification preferences", {
        requestId,
        userId: user.id,
      });
    }

    routeLogger.info("FCM token registered", {
      requestId,
      userId: user.id,
      tokenId: data.id,
    });
    logger.requestSuccess(request, { status: 201 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Token FCM berhasil didaftarkan",
        data,
      },
      { status: 201 },
    );
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/notifications/register-token",
      error,
      { requestId },
    );

    return handleApiError(error, request, "/api/notifications/register-token", "POST");
  }
}
