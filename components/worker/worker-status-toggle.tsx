"use client";

/**
 * Worker Status Toggle Component
 *
 * Allows workers to go online/offline with GPS tracking.
 * Handles heartbeat, location updates, and auto-offline detection.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  MapPin,
  Wifi,
  WifiOff,
  Clock,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface WorkerStats {
  totalJobsReceived: number;
  totalAccepted: number;
  totalRejected: number;
}

interface OnlineInfo {
  isOnline: boolean;
  onlineSince: string | null;
  autoOfflineAt: string | null;
  stats: WorkerStats;
}

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds
const AUTO_OFFLINE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function WorkerStatusToggle() {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onlineSince, setOnlineSince] = useState<string | null>(null);
  const [autoOfflineAt, setAutoOfflineAt] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkerStats>({
    totalJobsReceived: 0,
    totalAccepted: 0,
    totalRejected: 0,
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [timeOnline, setTimeOnline] = useState<string>("");

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeOnlineRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoOfflineRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Format time online
  const formatTimeOnline = useCallback((since: string) => {
    const diff = Date.now() - new Date(since).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, []);

  // Update time online display every second
  useEffect(() => {
    if (onlineSince) {
      const update = () => setTimeOnline(formatTimeOnline(onlineSince));
      update();
      timeOnlineRef.current = setInterval(update, 1000);
      return () => {
        if (timeOnlineRef.current) clearInterval(timeOnlineRef.current);
      };
    } else {
      setTimeOnline("");
    }
  }, [onlineSince, formatTimeOnline]);

  // Get current GPS position
  const getCurrentPosition = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    });
  }, []);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch("/api/workers/heartbeat", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 400) {
          // Worker went offline (e.g., auto-offline)
          setIsOnline(false);
          setOnlineSince(null);
          setAutoOfflineAt(null);
          cleanupIntervals();
          toast.info("You were set offline due to inactivity");
        }
      }
    } catch {
      // Silent fail for heartbeat
    }
  }, []);

  // Update location
  const updateLocation = useCallback(async () => {
    try {
      const pos = await getCurrentPosition();
      setLocation(pos);
      setLocationError(null);

      await fetch("/api/workers/update-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng }),
      });
    } catch (err: any) {
      setLocationError(err.message || "Failed to get location");
    }
  }, [getCurrentPosition]);

  // Cleanup intervals
  const cleanupIntervals = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (locationRef.current) { clearInterval(locationRef.current); locationRef.current = null; }
    if (autoOfflineRef.current) { clearTimeout(autoOfflineRef.current); autoOfflineRef.current = null; }
  }, []);

  // Start tracking when online
  const startTracking = useCallback(() => {
    // Heartbeat every 60s
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Location update every 60s
    locationRef.current = setInterval(updateLocation, HEARTBEAT_INTERVAL);

    // Auto-offline timer
    autoOfflineRef.current = setTimeout(() => {
      handleToggleOffline();
      toast.info("You were set offline due to inactivity");
    }, AUTO_OFFLINE_TIMEOUT);
  }, [sendHeartbeat, updateLocation]);

  // Handle visibility change (app minimize)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isOnline) {
        // Start 5-minute auto-offline countdown
        if (autoOfflineRef.current) clearTimeout(autoOfflineRef.current);
        autoOfflineRef.current = setTimeout(() => {
          handleToggleOffline();
          toast.info("You were set offline because the app was minimized");
        }, AUTO_OFFLINE_TIMEOUT);
      } else if (!document.hidden && isOnline) {
        // App came back, reset auto-offline
        if (autoOfflineRef.current) clearTimeout(autoOfflineRef.current);
        sendHeartbeat();
        updateLocation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isOnline, sendHeartbeat, updateLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupIntervals();
  }, [cleanupIntervals]);

  // Toggle online
  const handleToggleOnline = async () => {
    setLoading(true);
    try {
      const pos = await getCurrentPosition();
      setLocation(pos);
      setLocationError(null);

      const res = await fetch("/api/workers/toggle-online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to go online");
      }

      const data = await res.json();
      setIsOnline(true);
      setOnlineSince(data.onlineSince);
      setAutoOfflineAt(data.autoOfflineAt);
      setStats({ totalJobsReceived: 0, totalAccepted: 0, totalRejected: 0 });
      startTracking();
      toast.success("You're now online! Waiting for job dispatches...");
    } catch (err: any) {
      toast.error(err.message || "Failed to go online");
      setLocationError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle offline
  const handleToggleOffline = async () => {
    setLoading(true);
    cleanupIntervals();
    try {
      const res = await fetch("/api/workers/toggle-offline", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || { totalJobsReceived: 0, totalAccepted: 0, totalRejected: 0 });
      }
    } catch {
      // Even if API fails, go offline locally
    }
    setIsOnline(false);
    setOnlineSince(null);
    setAutoOfflineAt(null);
    setLoading(false);
    toast.info("You're now offline");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Toggle Button */}
      <button
        onClick={isOnline ? handleToggleOffline : handleToggleOnline}
        disabled={loading}
        className={`
          w-full py-6 rounded-2xl text-white font-bold text-xl
          transition-all duration-300 transform active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg hover:shadow-xl
          ${isOnline
            ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            : "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          }
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            {isOnline ? "Going Offline..." : "Going Online..."}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-3">
            {isOnline ? (
              <>
                <WifiOff className="w-6 h-6" />
                GO OFFLINE
              </>
            ) : (
              <>
                <Wifi className="w-6 h-6" />
                GO ONLINE
              </>
            )}
          </span>
        )}
      </button>

      {/* Status Indicator */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
        <span className={`font-semibold ${isOnline ? "text-green-600" : "text-gray-500"}`}>
          {isOnline ? "ONLINE" : "OFFLINE"}
        </span>
      </div>

      {/* Online Info */}
      {isOnline && (
        <div className="mt-4 space-y-3">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {location ? (
              <span>
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </span>
            ) : locationError ? (
              <span className="text-red-500">{locationError}</span>
            ) : (
              <span>Getting location...</span>
            )}
          </div>

          {/* Time Online */}
          {onlineSince && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Online for {timeOnline}</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
              <Briefcase className="w-4 h-4 mx-auto text-blue-600" />
              <div className="text-lg font-bold text-blue-700">{stats.totalJobsReceived}</div>
              <div className="text-xs text-blue-600">Received</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
              <CheckCircle2 className="w-4 h-4 mx-auto text-green-600" />
              <div className="text-lg font-bold text-green-700">{stats.totalAccepted}</div>
              <div className="text-xs text-green-600">Accepted</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
              <XCircle className="w-4 h-4 mx-auto text-red-600" />
              <div className="text-lg font-bold text-red-700">{stats.totalRejected}</div>
              <div className="text-xs text-red-600">Rejected</div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Keep app open to receive job dispatches. Minimizing the app will auto-offline you after 5 minutes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
