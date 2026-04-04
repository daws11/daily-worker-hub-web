"use client";

/**
 * Incoming Job Card Component
 *
 * Full-screen overlay card showing a new job dispatch.
 * Features countdown timer, matching score, accept/reject buttons.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Clock,
  MapPin,
  Building2,
  Wallet,
  Calendar,
  Star,
  X,
  Check,
  Loader2,
} from "lucide-react";
import type { AvailableJob } from "@/app/api/workers/available-jobs/route";

interface IncomingJobCardProps {
  job: AvailableJob;
  onAccept: (dispatchId: string) => Promise<void>;
  onReject: (dispatchId: string) => Promise<void>;
  onExpired?: () => void;
}

const COUNTDOWN_SECONDS = 45;

function getScoreColor(score: number): string {
  if (score >= 0.9) return "text-green-600";
  if (score >= 0.75) return "text-emerald-600";
  if (score >= 0.6) return "text-blue-600";
  if (score >= 0.4) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBarColor(score: number): string {
  if (score >= 0.9) return "bg-green-500";
  if (score >= 0.75) return "bg-emerald-500";
  if (score >= 0.6) return "bg-blue-500";
  if (score >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 0.9) return "Perfect";
  if (score >= 0.75) return "Great";
  if (score >= 0.6) return "Good";
  if (score >= 0.4) return "Fair";
  return "Poor";
}

function formatBudget(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Play a notification sound using Web Audio API */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch {
    // Silent fail
  }
}

/** Trigger device vibration */
function vibrateDevice() {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }
}

export function IncomingJobCard({ job, onAccept, onReject, onExpired }: IncomingJobCardProps) {
  const [countdown, setCountdown] = useState(job.timeRemainingSeconds || COUNTDOWN_SECONDS);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const hasAutoRejected = useRef(false);

  const scorePercent = Math.round(job.matchingScore * 100);
  const scoreLabel = getScoreLabel(job.matchingScore);
  const breakdown = job.scoreBreakdown || { skill: 0, distance: 0, rating: 0, tier: 0 };

  // Play sound and vibrate on mount
  useEffect(() => {
    playNotificationSound();
    vibrateDevice();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0 && !hasAutoRejected.current) {
      hasAutoRejected.current = true;
      onExpired?.();
      // Auto-reject
      handleReject();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async () => {
    if (accepting || rejecting) return;
    setAccepting(true);
    try {
      await onAccept(job.dispatchId);
    } catch {
      toast.error("Failed to accept job");
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (accepting || rejecting) return;
    setRejecting(true);
    try {
      await onReject(job.dispatchId);
    } catch {
      toast.error("Failed to reject job");
      setRejecting(false);
    }
  };

  const countdownPercent = (countdown / COUNTDOWN_SECONDS) * 100;
  const isUrgent = countdown <= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header with countdown */}
        <div className={`p-4 rounded-t-2xl text-center ${isUrgent ? "bg-red-500" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}>
          <h2 className="text-white text-xl font-bold flex items-center justify-center gap-2">
            🔔 NEW JOB!
          </h2>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-white/80" />
            <span className={`text-3xl font-mono font-bold ${isUrgent ? "animate-pulse" : ""} text-white`}>
              {countdown}s
            </span>
          </div>
          {/* Countdown bar */}
          <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-red-300" : "bg-white/80"}`}
              style={{ width: `${countdownPercent}%` }}
            />
          </div>
        </div>

        {/* Job Info */}
        <div className="p-5 space-y-4">
          {/* Title & Business */}
          <div>
            <h3 className="text-lg font-bold">{job.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>{job.businessName}</span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            {/* Budget */}
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {formatBudget(job.budgetMin)}
                {job.budgetMax > job.budgetMin && ` - ${formatBudget(job.budgetMax)}`}
              </span>
            </div>

            {/* Distance */}
            {job.distanceKm !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{job.distanceKm} km away</span>
              </div>
            )}

            {/* Address */}
            {job.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{job.address}</span>
              </div>
            )}
          </div>

          {/* Matching Score */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Matching Score</span>
              <div className="flex items-center gap-1">
                <Star className={`w-4 h-4 ${getScoreColor(job.matchingScore)}`} />
                <span className={`font-bold ${getScoreColor(job.matchingScore)}`}>
                  {scorePercent}% — {scoreLabel}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(job.matchingScore)}`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            {/* Score breakdown */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Skill</div>
                <div className="text-sm font-semibold">{Math.round(breakdown.skill * 100)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Distance</div>
                <div className="text-sm font-semibold">{Math.round(breakdown.distance * 100)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Rating</div>
                <div className="text-sm font-semibold">{Math.round(breakdown.rating * 100)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Tier</div>
                <div className="text-sm font-semibold">{Math.round(breakdown.tier * 100)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 flex gap-3">
          <button
            onClick={handleReject}
            disabled={accepting || rejecting || countdown <= 0}
            className="flex-1 py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-lg
              transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {rejecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <X className="w-5 h-5" />
                REJECT
              </>
            )}
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting || rejecting || countdown <= 0}
            className="flex-1 py-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg
              transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {accepting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                ACCEPT
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
