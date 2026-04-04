"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface WorkerStats {
  workerId: string;
  name: string;
  acceptanceRate: number;
  avgResponseTime: number;
  totalDispatches: number;
}

interface DispatchAnalyticsData {
  totalDispatches: number;
  totalAccepted: number;
  totalRejected: number;
  totalTimedOut: number;
  acceptanceRate: number;
  avgResponseTimeSeconds: number;
  avgDispatchesPerJob: number;
  jobsFulfilled: number;
  jobsExhausted: number;
  onlineWorkerCount: number;
  topWorkers: WorkerStats[];
}

type PeriodOption = "7d" | "30d" | "90d";

// ============================================================================
// Helper Components
// ============================================================================

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  warning = false,
  loading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: "up" | "down";
  warning?: boolean;
  loading?: boolean;
}) {
  return (
    <Card className={cn("relative overflow-hidden", warning && "border-yellow-500 dark:border-yellow-600")}>
      {warning && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full m-2" />
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            warning ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500" : "bg-primary/10 text-primary"
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-2">
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className="text-xs text-muted-foreground">
              vs previous period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface DispatchAnalyticsProps {
  businessId: string;
  className?: string;
}

export function DispatchAnalytics({ businessId, className }: DispatchAnalyticsProps) {
  const [period, setPeriod] = useState<PeriodOption>("7d");
  const [data, setData] = useState<DispatchAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analytics/dispatch?businessId=${businessId}&period=${period}`
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to fetch analytics");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Dispatch analytics error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 30 seconds for online worker count
  useEffect(() => {
    if (!businessId) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [businessId, fetchAnalytics]);

  const periodOptions: { value: PeriodOption; label: string }[] = [
    { value: "7d", label: "7 Hari" },
    { value: "30d", label: "30 Hari" },
    { value: "90d", label: "90 Hari" },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Dispatch Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Performa dispatch untuk perioda yang dipilih
          </p>
        </div>

        <div className="flex gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(option.value)}
              className="min-w-[70px]"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchAnalytics}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Dispatches"
          value={data ? formatNumber(data.totalDispatches) : "0"}
          subtitle={`dalam ${period}`}
          icon={Activity}
          loading={isLoading}
        />

        <StatCard
          title="Acceptance Rate"
          value={data ? `${data.acceptanceRate}%` : "0%"}
          subtitle={`${data?.totalAccepted || 0} accepted`}
          icon={CheckCircle}
          loading={isLoading}
        />

        <StatCard
          title="Avg Response Time"
          value={data ? formatSeconds(data.avgResponseTimeSeconds) : "0s"}
          subtitle="waktu respons rata-rata"
          icon={Clock}
          loading={isLoading}
        />

        <StatCard
          title="Jobs Fulfilled"
          value={data ? formatNumber(data.jobsFulfilled) : "0"}
          subtitle={`${data?.avgDispatchesPerJob || 0} dispatches/job`}
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accepted</p>
              <p className="text-lg font-semibold">{data?.totalAccepted || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="text-lg font-semibold">{data?.totalRejected || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Timed Out</p>
              <p className="text-lg font-semibold">{data?.totalTimedOut || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(data?.jobsExhausted && data.jobsExhausted > 0 && "border-yellow-500/50")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              data?.jobsExhausted && data.jobsExhausted > 0
                ? "bg-yellow-100 text-yellow-600"
                : "bg-gray-100 text-gray-600"
            )}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jobs Exhausted</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{data?.jobsExhausted || 0}</p>
                {data?.jobsExhausted && data.jobsExhausted > 0 && (
                  <Badge variant="warning" className="text-xs">Warning</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Worker Count & Top Workers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Online Worker Count */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Online Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-4xl font-bold">{data?.onlineWorkerCount || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    workers currently online
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg dispatches per job</span>
                  <span className="font-medium">{data?.avgDispatchesPerJob || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total rejected</span>
                  <span className="font-medium text-red-500">{data?.totalRejected || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total timed out</span>
                  <span className="font-medium text-yellow-500">{data?.totalTimedOut || 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Workers Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Workers (by Acceptance Rate)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.topWorkers && data.topWorkers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2">Worker</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Acceptance</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Avg Response</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.topWorkers.map((worker, index) => (
                    <tr key={worker.workerId} className="hover:bg-muted/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center",
                            index < 3 ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"
                          )}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-sm">{worker.name}</span>
                        </div>
                      </td>
                      <td className="text-right">
                        <Badge
                          variant={worker.acceptanceRate >= 80 ? "success" : worker.acceptanceRate >= 50 ? "warning" : "destructive"}
                          className="text-xs"
                        >
                          {worker.acceptanceRate}%
                        </Badge>
                      </td>
                      <td className="text-right text-sm text-muted-foreground">
                        {formatSeconds(worker.avgResponseTime)}
                      </td>
                      <td className="text-right text-sm">
                        {worker.totalDispatches}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada data dispatch</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}