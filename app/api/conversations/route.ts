/**
 * Conversations API Routes
 *
 * Endpoints for managing conversations between businesses and workers
 * scoped to confirmed bookings in the Daily Worker Hub platform.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  getConversations,
  getOrCreateConversation,
} from "@/lib/supabase/queries/conversations";

const routeLogger = logger.createApiLogger("conversations");

/**
 * @openapi
 * /api/conversations:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Get user's conversations
 *     description: Retrieve all conversations for the authenticated user ordered by most recent message
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Maximum number of conversations to return
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: offset
 *         in: query
 *         description: Number of conversations to skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *                 total:
 *                   type: integer
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
 *   post:
 *     tags:
 *       - Conversations
 *     summary: Create or get a conversation
 *     description: Get existing conversation for a booking or create a new one. User must be a participant in the booking.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - booking_id
 *               - worker_id
 *               - business_id
 *             properties:
 *               booking_id:
 *                 type: string
 *                 description: The booking ID to create/get conversation for
 *               worker_id:
 *                 type: string
 *                 description: The worker user ID
 *               business_id:
 *                 type: string
 *                 description: The business user ID
 *     responses:
 *       201:
 *         description: Conversation created or returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized to create conversation for this booking
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
    route: "conversations",
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: conversations, error } = await getConversations(user.id);

    if (error) {
      routeLogger.error("Error fetching conversations", error, {
        requestId,
        userId: user.id,
      });
      logger.requestError(
        request,
        new Error(`Gagal mengambil percakapan: ${error.message}`),
        500,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Gagal mengambil percakapan" },
        { status: 500 },
      );
    }

    // Apply pagination
    const paginatedConversations = conversations?.slice(offset, offset + limit) || [];

    const totalUnread = (conversations || []).reduce((sum: number, conv: any) => {
      // Determine which unread count applies to this user
      const isWorker = conv.worker_id === user.id;
      return sum + (isWorker ? conv.unread_worker_count : conv.unread_business_count);
    }, 0);

    routeLogger.info("Conversations fetched successfully", {
      requestId,
      count: paginatedConversations.length,
      totalUnread,
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      userId: user.id,
    });

    return NextResponse.json({
      data: paginatedConversations,
      total: conversations?.length || 0,
      totalUnread,
    });
  } catch (error) {
    routeLogger.error("Unexpected error in GET /api/conversations", error, {
      requestId,
    });
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Terjadi kesalahan server", details: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "conversations",
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
    const { booking_id, worker_id, business_id } = body;

    // Validate required fields
    if (!booking_id || !worker_id || !business_id) {
      routeLogger.warn("Missing required fields in POST /api/conversations", {
        requestId,
        userId: user.id,
        hasBookingId: !!booking_id,
        hasWorkerId: !!worker_id,
        hasBusinessId: !!business_id,
      });

      return NextResponse.json(
        { error: "booking_id, worker_id, dan business_id wajib diisi" },
        { status: 400 },
      );
    }

    // Verify user is a participant in the booking
    if (user.id !== worker_id && user.id !== business_id) {
      routeLogger.warn("User not a participant in booking", {
        requestId,
        userId: user.id,
        bookingId: booking_id,
      });

      return NextResponse.json(
        { error: "Tidak diizinkan membuat percakapan untuk booking ini" },
        { status: 403 },
      );
    }

    // Verify booking exists and is in a valid status
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, worker_id, business_id")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      routeLogger.warn("Booking not found", {
        requestId,
        userId: user.id,
        bookingId: booking_id,
      });

      return NextResponse.json(
        { error: "Booking tidak ditemukan" },
        { status: 404 },
      );
    }

    const validStatuses = ["pending", "accepted", "in_progress", "completed"];
    if (!validStatuses.includes(booking.status)) {
      routeLogger.warn("Booking not in valid status for conversation", {
        requestId,
        userId: user.id,
        bookingId: booking_id,
        status: booking.status,
      });

      return NextResponse.json(
        { error: `Percakapan tidak dapat dibuat untuk booking dengan status '${booking.status}'` },
        { status: 400 },
      );
    }

    // Get or create conversation
    const { data: conversation, error: convError } = await getOrCreateConversation(
      booking_id,
      worker_id,
      business_id,
    );

    if (convError) {
      routeLogger.error("Error creating conversation", convError, {
        requestId,
        userId: user.id,
        bookingId: booking_id,
      });
      logger.requestError(
        request,
        new Error(`Gagal membuat percakapan: ${convError.message}`),
        500,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Gagal membuat percakapan" },
        { status: 500 },
      );
    }

    routeLogger.info("Conversation created or retrieved", {
      requestId,
      conversationId: conversation?.id,
      bookingId: booking_id,
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 201 }, startTime, {
      requestId,
      conversationId: conversation?.id,
      userId: user.id,
    });

    return NextResponse.json(
      { data: conversation },
      { status: 201 },
    );
  } catch (error) {
    routeLogger.error("Unexpected error in POST /api/conversations", error, {
      requestId,
    });
    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      { error: "Terjadi kesalahan server", details: (error as Error).message },
      { status: 500 },
    );
  }
}
