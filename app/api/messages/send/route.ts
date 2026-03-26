/**
 * POST /api/messages/send
 * Send a message programmatically with booking scope validation
 *
 * Request body:
 * - receiverId: User ID of the message recipient (required)
 * - content: Message text content (required)
 * - bookingId: Booking ID to scope the message to (required for non-admin users)
 *
 * Authorization:
 * - Admin: Can send to any user without booking scope
 * - Business: Can send to workers they have bookings with (bookingId required)
 * - Worker: Can send to businesses they have bookings with (bookingId required)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { sendMessage } from "@/lib/actions/messages";

const routeLogger = logger.createApiLogger("messages/send");

export async function POST(request: NextRequest) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "messages/send",
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
      return NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 },
      );
    }

    // Check user role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "worker";

    const body = await request.json();
    const { receiverId, content, bookingId } = body;

    // Validate required fields
    if (!receiverId) {
      return NextResponse.json(
        { error: "receiverId wajib diisi" },
        { status: 400 },
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Isi pesan tidak valid" },
        { status: 400 },
      );
    }

    // Prevent sending to self
    if (receiverId === user.id) {
      return NextResponse.json(
        { error: "Tidak dapat mengirim pesan ke diri sendiri" },
        { status: 400 },
      );
    }

    // Booking scope validation for non-admin users
    if (userRole !== "admin") {
      if (!bookingId) {
        return NextResponse.json(
          { error: "bookingId wajib diisi untuk mengirim pesan" },
          { status: 400 },
        );
      }

      // Verify booking exists and has valid status
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, status, worker_id, business_id")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        routeLogger.warn("Booking not found", {
          requestId,
          userId: user.id,
          bookingId,
        });
        return NextResponse.json(
          { error: "Booking tidak ditemukan" },
          { status: 404 },
        );
      }

      // Check booking status allows messaging
      const validStatuses = ["pending", "accepted", "in_progress", "completed"];
      if (!validStatuses.includes(booking.status)) {
        routeLogger.warn("Booking not in valid status for messaging", {
          requestId,
          userId: user.id,
          bookingId,
          status: booking.status,
        });
        return NextResponse.json(
          {
            error: `Pesan tidak dapat dikirim untuk booking dengan status '${booking.status}'`,
          },
          { status: 400 },
        );
      }

      // Verify user is a participant in this booking
      const isWorker = booking.worker_id === user.id;
      const isBusiness = booking.business_id === user.id;
      const isParticipant = isWorker || isBusiness;

      if (!isParticipant) {
        routeLogger.warn("User not a participant in booking", {
          requestId,
          userId: user.id,
          bookingId,
        });
        return NextResponse.json(
          { error: "Anda tidak diizinkan mengirim pesan untuk booking ini" },
          { status: 403 },
        );
      }

      // Verify receiver is the other participant in the booking
      const expectedReceiverId = isWorker ? booking.business_id : booking.worker_id;
      if (receiverId !== expectedReceiverId) {
        routeLogger.warn("Receiver not a participant in booking", {
          requestId,
          userId: user.id,
          bookingId,
          receiverId,
          expectedReceiverId,
        });
        return NextResponse.json(
          { error: "Penerima bukan peserta dalam booking ini" },
          { status: 403 },
        );
      }
    }

    // Call the sendMessage action
    const result = await sendMessage(user.id, receiverId, content.trim(), bookingId);

    if (!result.success) {
      routeLogger.warn("Message send failed", {
        requestId,
        userId: user.id,
        receiverId,
        bookingId: bookingId || null,
        error: result.error,
      });

      // Distinguish between authorization errors (403) and other errors (500)
      const isAuthError = result.error?.includes("tidak dapat") ||
        result.error?.includes("tidak diizinkan") ||
        result.error?.includes("booking");

      return NextResponse.json(
        { error: result.error || "Gagal mengirim pesan" },
        { status: isAuthError ? 403 : 500 },
      );
    }

    routeLogger.info("Message sent successfully", {
      requestId,
      senderId: user.id,
      receiverId,
      bookingId: bookingId || null,
      messageId: result.data?.id,
    });

    logger.requestSuccess(request, { status: 200 }, startTime, {
      requestId,
      senderId: user.id,
      receiverId,
      bookingId: bookingId || null,
    });

    return NextResponse.json({
      success: true,
      message: "Pesan berhasil dikirim",
      data: result.data,
    });
  } catch (error) {
    routeLogger.error(
      "Unexpected error in POST /api/messages/send",
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
