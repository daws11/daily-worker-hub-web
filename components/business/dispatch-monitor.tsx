"use client";

/**
 * Dispatch Monitor Component
 *
 * Shows real-time dispatch status for a job (Business view).
 * Displays current worker, stats, history, and cancel option.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Clock,
  MapPin,
  Star,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  X,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DispatchHistoryItem {
  dispatchId: string;
  workerId: string;
  workerName: string;
  status: string;
  matchingScore: number;
  dispatchedAt: string;
  respondedAt: string | null;
  responseTimeSeconds: number | null;
}

interface DispatchStatusData {
  jobId: string;
  dispatchStatus: string;
  totalDispatched: number;
  totalRejected: number;
  currentWorker: {
    dispatchId: string;
    workerId: string;
    workerName: string;
    matchingScore: number;
  } | null;
  history: DispatchHistoryItem[];
}

interface DispatchMonitorProps {
  jobId: string;
  jobTitle: string;
  onCancel?: () => void;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "accepted": return "text-green-600 bg-green-50 dark:bg-green-950";
    case "rejected": return "text-red-600 bg-red-50 dark:bg-red-950";
    case "timed_out": return "text-orange-600 bg-orange-50 dark:bg-orange-950";
    case "pending": return "text-blue-600 bg-blue-50 dark:bg-blue-950";
    case "cancelled": return "text-gray-600 bg-gray-50 dark:bg-gray-950";
    default: return "text-gray-600 bg-gray-50 dark:bg-gray-950";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "accepted": return "Accepted";
    case "rejected": return "Rejected";
    case "timed_out": return "Timed Out";
    case "pending": return "Waiting...";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DispatchMonitor({ jobId, jobTitle, onCancel }: DispatchMonitorProps) {
  const [data, setData] = useState<DispatchStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/dispatch-status`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Countdown for current dispatch
  useEffect(() => {
    if (data?.currentWorker && data.dispatchStatus === "waiting") {
      // We don't have exact expires_at here, estimate 45s from dispatch
      setCountdown(45);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [data?.currentWorker, data?.dispatchStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      onCancel?.();
      toast.success("Dispatch cancelled");
    } catch {
      toast.error("Failed to cancel dispatch");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Failed to load dispatch status
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg truncate">{jobTitle}</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-1 text-sm text-white/80">
          Status: {data.dispatchStatus === "none" ? "Not dispatched" : data.dispatchStatus === "waiting" ? "🔄 Waiting for response" : data.dispatchStatus === "accepted" ? "✅ Worker assigned" : "❌ All rejected"}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 p-4 border-b">
        <div className="text-center p-2">
          <div className="text-2xl font-bold text-blue-600">{data.totalDispatched}</div>
          <div className="text-xs text-muted-foreground">Dispatched</div>
        </div>
        <div className="text-center p-2">
          <div className="text-2xl font-bold text-red-600">{data.totalRejected}</div>
          <div className="text-xs text-muted-foreground">Rejected</div>
        </div>
        <div className="text-center p-2">
          <div className="text-2xl font-bold text-green-600">
            {data.dispatchStatus === "accepted" ? 1 : 0}
          </div>
          <div className="text-xs text-muted-foreground">Accepted</div>
        </div>
      </div>

      {/* Current Worker */}
      {data.currentWorker && (
        <div className="p-4 border-b bg-blue-50 dark:bg-blue-950">
          <div className="text-xs font-medium text-blue-600 mb-2">CURRENTLY WAITING</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{data.currentWorker.workerName}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="w-3.5 h-3.5" />
                <span>{Math.round(data.currentWorker.matchingScore * 100)}% match</span>
              </div>
            </div>
            {countdown !== null && (
              <div className={`text-2xl font-mono font-bold ${countdown <= 10 ? "text-red-500 animate-pulse" : "text-blue-600"}`}>
                {countdown}s
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {data.history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 flex items-center justify-between text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span>Dispatch History ({data.history.length})</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="border-t divide-y max-h-48 overflow-y-auto">
              {data.history.map((item) => (
                <div key={item.dispatchId} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.workerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(item.dispatchedAt)}
                      {item.responseTimeSeconds && ` · ${item.responseTimeSeconds}s`}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel Button */}
      {(data.dispatchStatus === "waiting" || data.dispatchStatus === "all_rejected") && (
        <div className="p-4 border-t">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-2.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 font-medium text-sm
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <X className="w-4 h-4" />
                Cancel Dispatch
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
