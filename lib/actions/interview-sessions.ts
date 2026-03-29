"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import { createInterviewSession as createInterviewSessionUtil } from "../algorithms/interview-flow";

// Database row type for interview_sessions
type InterviewSessionRow =
  Database["public"]["Tables"]["interview_sessions"]["Row"];

// ============================================================================
// TYPES
// ============================================================================

/**
 * Interview session type (stored in a separate table or as JSON in booking)
 */
export type InterviewSession = {
  id: string;
  bookingId: string;
  businessId: string;
  workerId: string;
  workerTier: Database["public"]["Enums"]["worker_tier"];
  status: "pending" | "in_progress" | "completed" | "skipped" | "failed";
  type: "none" | "chat" | "chat_and_voice";
  startedAt: string | null;
  completedAt: string | null;
  chatStartedAt: string | null;
  chatCompletedAt: string | null;
  voiceStartedAt: string | null;
  voiceCompletedAt: string | null;
  chatDuration: number | null;
  voiceDuration: number | null;
  totalDuration: number | null;
  messagesSent: number;
  voiceCallInitiated: boolean;
  timeToHire: number | null;
  createdAt: string;
};

/**
 * Transform database snake_case row to camelCase InterviewSession
 */
function transformInterviewSession(row: InterviewSessionRow): InterviewSession {
  return {
    id: row.id,
    bookingId: row.booking_id,
    businessId: row.business_id,
    workerId: row.worker_id,
    workerTier: row.worker_tier,
    status: row.status as InterviewSession["status"],
    type: row.type as InterviewSession["type"],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    chatStartedAt: row.chat_started_at,
    chatCompletedAt: row.chat_completed_at,
    voiceStartedAt: row.voice_started_at,
    voiceCompletedAt: row.voice_completed_at,
    chatDuration: row.chat_duration,
    voiceDuration: row.voice_duration,
    totalDuration: row.total_duration,
    messagesSent: row.messages_sent,
    voiceCallInitiated: row.voice_call_initiated,
    timeToHire: row.time_to_hire,
    createdAt: row.created_at,
  };
}

// ============================================================================
// INTERVIEW SESSION ACTIONS
// ============================================================================

/**
 * Create an interview session for a booking
 */
export async function createInterviewSession(
  bookingId: string,
  businessId: string,
  workerId: string,
  workerTier: Database["public"]["Enums"]["worker_tier"],
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    // Verify the booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    // Create interview session
    const session = createInterviewSessionUtil(
      bookingId,
      businessId,
      workerId,
      workerTier,
    );

    const { data, error } = await supabase
      .from("interview_sessions")
      .insert({
        booking_id: bookingId,
        business_id: businessId,
        worker_id: workerId,
        worker_tier: workerTier,
        status: session.status,
        type: session.type,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        chat_started_at: session.chatStartedAt,
        chat_completed_at: session.chatCompletedAt,
        voice_started_at: session.voiceStartedAt,
        voice_completed_at: session.voiceCompletedAt,
        chat_duration: session.chatDuration,
        voice_duration: session.voiceDuration,
        total_duration: session.totalDuration,
        messages_sent: session.messagesSent,
        voice_call_initiated: session.voiceCallInitiated,
        time_to_hire: session.timeToHire,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal membuat interview session: ${error.message}`,
      };
    }

    return { success: true, data: transformInterviewSession(data) };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat membuat interview session",
    };
  }
}

/**
 * Start an interview session
 */
export async function startInterviewSession(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    // Verify the interview session exists and belongs to the user
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" };
    }

    if (session.status !== "pending") {
      return {
        success: false,
        error: "Interview session sudah dimulai atau selesai",
      };
    }

    // Update session to in_progress
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", interviewSessionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal memulai interview: ${error.message}`,
      };
    }

    return { success: true, data: transformInterviewSession(data) };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat memulai interview",
    };
  }
}

/**
 * Start chat phase of interview
 */
export async function startChatInterview(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" };
    }

    if (session.chat_started_at) {
      return { success: false, error: "Chat interview sudah dimulai" };
    }

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        chat_started_at: new Date().toISOString(),
      })
      .eq("id", interviewSessionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: `Gagal memulai chat: ${error.message}` };
    }

    return { success: true, data: transformInterviewSession(data) };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memulai chat" };
  }
}

/**
 * Complete chat phase of interview
 */
export async function completeChatInterview(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" };
    }

    if (!session.chat_started_at) {
      return { success: false, error: "Chat interview belum dimulai" };
    }

    if (session.chat_completed_at) {
      return { success: false, error: "Chat interview sudah selesai" };
    }

    const chatStartedAt = new Date(session.chat_started_at).getTime();
    const chatCompletedAt = Date.now();
    const chatDuration = Math.floor((chatCompletedAt - chatStartedAt) / 1000);

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        chat_completed_at: new Date().toISOString(),
        chat_duration: chatDuration,
      })
      .eq("id", interviewSessionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal menyelesaikan chat: ${error.message}`,
      };
    }

    return { success: true, data: transformInterviewSession(data) };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat menyelesaikan chat",
    };
  }
}

/**
 * Start voice call phase of interview
 */
export async function startVoiceCallInterview(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" };
    }

    if (session.voice_started_at) {
      return { success: false, error: "Voice call sudah dimulai" };
    }

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        voice_started_at: new Date().toISOString(),
        voice_call_initiated: true,
      })
      .eq("id", interviewSessionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal memulai voice call: ${error.message}`,
      };
    }

    return { success: true, data: transformInterviewSession(data) };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat memulai voice call",
    };
  }
}

/**
 * Complete voice call phase of interview
 */
export async function completeVoiceCallInterview(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" };
    }

    if (!session.voice_started_at) {
      return { success: false, error: "Voice call belum dimulai" };
    }

    if (session.voice_completed_at) {
      return { success: false, error: "Voice call sudah selesai" };
    }

    const voiceStartedAt = new Date(session.voice_started_at).getTime();
    const voiceCompletedAt = Date.now();
    const voiceDuration = Math.floor(
      (voiceCompletedAt - voiceStartedAt) / 1000,
    );

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        voice_completed_at: new Date().toISOString(),
        voice_duration: voiceDuration,
      })
      .eq("id", interviewSessionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal menyelesaikan voice call: ${error.message}`,
      };
    }

    return { success: true, data: transformInterviewSession(data) };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat menyelesaikan voice call",
    };
  }
}

/**
 * Complete an interview session
 */
export async function completeInterviewSession(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" };
    }

    if (session.status === "completed" || session.status === "skipped") {
      return { success: false, error: "Interview session sudah selesai" };
    }

    // Calculate total duration
    let totalDuration = 0;
    if (session.started_at) {
      totalDuration = Math.floor(
        (Date.now() - new Date(session.started_at).getTime()) / 1000,
      );
    }

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_duration: totalDuration,
      })
      .eq("id", interviewSessionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal menyelesaikan interview: ${error.message}`,
      };
    }

    // Update booking status to accepted
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({ status: "accepted" })
      .eq("id", session.booking_id);

    if (bookingError) {
      console.error("Gagal mengupdate status booking:", bookingError);
    }

    return { success: true, data: transformInterviewSession(data) };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat menyelesaikan interview",
    };
  }
}

/**
 * Cancel an interview session
 */
export async function cancelInterviewSession(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" };
    }

    if (session.status === "completed" || session.status === "skipped") {
      return { success: false, error: "Interview session sudah selesai" };
    }

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", interviewSessionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal membatalkan interview: ${error.message}`,
      };
    }

    // Update booking status to rejected
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({ status: "rejected" })
      .eq("id", session.booking_id);

    if (bookingError) {
      console.error("Gagal mengupdate status booking:", bookingError);
    }

    return { success: true, data: transformInterviewSession(data) };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat membatalkan interview",
    };
  }
}

/**
 * Get interview session by booking ID
 */
export async function getInterviewSessionByBooking(
  bookingId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    // Transform snake_case into camelCase
    const session: InterviewSession = {
      id: data.id,
      bookingId: data.booking_id,
      businessId: data.business_id,
      workerId: data.worker_id,
      workerTier: data.worker_tier,
      status: data.status as InterviewSession["status"],
      type: data.type as InterviewSession["type"],
      startedAt: data.started_at,
      completedAt: data.completed_at,
      chatStartedAt: data.chat_started_at,
      chatCompletedAt: data.chat_completed_at,
      voiceStartedAt: data.voice_started_at,
      voiceCompletedAt: data.voice_completed_at,
      chatDuration: data.chat_duration,
      voiceDuration: data.voice_duration,
      totalDuration: data.total_duration,
      messagesSent: data.messages_sent,
      voiceCallInitiated: data.voice_call_initiated,
      timeToHire: data.time_to_hire
        ? parseFloat(String(data.time_to_hire))
        : null,
      createdAt: data.created_at,
    };

    return { success: true, data: session, error: null };
  } catch (error) {
    return {
      success: false,
      error: "Gagal mengambil interview session",
      data: null,
    };
  }
}

/**
 * Increment message count in interview session
 */
export async function incrementInterviewMessageCount(
  interviewSessionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await (supabase as any).rpc(
      "increment_interview_messages",
      {
        session_id: interviewSessionId,
      },
    );

    if (error) {
      // Fallback: fetch, increment, update
      const { data: session } = await supabase
        .from("interview_sessions")
        .select("messages_sent")
        .eq("id", interviewSessionId)
        .single();

      if (session) {
        await supabase
          .from("interview_sessions")
          .update({ messages_sent: (session.messages_sent || 0) + 1 })
          .eq("id", interviewSessionId);
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "Gagal mengupdate message count" };
  }
}

/**
 * Calculate time-to-hire for a booking
 */
export async function calculateBookingTimeToHire(
  bookingId: string,
): Promise<{ success: boolean; timeToHire?: number; error?: string }> {
  try {
    const supabase = await createClient();

    // Get booking with job
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        jobs (
          created_at
        )
      `,
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking || !booking.jobs) {
      return { success: false, error: "Booking atau job tidak ditemukan" };
    }

    if (!booking.updated_at) {
      return { success: false, error: "Booking belum diupdate" };
    }

    const jobPostedAt = new Date(booking.jobs.created_at).getTime();
    const bookingAcceptedAt = new Date(booking.updated_at).getTime();
    const timeToHireMinutes =
      Math.round(((bookingAcceptedAt - jobPostedAt) / (1000 * 60)) * 10) / 10;

    return { success: true, timeToHire: timeToHireMinutes };
  } catch (error) {
    return { success: false, error: "Gagal menghitung time-to-hire" };
  }
}
