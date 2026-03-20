/**
 * Interview Types
 *
 * Type definitions for the interview flow system
 */

import type { WorkerTier } from "@/lib/supabase/types";

/**
 * Interview status tracking
 */
export type InterviewStatus =
  | "pending" // Interview not started yet
  | "in_progress" // Interview currently ongoing
  | "completed" // Interview completed successfully
  | "skipped" // Interview skipped (Elite/Champion)
  | "failed"; // Interview failed/declined

/**
 * Interview type based on worker tier
 */
export type InterviewType =
  | "none" // No interview needed (Elite/Champion)
  | "chat" // Chat only (Pro)
  | "chat_and_voice"; // Chat + voice (Classic)

/**
 * Voice call state
 */
export type VoiceCallState =
  | "idle" // Not in a call
  | "calling" // Initiating call
  | "incoming" // Receiving call
  | "connected" // Call in progress
  | "ended"; // Call finished

/**
 * Interview configuration for each tier
 */
export interface InterviewConfig {
  type: InterviewType;
  required: boolean;
  chatRequired: boolean;
  voiceRequired: boolean;
  minChatDuration: number; // Minimum chat duration in seconds
  maxChatDuration: number; // Maximum chat duration in seconds
  minVoiceDuration: number; // Minimum voice duration in seconds
  maxVoiceDuration: number; // Maximum voice duration in seconds
  estimatedTimeToHire: number; // Estimated time to hire in minutes
  description: string;
}

/**
 * Interview session data
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
  chatDuration: number | null; // in seconds
  voiceDuration: number | null; // in seconds
  totalDuration: number | null; // in seconds
  messagesSent: number;
  voiceCallInitiated: boolean;
  timeToHire: number | null; // From job posting to booking acceptance, in minutes
  createdAt: string;
}

/**
 * Interview session with additional metadata
 */
export interface InterviewSessionWithMetadata extends InterviewSession {
  businessName?: string;
  workerName?: string;
  jobTitle?: string;
  workerAvatar?: string | null;
  businessAvatar?: string | null;
}

/**
 * Interview metrics for analytics
 */
export interface InterviewMetrics {
  totalInterviews: number;
  completedInterviews: number;
  skippedInterviews: number;
  failedInterviews: number;
  avgChatDuration: number; // in seconds
  avgVoiceDuration: number; // in seconds
  avgTotalDuration: number; // in seconds
  avgTimeToHire: number; // in minutes
  byTier: Record<
    WorkerTier,
    {
      count: number;
      avgDuration: number;
      avgTimeToHire: number;
    }
  >;
}

/**
 * Interview progress tracking
 */
export interface InterviewProgress {
  status: InterviewStatus;
  chatProgress: number; // 0-100
  voiceProgress: number; // 0-100
  overallProgress: number; // 0-100
  nextStep: string | null;
  isComplete: boolean;
}

/**
 * Voice call configuration
 */
export interface VoiceCallConfig {
  enabled: boolean;
  required: boolean;
  optional: boolean;
  minDuration: number; // seconds
  maxDuration: number; // seconds
}
