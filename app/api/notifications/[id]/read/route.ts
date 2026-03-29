import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
} from "@/lib/api/error-response";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const routeLogger = logger.createApiLogger("notifications/[id]/read");

/**
 * PATCH /api/notifications/[id]/read
 * Mark a specific notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications/[id]/read",
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

    const { id } = await params;

    // Verify notification belongs to user and update
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${user.app_metadata?.supabase_token || ""}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ is_read: true }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      routeLogger.error("Supabase API error", new Error(errorText), {
        requestId,
        status: response.status,
        notificationId: id,
        userId: user.id,
      });
      logger.requestError(
        request,
        new Error(`Supabase error: ${errorText}`),
        response.status,
        startTime,
        { requestId },
      );

      return errorResponse(
        response.status,
        { code: "DB_QUERY_ERROR", i18nKey: "errors.serverError", details: errorText },
        request,
      );
    }

    const updatedNotification = await response.json();

    if (!updatedNotification || updatedNotification.length === 0) {
      routeLogger.warn("Notification not found", {
        requestId,
        notificationId: id,
        userId: user.id,
      });
      logger.requestError(
        request,
        new Error("Notifikasi tidak ditemukan"),
        404,
        startTime,
        { requestId },
      );

      return errorResponse(
        404,
        { code: "NOT_FOUND", i18nKey: "errors.notFound", details: "Notifikasi tidak ditemukan" },
        request,
      );
    }

    routeLogger.info("Notification marked as read", {
      requestId,
      notificationId: id,
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: updatedNotification[0],
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in PATCH /api/notifications/[id]/read",
      error,
      { requestId },
    );
    logger.requestError(request, error, 500, startTime, { requestId });

    return handleApiError(error, request, "/api/notifications/[id]/read", "PATCH");
  }
}
