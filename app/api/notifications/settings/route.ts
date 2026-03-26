import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withRateLimitForMethod } from "@/lib/rate-limit";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const routeLogger = logger.createApiLogger("notifications/settings");

/**
 * GET /api/notifications/settings
 * Get notification preferences for the authenticated user
 */
async function handleGET(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications/settings",
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

      return NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 },
      );
    }

    // Fetch notification preferences
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_notification_preferences?user_id=eq.${user.id}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${user.app_metadata?.supabase_token || ""}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      routeLogger.error("Supabase API error", new Error(errorText), {
        requestId,
        status: response.status,
        userId: user.id,
      });
      logger.requestError(
        request,
        new Error(`Supabase error: ${errorText}`),
        response.status,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Gagal mengambil preferensi notifikasi" },
        { status: response.status },
      );
    }

    let preferences = await response.json();

    // If no preferences exist, create default
    if (!preferences || preferences.length === 0) {
      const createResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_notification_preferences`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${user.app_metadata?.supabase_token || ""}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            user_id: user.id,
            push_enabled: true,
            new_applications: true,
            booking_status: true,
            payment_confirmation: true,
            new_job_matches: true,
            shift_reminders: true,
          }),
        },
      );

      if (createResponse.ok) {
        preferences = await createResponse.json();
        routeLogger.info("Default notification preferences created", {
          requestId,
          userId: user.id,
        });
      }
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
      data: preferences?.[0] || preferences,
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in GET /api/notifications/settings",
      error,
      { requestId },
    );
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Terjadi kesalahan server", details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/notifications/settings
 * Update notification preferences for the authenticated user
 */
async function handlePOST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications/settings",
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

      return NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate allowed fields
    const allowedFields = [
      "push_enabled",
      "new_applications",
      "booking_status",
      "payment_confirmation",
      "new_job_matches",
      "shift_reminders",
    ];

    const updateData: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (typeof body[field] === "boolean") {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      routeLogger.warn("No valid data to update", {
        requestId,
        userId: user.id,
      });
      logger.requestError(
        request,
        new Error("Tidak ada data yang valid untuk diperbarui"),
        400,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Tidak ada data yang valid untuk diperbarui" },
        { status: 400 },
      );
    }

    // Check if preferences exist
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/user_notification_preferences?user_id=eq.${user.id}&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${user.app_metadata?.supabase_token || ""}`,
          "Content-Type": "application/json",
        },
      },
    );

    const existing = await checkResponse.json();
    let response;

    if (existing && existing.length > 0) {
      // Update existing preferences
      response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_notification_preferences?user_id=eq.${user.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${user.app_metadata?.supabase_token || ""}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(updateData),
        },
      );
    } else {
      // Create new preferences
      response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_notification_preferences`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${user.app_metadata?.supabase_token || ""}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            user_id: user.id,
            ...updateData,
          }),
        },
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      routeLogger.error("Supabase API error", new Error(errorText), {
        requestId,
        status: response.status,
        userId: user.id,
      });
      logger.requestError(
        request,
        new Error(`Supabase error: ${errorText}`),
        response.status,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Gagal memperbarui preferensi notifikasi" },
        { status: response.status },
      );
    }

    const updatedPreferences = await response.json();

    routeLogger.info("Notification preferences updated", {
      requestId,
      updatedFields: Object.keys(updateData),
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Preferensi notifikasi berhasil diperbarui",
      data: updatedPreferences?.[0] || updatedPreferences,
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/notifications/settings",
      error,
      { requestId },
    );
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Terjadi kesalahan server", details: (error as Error).message },
      { status: 500 },
    );
  }
}

// Export handlers with rate limiting
// GET is authenticated (100 req/min), POST is authenticated (100 req/min)
export const GET = withRateLimitForMethod(
  handleGET as any,
  { type: "api-authenticated", userBased: true },
  ["GET"],
);
export const POST = withRateLimitForMethod(
  handlePOST as any,
  { type: "api-authenticated", userBased: true },
  ["POST"],
);
