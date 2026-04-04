"use client";

/**
 * Business Job Detail Page
 *
 * Shows job details with dispatch status monitoring.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { DispatchMonitor } from "@/components/business/dispatch-monitor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, MapPin, Calendar, Users, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface JobDetail {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  status: string;
  dispatch_status: string;
  dispatch_mode: string;
  budget_min: number;
  budget_max: number;
  start_date: string | null;
  end_date: string | null;
  workers_needed: number;
  category?: {
    name: string;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BusinessJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Job not found");
        } else {
          setError("Failed to load job");
        }
        return;
      }

      const data = await res.json();
      setJob(data.job || data);
    } catch (err) {
      setError("Failed to load job");
      console.error("Error fetching job:", err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleCancelDispatch = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/dispatch`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Dispatch cancelled");
        fetchJob();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel dispatch");
      }
    } catch {
      toast.error("Failed to cancel dispatch");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error || "Job not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/business/jobs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold truncate">{job.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={job.status === "open" ? "default" : "secondary"}>
              {job.status}
            </Badge>
            {job.category?.name && (
              <Badge variant="outline">{job.category.name}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch Monitor (only for auto-dispatch jobs) */}
      {job.dispatch_mode === "auto" && (
        <DispatchMonitor
          jobId={job.id}
          jobTitle={job.title}
          onCancel={handleCancelDispatch}
        />
      )}

      {/* Job Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Budget */}
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {formatCurrency(job.budget_min)}
              {job.budget_max > job.budget_min && ` - ${formatCurrency(job.budget_max)}`}
            </span>
          </div>

          {/* Location */}
          {job.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span>{job.address}</span>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              {formatDate(job.start_date)} - {formatDate(job.end_date)}
            </span>
          </div>

          {/* Workers Needed */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{job.workers_needed} workers needed</span>
          </div>

          {/* Description */}
          {job.description && (
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispatch Status Card (for manual dispatch jobs) */}
      {job.dispatch_mode === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle>Dispatch Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="text-lg font-semibold capitalize">
                  {job.dispatch_status?.replace("_", " ") || "Not dispatched"}
                </p>
              </div>
              <Badge
                variant={
                  job.dispatch_status === "fulfilled" ? "default" : "secondary"
                }
              >
                {job.dispatch_status || "none"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}