/**
 * Conversation by Booking ID API Route
 *
 * Endpoint for retrieving a single conversation by booking ID.
 * The authenticated user must be a participant in the booking.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getConversationByBookingId } from "@/lib/supabase/queries/conversations";

const routeLogger = logger.createApiLogger("conversations/[bookingId]");

type Params = {
  params: Promise<{ bookingId: string }>;
};

/**
 * @openapi
 * /api/conversations/{bookingId}:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Get a conversation by booking ID
 *     description: Retrieve a single conversation by booking ID. User must be a participant in the booking.
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: The booking ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Conversation found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized to view this conversation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Conversation not found
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
export async function GET(request: NextRequest, { params }: Params) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "conversations/[bookingId]",
  });

  try {
    const { bookingId } = await params;

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

    const { data: conversation, error } = await getConversationByBookingId(
      bookingId,
      user.id,
    );

    if (error) {
      if (error.message === "Not authorized") {
        routeLogger.warn("User not authorized to view conversation", {
          requestId,
          userId: user.id,
          bookingId,
        });
        logger.requestError(
          request,
          new Error("Tidak diizinkan melihat percakapan ini"),
          403,
          startTime,
          { requestId },
        );

        return NextResponse.json(
          { error: "Tidak diizinkan melihat percakapan ini" },
          { status: 403 },
        );
      }

      routeLogger.error("Error fetching conversation", error, {
        requestId,
        userId: user.id,
        bookingId,
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

    if (!conversation) {
      routeLogger.warn("Conversation not found", {
        requestId,
        userId: user.id,
        bookingId,
      });
      logger.requestError(
        request,
        new Error("Percakapan tidak ditemukan"),
        404,
        startTime,
        { requestId },
      );

      return NextResponse.json(
        { error: "Percakapan tidak ditemukan" },
        { status: 404 },
      );
    }

    routeLogger.info("Conversation fetched successfully", {
      requestId,
      conversationId: conversation.id,
      bookingId,
      userId: user.id,
    });
    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      conversationId: conversation.id,
      userId: user.id,
    });

    return NextResponse.json({ data: conversation });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in GET /api/conversations/[bookingId]",
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
