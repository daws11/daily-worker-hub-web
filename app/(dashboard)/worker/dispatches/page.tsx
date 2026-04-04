"use client";

/**
 * Worker Dispatches Page
 *
 * Displays pending job dispatches for the worker with a full-screen overlay.
 * Polls /api/workers/available-jobs every 5 seconds.
 * Shows IncomingJobCard when there are pending dispatches.
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { IncomingJobCard } from "@/components/worker/incoming-job-card";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Bell, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import type { AvailableJob } from "@/app/api/workers/available-jobs/route";

const POLL_INTERVAL_MS = 5000;

export default function WorkerDispatchesPage() {
  const { user } = useAuth();
  const [pendingJobs, setPendingJobs] = useState<AvailableJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  const fetchAvailableJobs = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const res = await fetch("/api/workers/available-jobs");
      if (res.ok) {
        const data = await res.json();
        setPendingJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Failed to fetch available jobs:", error);
    } finally {
      setLoading(false);
      setIsPolling(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchAvailableJobs();
  }, [fetchAvailableJobs]);

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPolling(true);
      fetchAvailableJobs();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchAvailableJobs]);

  const handleAccept = async (dispatchId: string) => {
    try {
      const res = await fetch(`/api/dispatch/${dispatchId}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept dispatch");
      }

      toast.success("Job accepted!");
      
      // Remove from pending jobs
      setPendingJobs((prev) => prev.filter((j) => j.dispatchId !== dispatchId));
      
      // Refresh the list
      fetchAvailableJobs();
    } catch (error: any) {
      toast.error(error.message || "Failed to accept job");
      throw error;
    }
  };

  const handleReject = async (dispatchId: string) => {
    try {
      const res = await fetch(`/api/dispatch/${dispatchId}/reject`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject dispatch");
      }

      toast.info("Job rejected");
      
      // Remove from pending jobs
      setPendingJobs((prev) => prev.filter((j) => j.dispatchId !== dispatchId));
      
      // Refresh the list
      fetchAvailableJobs();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject job");
      throw error;
    }
  };

  const handleExpired = useCallback(() => {
    // Remove expired job
    toast.warning("Job dispatch expired");
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Checking for new jobs...</p>
      </div>
    );
  }

  // Show full-screen overlay if there are pending dispatches
  if (pendingJobs.length > 0) {
    const latestJob = pendingJobs[0];
    return (
      <IncomingJobCard
        job={latestJob}
        onAccept={handleAccept}
        onReject={handleReject}
        onExpired={handleExpired}
      />
    );
  }

  // No pending dispatches - show empty state
  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Dispatches</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isPolling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          <span>{isPolling ? "Checking..." : "Connected"}</span>
        </div>
      </div>

      <Card className="min-h-[50vh] flex flex-col items-center justify-center">
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Pending Jobs</h3>
          <p className="text-muted-foreground mb-4 max-w-xs mx-auto">
            You&apos;re all caught up! New job dispatches will appear here automatically.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Auto-refresh every 5 seconds</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}