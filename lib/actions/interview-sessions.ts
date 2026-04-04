"use server";

/**
 * Interview Sessions - DEPRECATED
 *
 * This module is kept for backwards compatibility only.
 * The interview system has been removed. All functions now return no-op results.
 *
 * Job application flow is now:
 * - Worker applies for job
 * - Business reviews worker profile
 * - Business accepts/rejects application
 * - If accepted, booking is created directly (no interview)
 *
 * @deprecated No longer used
 */

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";

type InterviewSessionRow =
  Database["public"]["Tables"]["interview_sessions"]["Row"];

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
// DEPRECATED FUNCTIONS - All return no-op results
// ============================================================================

/**
 * @deprecated No longer used - interviews are removed
 */
export async function createInterviewSession(
  bookingId: string,
  businessId: string,
  workerId: string,
  workerTier: Database["public"]["Enums"]["worker_tier"],
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  // Interview system removed - return success with no session
  return {
    success: true,
    data: {
      id: `deprecated-${bookingId}`,
      bookingId,
      businessId,
      workerId,
      workerTier,
      status: "skipped",
      type: "none",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      chatStartedAt: null,
      chatCompletedAt: null,
      voiceStartedAt: null,
      voiceCompletedAt: null,
      chatDuration: null,
      voiceDuration: null,
      totalDuration: 0,
      messagesSent: 0,
      voiceCallInitiated: false,
      timeToHire: null,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * @deprecated No longer used
 */
export async function startInterviewSession(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  return { success: false, error: "Interview system removed" };
}

/**
 * @deprecated No longer used
 */
export async function startChatInterview(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  return { success: false, error: "Interview system removed" };
}

/**
 * @deprecated No longer used
 */
export async function completeChatInterview(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  return { success: false, error: "Interview system removed" };
}

/**
 * @deprecated No longer used
 */
export async function startVoiceCallInterview(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  return { success: false, error: "Interview system removed" };
}

/**
 * @deprecated No longer used
 */
export async function completeVoiceCallInterview(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  return { success: false, error: "Interview system removed" };
}

/**
 * @deprecated No longer used
 */
export async function completeInterviewSession(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  return { success: false, error: "Interview system removed" };
}

/**
 * @deprecated No longer used
 */
export async function cancelInterviewSession(
  interviewSessionId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  return { success: false, error: "Interview system removed" };
}

/**
 * @deprecated No longer used
 */
export async function getInterviewSessionByBooking(
  bookingId: string,
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  return { success: false, error: "Interview system removed", data: undefined };
}

/**
 * @deprecated No longer used
 */
export async function incrementInterviewMessageCount(
  interviewSessionId: string,
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

/**
 * @deprecated No longer used
 */
export async function calculateBookingTimeToHire(
  bookingId: string,
): Promise<{ success: boolean; timeToHire?: number; error?: string }> {
  return { success: false, error: "Interview system removed" };
}
