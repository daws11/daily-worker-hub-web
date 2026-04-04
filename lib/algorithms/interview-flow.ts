/**
 * Interview Flow Logic - DEPRECATED
 *
 * This module is kept for backwards compatibility only.
 * The interview system has been simplified - all workers now apply directly
 * and businesses accept/reject based on profile review.
 *
 * - Elite/Champion: Instant dispatch (no interview)
 * - Pro: Direct apply, immediate accept possible
 * - Classic: Must have complete profile (photo, bio, skills)
 *
 * @deprecated Use tier-classifier.ts for tier logic instead
 */

import { WorkerTier } from "@/lib/supabase/types";

// ============================================================================
// TYPES - Kept for backwards compatibility
// ============================================================================

/**
 * @deprecated - Interview status no longer used
 */
export type InterviewStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped"
  | "failed";

/**
 * @deprecated - Interview type no longer used
 */
export type InterviewType =
  | "none"
  | "chat"
  | "chat_and_voice";

/**
 * @deprecated - Interview config no longer used
 */
export interface InterviewConfig {
  type: InterviewType;
  required: boolean;
  chatRequired: boolean;
  voiceRequired: boolean;
  minChatDuration: number;
  maxChatDuration: number;
  minVoiceDuration: number;
  maxVoiceDuration: number;
  estimatedTimeToHire: number;
  description: string;
}

/**
 * @deprecated - Interview session no longer created
 */
export interface InterviewSession {
  id: string;
  bookingId: string;
  businessId: string;
  workerId: string;
  workerTier: WorkerTier;
  status: InterviewStatus;
  type: InterviewType;
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
}

// ============================================================================
// DEPRECATED FUNCTIONS - All return no-op values
// ============================================================================

/**
 * @deprecated No longer used - interviews are removed
 */
export function getInterviewConfig(tier: WorkerTier): InterviewConfig {
  return {
    type: "none",
    required: false,
    chatRequired: false,
    voiceRequired: false,
    minChatDuration: 0,
    maxChatDuration: 0,
    minVoiceDuration: 0,
    maxVoiceDuration: 0,
    estimatedTimeToHire: 5,
    description: "No interview needed",
  };
}

/**
 * @deprecated No longer used
 */
export function isInterviewRequired(tier: WorkerTier): boolean {
  return false;
}

/**
 * @deprecated No longer used
 */
export function isVoiceCallRequired(tier: WorkerTier): boolean {
  return false;
}

/**
 * @deprecated No longer used
 */
export function isVoiceCallOptional(tier: WorkerTier): boolean {
  return false;
}

/**
 * @deprecated Use tier-classifier.ts instead
 */
export function canInstantDispatch(tier: WorkerTier): boolean {
  return tier === "elite" || tier === "champion";
}

/**
 * @deprecated No longer used
 */
export function getNextInterviewStep(session: InterviewSession): string | null {
  return null;
}

/**
 * @deprecated No longer used
 */
export function isInterviewComplete(session: InterviewSession): boolean {
  return true;
}

/**
 * @deprecated No longer used
 */
export function getInterviewDurationMinutes(session: InterviewSession): number {
  return 0;
}

/**
 * @deprecated No longer used
 */
export function getChatDurationMinutes(session: InterviewSession): number {
  return 0;
}

/**
 * @deprecated No longer used
 */
export function getVoiceDurationMinutes(session: InterviewSession): number {
  return 0;
}

/**
 * @deprecated No longer used
 */
export function meetsChatDurationRequirement(
  session: InterviewSession,
): boolean {
  return true;
}

/**
 * @deprecated No longer used
 */
export function meetsVoiceDurationRequirement(
  session: InterviewSession,
): boolean {
  return true;
}

/**
 * @deprecated No longer used
 */
export function isInterviewValid(session: InterviewSession): boolean {
  return true;
}

/**
 * @deprecated No longer used
 */
export function getInterviewProgress(session: InterviewSession): number {
  return 100;
}

/**
 * @deprecated No longer used
 */
export function getInterviewStatusLabel(status: InterviewStatus): string {
  return "N/A";
}

/**
 * @deprecated No longer used
 */
export function getInterviewTypeLabel(type: InterviewType): string {
  return "none";
}

/**
 * @deprecated No longer used - interview sessions not created anymore
 */
export function createInterviewSession(
  bookingId: string,
  businessId: string,
  workerId: string,
  workerTier: WorkerTier,
): Omit<InterviewSession, "id" | "createdAt"> {
  return {
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
  };
}

/**
 * @deprecated No longer used
 */
export function calculateTimeToHire(
  jobPostedAt: string,
  bookingAcceptedAt: string,
): number {
  const posted = new Date(jobPostedAt).getTime();
  const accepted = new Date(bookingAcceptedAt).getTime();
  return Math.round(((accepted - posted) / (1000 * 60)) * 10) / 10;
}

/**
 * @deprecated No longer used
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) return `${remainingSeconds} detik`;
  if (remainingSeconds === 0) return `${minutes} menit`;
  return `${minutes} menit ${remainingSeconds} detik`;
}

/**
 * @deprecated No longer used
 */
export function formatDurationMinutes(minutes: number): string {
  const rounded = Math.round(minutes * 10) / 10;
  if (rounded < 1) return "<1 menit";
  if (Number.isInteger(rounded)) return `${rounded} menit`;
  return `${rounded} menit`;
}
