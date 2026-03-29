import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("notifications/token");

/**
 * DELETE /api/notifications/token
 * Remove an FCM device token (called on logout or token invalidation)
 *
 * Query params:
 * - token: FCM token to remove (optional, removes all tokens if not provided)
 * - deviceId: Device identifier to remove tokens for (optional)
 */
export async function DELETE(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications/token",
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

      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const deviceId = searchParams.get("deviceId");

    if (!token && !deviceId) {
      return errorResponse(
        400,
        { code: "VALIDATION_ERROR", i18nKey: "errors.validationFailed", details: { message: "Token atau deviceId diperlukan" } },
        request,
      );
    }

    let query = (supabase as any)
      .from("user_fcm_tokens")
      .delete()
      .eq("user_id", user.id);

    if (token) {
      query = query.eq("token", token);
    }

    if (deviceId) {
      query = query.eq("device_id", deviceId);
    }

    const { error, count } = await query;

    if (error) {
      routeLogger.error("Failed to remove FCM token", error, {
        requestId,
        userId: user.id,
      });

      return errorResponse(
        500,
        { code: "DB_QUERY_ERROR", i18nKey: "errors.serverError", details: { supabaseMessage: error.message } },
        request,
      );
    }

    routeLogger.info("FCM token(s) removed", {
      requestId,
      userId: user.id,
      count,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Token FCM berhasil dihapus",
      count,
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in DELETE /api/notifications/token",
      error,
      { requestId },
    );

    return handleApiError(error, request, "/api/notifications/token", "DELETE");
  }
}

/**
 * GET /api/notifications/token
 * Get all FCM tokens for the authenticated user
 */
export async function GET(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications/token",
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

      return unauthorizedErrorResponse("errors.unauthorized", request);
    }

    const { data: tokens, error } = await (supabase as any)
      .from("user_fcm_tokens")
      .select(
        "id, device_type, device_id, device_name, is_active, last_used_at, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      routeLogger.error("Failed to fetch FCM tokens", error, {
        requestId,
        userId: user.id,
      });

      return errorResponse(
        500,
        { code: "DB_QUERY_ERROR", i18nKey: "errors.serverError", details: { supabaseMessage: error.message } },
        request,
      );
    }

    routeLogger.info("FCM tokens fetched", {
      requestId,
      userId: user.id,
      count: tokens?.length || 0,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: tokens || [],
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in GET /api/notifications/token",
      error,
      { requestId },
    );

    return handleApiError(error, request, "/api/notifications/token", "GET");
  }
}
