"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Activity,
  Users,
  Zap,
  AlertCircle,
  Database,
  Clock,
  TrendingUp,
  Shield,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricsCard } from "@/components/admin/metrics-card";
import { ResponseTimeChart } from "@/components/admin/response-time-chart";
import { ErrorRateChart } from "@/components/admin/error-rate-chart";
import {
  HealthStatus,
  SystemOverview,
  DatabaseStatus,
  type HealthMetric,
} from "@/components/admin/health-status";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch metrics");
    }
    return res.json();
  });

interface MetricsData {
  timestamp: string;
  system: {
    cpu: {
      usage: number;
      cores: number;
      model: string;
    };
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    uptime: {
      seconds: number;
      formatted: string;
    };
    platform: string;
    nodeVersion: string;
  };
  cache: {
    hits: number;
    misses: number;
    size: number;
    maxSize: number;
    hitRate: number;
    entries: number;
  };
  rateLimit: {
    totalRequests: number;
    blockedRequests: number;
    activeLimiters: number;
    byType: {
      auth: { requests: number; blocked: number };
      "api-authenticated": { requests: number; blocked: number };
      "api-public": { requests: number; blocked: number };
      payment: { requests: number; blocked: number };
    };
    topEndpoints: Array<{ endpoint: string; count: number }>;
  };
  api: {
    average: number;
    p95: number;
    p99: number;
    total: number;
    lastHour: {
      average: number;
      p95: number;
      p99: number;
      total: number;
    };
    dataPoints: Array<{
      timestamp: number;
      average: number;
      p95: number;
      p99: number;
    }>;
  };
  errors: {
    total24h: number;
    errorsPerMinute: number;
    byType: Array<{ type: string; count: number }>;
    trend24h: Array<{ hour: number; count: number }>;
    lastHour: {
      total: number;
      errorsPerMinute: number;
    };
  };
  users: {
    currentlyLoggedIn: number;
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
    byType: {
      workers: number;
      businesses: number;
      admins: number;
    };
  };
  database: {
    connectionCount: number;
    maxConnections: number;
    slowQueries: Array<{ query: string; duration: number; timestamp: number }>;
    averageQueryTime: number;
  };
}

export default function AdminMonitoringPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch metrics with SWR (30 second refresh)
  // Uses session-based authentication - no secret required
  const {
    data: metrics,
    error,
    isLoading,
    mutate,
  } = useSWR<MetricsData>(
    user ? "/api/admin/monitoring/metrics" : null,
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds
      onSuccess: () => {
        setLastUpdated(new Date());
      },
    },
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/admin/monitoring");
    }
  }, [user, authLoading, router]);

  const getHealthMetrics = (): HealthMetric[] => {
    if (!metrics) return [];

    const healthMetrics: HealthMetric[] = [];

    // API Health
    healthMetrics.push({
      name: "API Response",
      status:
        metrics.api.average < 200
          ? "healthy"
          : metrics.api.average < 500
            ? "warning"
            : "critical",
      value: `${metrics.api.average}ms`,
      description: `P95: ${metrics.api.p95}ms, P99: ${metrics.api.p99}ms`,
    });

    // Error Rate
    healthMetrics.push({
      name: "Error Rate",
      status:
        metrics.errors.errorsPerMinute < 0.1
          ? "healthy"
          : metrics.errors.errorsPerMinute < 1
            ? "warning"
            : "critical",
      value: `${metrics.errors.errorsPerMinute.toFixed(3)}/min`,
      description: `${metrics.errors.total24h} errors in last 24h`,
    });

    // Cache Health
    healthMetrics.push({
      name: "Cache Performance",
      status:
        metrics.cache.hitRate > 80
          ? "healthy"
          : metrics.cache.hitRate > 50
            ? "warning"
            : "critical",
      value: `${metrics.cache.hitRate}%`,
      description: `${metrics.cache.entries} cached entries`,
    });

    // Database Health
    const dbConnectionUsage =
      (metrics.database.connectionCount / metrics.database.maxConnections) *
      100;
    healthMetrics.push({
      name: "Database",
      status:
        dbConnectionUsage < 70
          ? "healthy"
          : dbConnectionUsage < 90
            ? "warning"
            : "critical",
      value: `${metrics.database.connectionCount}/${metrics.database.maxConnections}`,
      description: `Avg query: ${metrics.database.averageQueryTime}ms`,
    });

    return healthMetrics;
  };

  if (authLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">
                Error loading metrics: {error.message}
              </p>
            </div>
            <Button onClick={() => mutate()} className="mt-4" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Real-time system metrics and health monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <Button
            onClick={() => mutate()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="API Response Time"
          value={`${metrics?.api.average || 0}ms`}
          description={`P95: ${metrics?.api.p95 || 0}ms`}
          icon={<Zap className="h-4 w-4" />}
          loading={isLoading}
          trend={metrics ? { value: -5, label: "vs last hour" } : undefined}
        />
        <MetricsCard
          title="Error Rate"
          value={`${(metrics?.errors.errorsPerMinute || 0).toFixed(3)}/min`}
          description={`${metrics?.errors.total24h || 0} errors (24h)`}
          icon={<AlertCircle className="h-4 w-4" />}
          loading={isLoading}
          trend={metrics ? { value: -10, label: "vs last hour" } : undefined}
        />
        <MetricsCard
          title="Active Users"
          value={metrics?.users.currentlyLoggedIn || 0}
          description={`${metrics?.users.dailyActive || 0} daily active`}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
          trend={metrics ? { value: 12, label: "vs yesterday" } : undefined}
        />
        <MetricsCard
          title="Cache Hit Rate"
          value={`${metrics?.cache.hitRate || 0}%`}
          description={`${metrics?.cache.entries || 0} cached items`}
          icon={<Activity className="h-4 w-4" />}
          loading={isLoading}
          trend={metrics ? { value: 3, label: "vs last hour" } : undefined}
        />
      </div>

      {/* System Health & Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <HealthStatus metrics={getHealthMetrics()} loading={isLoading} />
        <SystemOverview
          system={
            metrics?.system || {
              cpu: { usage: 0, cores: 0, model: "" },
              memory: { usagePercent: 0, used: 0, total: 0 },
              uptime: { formatted: "" },
              platform: "",
              nodeVersion: "",
            }
          }
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ResponseTimeChart
          data={metrics?.api.dataPoints || []}
          loading={isLoading}
        />
        <ErrorRateChart
          trendData={metrics?.errors.trend24h || []}
          errorTypes={metrics?.errors.byType || []}
          loading={isLoading}
        />
      </div>

      {/* Database & Rate Limiting */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DatabaseStatus
          database={
            metrics?.database || {
              connectionCount: 0,
              maxConnections: 0,
              averageQueryTime: 0,
              slowQueries: [],
            }
          }
          loading={isLoading}
        />

        {/* Rate Limiting Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Rate Limiting
            </CardTitle>
            <CardDescription>Request rate limiting statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      Total Requests
                    </p>
                    <p className="text-2xl font-bold">
                      {metrics?.rateLimit.totalRequests || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      Blocked Requests
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {metrics?.rateLimit.blockedRequests || 0}
                    </p>
                  </div>
                </div>

                {/* By Type */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Requests by Type</h4>
                  {metrics?.rateLimit.byType &&
                    Object.entries(metrics.rateLimit.byType).map(
                      ([type, data]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted"
                        >
                          <span className="text-sm capitalize">
                            {type.replace("-", " ")}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{data.requests}</Badge>
                            {data.blocked > 0 && (
                              <Badge variant="destructive">
                                {data.blocked} blocked
                              </Badge>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                </div>

                {/* Top Endpoints */}
                {metrics?.rateLimit.topEndpoints &&
                  metrics.rateLimit.topEndpoints.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="text-sm font-medium">Top Endpoints</h4>
                      {metrics.rateLimit.topEndpoints
                        .slice(0, 5)
                        .map((endpoint) => (
                          <div
                            key={endpoint.endpoint}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-mono truncate flex-1">
                              {endpoint.endpoint}
                            </span>
                            <Badge variant="secondary">{endpoint.count}</Badge>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Activity
          </CardTitle>
          <CardDescription>
            Active user statistics and breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Currently Online
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics?.users.currentlyLoggedIn || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Daily Active</p>
                  <p className="text-2xl font-bold">
                    {metrics?.users.dailyActive || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Weekly Active</p>
                  <p className="text-2xl font-bold">
                    {metrics?.users.weeklyActive || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Monthly Active
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics?.users.monthlyActive || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Online by Type</h4>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <span className="text-sm">Workers</span>
                    <Badge>{metrics?.users.byType.workers || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <span className="text-sm">Businesses</span>
                    <Badge>{metrics?.users.byType.businesses || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <span className="text-sm">Admins</span>
                    <Badge>{metrics?.users.byType.admins || 0}</Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
