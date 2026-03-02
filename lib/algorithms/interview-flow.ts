/**
 * Interview Flow Logic
 *
 * Implements tier-based interview process:
 * - Elite/Champion: No interview needed, instant dispatch (time-to-hire: <5 min)
 * - Pro: In-app chat interview (5-10 min) + optional voice call (3-5 min)
 * - Classic: In-app chat + voice call (10-15 min total)
 */

import { WorkerTier } from '@/lib/supabase/types';

/**
 * Interview status tracking
 */
export type InterviewStatus =
  | 'pending'      // Interview not started yet
  | 'in_progress'  // Interview currently ongoing
  | 'completed'    // Interview completed successfully
  | 'skipped'      // Interview skipped (Elite/Champion)
  | 'failed'       // Interview failed/declined

/**
 * Interview type based on worker tier
 */
export type InterviewType =
  | 'none'          // No interview needed (Elite/Champion)
  | 'chat'          // Chat only (Pro)
  | 'chat_and_voice'; // Chat + voice (Classic)

/**
 * Interview configuration for each tier
 */
export interface InterviewConfig {
  type: InterviewType;
  required: boolean;
  chatRequired: boolean;
  voiceRequired: boolean;
  minChatDuration: number;  // Minimum chat duration in seconds
  maxChatDuration: number;  // Maximum chat duration in seconds
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
  chatDuration: number | null;  // in seconds
  voiceDuration: number | null; // in seconds
  totalDuration: number | null;  // in seconds
  messagesSent: number;
  voiceCallInitiated: boolean;
  timeToHire: number | null;    // From job posting to booking acceptance, in minutes
  createdAt: string;
}

/**
 * Get interview configuration for a worker tier
 *
 * @param tier - Worker tier
 * @returns Interview configuration
 */
export function getInterviewConfig(tier: WorkerTier): InterviewConfig {
  switch (tier) {
    case 'champion':
    case 'elite':
      return {
        type: 'none',
        required: false,
        chatRequired: false,
        voiceRequired: false,
        minChatDuration: 0,
        maxChatDuration: 0,
        minVoiceDuration: 0,
        maxVoiceDuration: 0,
        estimatedTimeToHire: 5,
        description: 'Instant dispatch - no interview needed',
      };

    case 'pro':
      return {
        type: 'chat',
        required: true,
        chatRequired: true,
        voiceRequired: false,
        minChatDuration: 300,    // 5 minutes minimum
        maxChatDuration: 600,    // 10 minutes maximum
        minVoiceDuration: 0,
        maxVoiceDuration: 300,   // 5 minutes optional
        estimatedTimeToHire: 20, // Chat + optional voice
        description: 'In-app chat interview (5-10 min), voice call optional',
      };

    case 'classic':
      return {
        type: 'chat_and_voice',
        required: true,
        chatRequired: true,
        voiceRequired: true,
        minChatDuration: 300,    // 5 minutes minimum
        maxChatDuration: 600,    // 10 minutes maximum
        minVoiceDuration: 180,   // 3 minutes minimum
        maxVoiceDuration: 300,   // 5 minutes maximum
        estimatedTimeToHire: 25, // Chat + voice
        description: 'In-app chat + voice call (10-15 min total)',
      };
  }
}

/**
 * Check if interview is required for a worker tier
 *
 * @param tier - Worker tier
 * @returns True if interview is required
 */
export function isInterviewRequired(tier: WorkerTier): boolean {
  return getInterviewConfig(tier).required;
}

/**
 * Check if voice call is required for a worker tier
 *
 * @param tier - Worker tier
 * @returns True if voice call is required
 */
export function isVoiceCallRequired(tier: WorkerTier): boolean {
  return getInterviewConfig(tier).voiceRequired;
}

/**
 * Check if voice call is optional for a worker tier
 *
 * @param tier - Worker tier
 * @returns True if voice call is optional
 */
export function isVoiceCallOptional(tier: WorkerTier): boolean {
  const config = getInterviewConfig(tier);
  return !config.voiceRequired && config.maxVoiceDuration > 0;
}

/**
 * Check if worker qualifies for instant dispatch
 *
 * @param tier - Worker tier
 * @returns True if worker qualifies for instant dispatch
 */
export function canInstantDispatch(tier: WorkerTier): boolean {
  return !isInterviewRequired(tier);
}

/**
 * Get the next step in the interview process
 *
 * @param session - Current interview session
 * @returns Next step description or null if interview is complete
 */
export function getNextInterviewStep(session: InterviewSession): string | null {
  const config = getInterviewConfig(session.workerTier);

  if (!config.required) {
    return null; // No interview needed
  }

  if (session.status === 'pending') {
    if (config.chatRequired) {
      return 'Start chat interview';
    }
    if (config.voiceRequired) {
      return 'Start voice call';
    }
  }

  if (session.status === 'in_progress') {
    if (config.chatRequired && !session.chatCompletedAt) {
      return 'Continue chat interview';
    }
    if (config.voiceRequired && !session.voiceCompletedAt) {
      return if (config.chatRequired && session.chatCompletedAt) {
        return 'Start voice call';
      }
      return 'Start voice call';
    }
  }

  return null; // Interview complete
}

/**
 * Check if interview session is complete
 *
 * @param session - Interview session
 * @returns True if interview is complete
 */
export function isInterviewComplete(session: InterviewSession): boolean {
  const config = getInterviewConfig(session.workerTier);

  // No interview needed
  if (!config.required) {
    return session.status === 'skipped' || session.status === 'completed';
  }

  // Interview completed
  if (session.status === 'completed') {
    return true;
  }

  // Check if required steps are done
  if (config.chatRequired && !session.chatCompletedAt) {
    return false;
  }

  if (config.voiceRequired && !session.voiceCompletedAt) {
    return false;
  }

  return false;
}

/**
 * Calculate interview duration in minutes
 *
 * @param session - Interview session
 * @returns Duration in minutes (rounded to 1 decimal place)
 */
export function getInterviewDurationMinutes(session: InterviewSession): number {
  if (!session.completedAt || !session.startedAt) {
    return 0;
  }

  const started = new Date(session.startedAt).getTime();
  const completed = new Date(session.completedAt).getTime();
  const durationMs = completed - started;
  const durationSec = durationMs / 1000;

  return Math.round((durationSec / 60) * 10) / 10;
}

/**
 * Calculate chat duration in minutes
 *
 * @param session - Interview session
 * @returns Chat duration in minutes (rounded to 1 decimal place)
 */
export function getChatDurationMinutes(session: InterviewSession): number {
  if (!session.chatCompletedAt || !session.chatStartedAt) {
    return 0;
  }

  const started = new Date(session.chatStartedAt).getTime();
  const completed = new Date(session.chatCompletedAt).getTime();
  const durationMs = completed - started;
  const durationSec = durationMs / 1000;

  return Math.round((durationSec / 60) * 10) / 10;
}

/**
 * Calculate voice call duration in minutes
 *
 * @param session - Interview session
 * @returns Voice duration in minutes (rounded to 1 decimal place)
 */
export function getVoiceDurationMinutes(session: InterviewSession): number {
  if (!session.voiceCompletedAt || !session.voiceStartedAt) {
    return 0;
  }

  const started = new Date(session.voiceStartedAt).getTime();
  const completed = new Date(session.voiceCompletedAt).getTime();
  const durationMs = completed - started;
  const durationSec = durationMs / 1000;

  return Math.round((durationSec / 60) * 10) / 10;
}

/**
 * Check if chat meets minimum duration requirement
 *
 * @param session - Interview session
 * @returns True if chat meets minimum duration
 */
export function meetsChatDurationRequirement(session: InterviewSession): boolean {
  const config = getInterviewConfig(session.workerTier);

  if (!config.chatRequired) {
    return true; // No chat required
  }

  if (!session.chatCompletedAt || !session.chatStartedAt) {
    return false; // Chat not completed
  }

  const started = new Date(session.chatStartedAt).getTime();
  const completed = new Date(session.chatCompletedAt).getTime();
  const durationSec = (completed - started) / 1000;

  return durationSec >= config.minChatDuration;
}

/**
 * Check if voice call meets minimum duration requirement
 *
 * @param session - Interview session
 * @returns True if voice call meets minimum duration
 */
export function meetsVoiceDurationRequirement(session: InterviewSession): boolean {
  const config = getInterviewConfig(session.workerTier);

  if (!config.voiceRequired) {
    return true; // No voice required
  }

  if (!config.voiceCompletedAt || !config.voiceStartedAt) {
    return false; // Voice not completed
  }

  const started = new Date(session.voiceStartedAt).getTime();
  const completed = new Date(session.voiceCompletedAt).getTime();
  const durationSec = (completed - started) / 1000;

  return durationSec >= config.minVoiceDuration;
}

/**
 * Check if interview is valid (meets all requirements)
 *
 * @param session - Interview session
 * @returns True if interview is valid
 */
export function isInterviewValid(session: InterviewSession): boolean {
  const config = getInterviewConfig(session.workerTier);

  // No interview needed
  if (!config.required) {
    return session.status === 'skipped' || session.status === 'completed';
  }

  // Check chat requirement
  if (config.chatRequired && !meetsChatDurationRequirement(session)) {
    return false;
  }

  // Check voice requirement
  if (config.voiceRequired && !meetsVoiceDurationRequirement(session)) {
    return false;
  }

  return session.status === 'completed';
}

/**
 * Get interview progress percentage
 *
 * @param session - Interview session
 * @returns Progress percentage (0-100)
 */
export function getInterviewProgress(session: InterviewSession): number {
  const config = getInterviewConfig(session.workerTier);

  // No interview needed
  if (!config.required) {
    return 100;
  }

  let progress = 0;
  let totalSteps = 0;

  if (config.chatRequired) {
    totalSteps++;
    if (session.chatCompletedAt) {
      progress++;
    }
  }

  if (config.voiceRequired) {
    totalSteps++;
    if (session.voiceCompletedAt) {
      progress++;
    }
  }

  if (totalSteps === 0) {
    return 100;
  }

  return Math.round((progress / totalSteps) * 100);
}

/**
 * Get interview status label
 *
 * @param status - Interview status
 * @returns Human-readable status label
 */
export function getInterviewStatusLabel(status: InterviewStatus): string {
  const labels: Record<InterviewStatus, string> = {
    pending: 'Menunggu',
    in_progress: 'Sedang Berlangsung',
    completed: 'Selesai',
    skipped: 'Dilewati',
    failed: 'Gagal',
  };
  return labels[status];
}

/**
 * Get interview type label
 *
 * @param type - Interview type
 * @returns Human-readable type label
 */
export function getInterviewTypeLabel(type: InterviewType): string {
  const labels: Record<InterviewType, string> => {
    none: 'Tidak Perlu',
    chat: 'Chat',
    chat_and_voice: 'Chat & Panggilan',
  };
  return labels[type];
}

/**
 * Create initial interview session
 *
 * @param bookingId - Booking ID
 * @param businessId - Business ID
 * @param workerId - Worker ID
 * @param workerTier - Worker tier
 * @returns Initial interview session
 */
export function createInterviewSession(
  bookingId: string,
  businessId: string,
  workerId: string,
  workerTier: WorkerTier
): Omit<InterviewSession, 'id' | 'createdAt'> {
  const config = getInterviewConfig(workerTier);

  // No interview needed - skip immediately
  if (!config.required) {
    return {
      bookingId,
      businessId,
      workerId,
      workerTier,
      status: 'skipped',
      type: 'none',
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

  // Interview required
  return {
    bookingId,
    businessId,
    workerId,
    workerTier,
    status: 'pending',
    type: config.type,
    startedAt: null,
    completedAt: null,
    chatStartedAt: null,
    chatCompletedAt: null,
    voiceStartedAt: null,
    voiceCompletedAt: null,
    chatDuration: null,
    voiceDuration: null,
    totalDuration: null,
    messagesSent: 0,
    voiceCallInitiated: false,
    timeToHire: null,
  };
}

/**
 * Calculate time-to-hire from job posting to booking acceptance
 *
 * @param jobPostedAt - Job posting timestamp
 * @param bookingAcceptedAt - Booking acceptance timestamp
 * @returns Time-to-hire in minutes
 */
export function calculateTimeToHire(
  jobPostedAt: string,
  bookingAcceptedAt: string
): number {
  const posted = new Date(jobPostedAt).getTime();
  const accepted = new Date(bookingAcceptedAt).getTime();
  const durationMs = accepted - posted;

  return Math.round((durationMs / (1000 * 60)) * 10) / 10;
}

/**
 * Format duration for display
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "5 min 30 sec")
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds} detik`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} menit`;
  }

  return `${minutes} menit ${remainingSeconds} detik`;
}

/**
 * Format duration in minutes for display
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDurationMinutes(minutes: number): string {
  const rounded = Math.round(minutes * 10) / 10;

  if (rounded < 1) {
    return '<1 menit';
  }

  if (Number.isInteger(rounded)) {
    return `${rounded} menit`;
  }

  return `${rounded} menit`;
}
