import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  handleApiError,
  unauthorizedErrorResponse,
} from "@/lib/api/error-response";

const routeLogger = logger.createApiLogger("notifications/preferences");

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the authenticated user
 */
export async function GET(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications/preferences",
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

    const { data: preferences, error } = await (supabase as any)
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      routeLogger.error("Failed to fetch notification preferences", error, {
        requestId,
        userId: user.id,
      });
      logger.requestError(
        request,
        new Error("Gagal mengambil preferensi notifikasi"),
        500,
        startTime,
        { requestId },
      );

      return errorResponse(
        500,
        { code: "DB_QUERY_ERROR", i18nKey: "errors.serverError", details: error?.message },
        request,
      );
    }

    // Return default preferences if none exist
    if (!preferences) {
      const defaultPreferences = {
        user_id: user.id,
        push_enabled: true,
        booking_notifications: true,
        payment_notifications: true,
        message_notifications: true,
        reminder_notifications: true,
        review_notifications: true,
        marketing_notifications: false,
        quiet_hours_enabled: false,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
      };

      // Create default preferences
      const { data: newPrefs, error: createError } = await (supabase as any)
        .from("notification_preferences")
        .insert(defaultPreferences)
        .select()
        .single();

      if (createError) {
        routeLogger.warn("Failed to create default preferences", {
          requestId,
          userId: user.id,
        });
      }

      routeLogger.info("Default notification preferences created", {
        requestId,
        userId: user.id,
      });
      logger.requestSuccess(request, { status: 200 }, startTime, {
        requestId,
        userId: user.id,
      });

      return NextResponse.json({
        success: true,
        data: newPrefs || defaultPreferences,
      });
    }

    routeLogger.info("Notification preferences fetched", {
      requestId,
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in GET /api/notifications/preferences",
      error,
      { requestId },
    );

    return handleApiError(
      error,
      request,
      "/api/notifications/preferences",
      "GET",
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Update notification preferences for the authenticated user
 *
 * Request body:
 * - push_enabled: boolean
 * - booking_notifications: boolean
 * - payment_notifications: boolean
 * - message_notifications: boolean
 * - reminder_notifications: boolean
 * - review_notifications: boolean
 * - marketing_notifications: boolean
 * - quiet_hours_enabled: boolean
 * - quiet_hours_start: string (HH:mm format)
 * - quiet_hours_end: string (HH:mm format)
 */
export async function PUT(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications/preferences",
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

    // Validate quiet hours format if provided
    if (
      body.quiet_hours_start &&
      !/^\d{2}:\d{2}$/.test(body.quiet_hours_start)
    ) {
      return errorResponse(
        400,
        {
          code: "VALIDATION_ERROR",
          i18nKey: "errors.validation",
          details: "Format quiet_hours_start tidak valid. Gunakan HH:mm",
        },
        request,
      );
    }

    if (body.quiet_hours_end && !/^\d{2}:\d{2}$/.test(body.quiet_hours_end)) {
      return errorResponse(
        400,
        {
          code: "VALIDATION_ERROR",
          i18nKey: "errors.validation",
          details: "Format quiet_hours_end tidak valid. Gunakan HH:mm",
        },
        request,
      );
    }

    // Prepare update data (only allow valid fields)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      "push_enabled",
      "booking_notifications",
      "payment_notifications",
      "message_notifications",
      "reminder_notifications",
      "review_notifications",
      "marketing_notifications",
      "quiet_hours_enabled",
      "quiet_hours_start",
      "quiet_hours_end",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Check if preferences exist
    const { data: existing } = await (supabase as any)
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let result;

    if (existing) {
      // Update existing preferences
      const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .update(updateData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        routeLogger.error("Failed to update notification preferences", error, {
          requestId,
          userId: user.id,
        });
        logger.requestError(
          request,
          new Error("Gagal memperbarui preferensi notifikasi"),
          500,
          startTime,
          { requestId },
        );

        return errorResponse(
          500,
          { code: "DB_UPDATE_ERROR", i18nKey: "errors.serverError", details: error?.message },
          request,
        );
      }

      result = data;
    } else {
      // Create new preferences
      const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .insert({ user_id: user.id, ...updateData })
        .select()
        .single();

      if (error) {
        routeLogger.error("Failed to create notification preferences", error, {
          requestId,
          userId: user.id,
        });
        logger.requestError(
          request,
          new Error("Gagal membuat preferensi notifikasi"),
          500,
          startTime,
          { requestId },
        );

        return errorResponse(
          500,
          { code: "DB_INSERT_ERROR", i18nKey: "errors.serverError", details: error?.message },
          request,
        );
      }

      result = data;
    }

    routeLogger.info("Notification preferences updated", {
      requestId,
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Preferensi notifikasi berhasil diperbarui",
      data: result,
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in PUT /api/notifications/preferences",
      error,
      { requestId },
    );

    return handleApiError(
      error,
      request,
      "/api/notifications/preferences",
      "PUT",
    );
  }
}
