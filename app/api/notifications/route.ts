/**
 * Notifications API Routes
 *
 * Endpoints for managing user notifications in the Daily Worker Hub platform.
 * Users can view, filter, and mark notifications as read.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const routeLogger = logger.createApiLogger("notifications");

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get user notifications
 *     description: Retrieve notifications for the authenticated user with optional filtering
 *     parameters:
 *       - name: filter
 *         in: query
 *         description: Filter notifications by read status
 *         schema:
 *           type: string
 *           enum: [all, unread, read]
 *           default: all
 *       - name: limit
 *         in: query
 *         description: Maximum number of notifications to return
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: offset
 *         in: query
 *         description: Number of notifications to skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications",
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

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = `user_id=eq.${user.id}&order=created_at.desc&limit=${limit}&offset=${offset}`;

    if (filter === "unread") {
      query += "&is_read=eq.false";
    } else if (filter === "read") {
      query += "&is_read=eq.true";
    }

    // Fetch notifications
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?${query}`,
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
        { error: "Gagal mengambil notifikasi" },
        { status: response.status },
      );
    }

    const notifications = await response.json();

    // Get unread count
    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&is_read=eq.false&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${user.app_metadata?.supabase_token || ""}`,
          "Content-Type": "application/json",
          Prefer: "count=exact",
        },
      },
    );

    let unreadCount = 0;
    if (countResponse.ok) {
      const contentRange = countResponse.headers.get("content-range");
      if (contentRange) {
        const total = contentRange.split("/")[1];
        unreadCount = parseInt(total) || 0;
      }
    }

    routeLogger.info("Notifications fetched successfully", {
      requestId,
      count: notifications?.length || 0,
      unreadCount,
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      data: notifications,
      unreadCount,
      total: notifications?.length || 0,
    });
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/notifications", error, {
      requestId,
    });
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Terjadi kesalahan server", details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * @openapi
 * /api/notifications:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark all notifications as read
 *     description: Mark all unread notifications as read for the authenticated user
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                   description: Number of notifications marked as read
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function PATCH(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "notifications",
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

    // Mark all as read
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&is_read=eq.false`,
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
        { error: "Gagal menandai notifikasi" },
        { status: response.status },
      );
    }

    const updatedNotifications = await response.json();

    routeLogger.info("All notifications marked as read", {
      requestId,
      count: updatedNotifications?.length || 0,
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Semua notifikasi telah ditandai sebagai dibaca",
      count: updatedNotifications?.length || 0,
    });
  } catch (error) {
    routeLogger.error("Unexpected error in PATCH /api/notifications", error, {
      requestId,
    });
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Terjadi kesalahan server", details: (error as Error).message },
      { status: 500 },
    );
  }
}
