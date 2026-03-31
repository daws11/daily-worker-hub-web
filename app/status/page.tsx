"use client";

/**
 * Public System Status Page
 *
 * Displays real-time health status of all subsystems by polling
 * GET /api/health/detailed every 30 seconds.
 *
 * Subsystems monitored:
 * - Supabase Database
 * - Supabase Auth
 * - Xendit (payment API)
 * - Upstash Redis (caching)
 *
 * Status indicators:
 * - 🟢 Operational  — all services healthy
 * - 🟡 Degraded     — Redis unavailable (app functions with reduced performance)
 * - 🔴 Incident     — critical service (Supabase or Xendit) unavailable
 */

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Shield,
  Timer,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Overall system health status.
 */
type SystemStatus = "ok" | "degraded" | "unhealthy";

/**
 * Individual service health status.
 */
type ServiceStatus = "ok" | "unavailable";

/**
 * Response shape from GET /api/health/detailed.
 */
interface HealthResponse {
  status: SystemStatus;
  timestamp: string;
  version?: string;
  services: {
    supabase: {
      status: ServiceStatus;
      latencyMs: number;
      database: { status: ServiceStatus; latencyMs: number; error?: string };
      auth: { status: ServiceStatus; latencyMs: number; error?: string };
      error?: string;
    };
    xendit: { status: ServiceStatus; latencyMs: number; error?: string };
    redis: { status: ServiceStatus; latencyMs: number; error?: string };
  };
  responseTimeMs: number;
}

/**
 * Subsystem definition for rendering a status row.
 */
interface SubsystemRow {
  /** Display name shown on the card */
  name: string;
  /** Service name as returned by the API */
  serviceKey: "supabase-database" | "supabase-auth" | "xendit" | "redis";
  /** Which health property to access on the response */
  healthPath: "database" | "auth" | "xendit" | "redis";
  /** Lucide icon component */
  Icon: React.ComponentType<{ className?: string }>;
  /** Description shown under the name */
  description: string;
}

const SUBSYSTEMS: SubsystemRow[] = [
  {
    name: "Supabase Database",
    serviceKey: "supabase-database",
    healthPath: "database",
    Icon: Database,
    description: "PostgreSQL database connectivity",
  },
  {
    name: "Supabase Auth",
    serviceKey: "supabase-auth",
    healthPath: "auth",
    Icon: Shield,
    description: "User authentication service",
  },
  {
    name: "Xendit",
    serviceKey: "xendit",
    healthPath: "xendit",
    Icon: Activity,
    description: "Payment processing API",
  },
  {
    name: "Upstash Redis",
    serviceKey: "redis",
    healthPath: "redis",
    Icon: Timer,
    description: "Caching and rate limiting",
  },
];

/**
 * Returns Tailwind classes for each status indicator.
 */
function getStatusStyles(status: ServiceStatus): {
  dot: string;
  badge: string;
  badgeLabel: string;
} {
  if (status === "ok") {
    return {
      dot: "bg-green-500",
      badge: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
      badgeLabel: "Operational",
    };
  }
  return {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    badgeLabel: "Unavailable",
  };
}

/**
 * Returns Tailwind classes for the overall header banner.
 */
function getOverallBannerStyles(status: SystemStatus): {
  bg: string;
  text: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
} {
  switch (status) {
    case "ok":
      return {
        bg: "bg-green-50 dark:bg-green-950/20",
        text: "text-green-900 dark:text-green-300",
        border: "border-green-200 dark:border-green-800",
        icon: CheckCircle2,
        label: "All Systems Operational",
      };
    case "degraded":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        text: "text-amber-900 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
        icon: AlertTriangle,
        label: "Degraded Performance",
      };
    case "unhealthy":
      return {
        bg: "bg-red-50 dark:bg-red-950/20",
        text: "text-red-900 dark:text-red-300",
        border: "border-red-200 dark:border-red-800",
        icon: XCircle,
        label: "System Incident",
      };
  }
}

/**
 * Fetch health data from the detailed health endpoint.
 */
async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health/detailed", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Health endpoint returned ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHealth = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }

    try {
      const data = await fetchHealth();
      setHealth(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    void loadHealth();

    const interval = setInterval(() => {
      void loadHealth();
    }, 30_000);

    return () => clearInterval(interval);
  }, [loadHealth]);

  const handleRefresh = () => {
    void loadHealth(true);
  };

  const systemStatus = health?.status ?? "unhealthy";
  const banner = getOverallBannerStyles(systemStatus);
  const BannerIcon = banner.icon;

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Page Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            System Status
          </h1>
          <p className="mt-2 text-muted-foreground">
            Daily Worker Hub — real-time service health
          </p>
        </div>

        {/* Overall Status Banner */}
        <Card
          className={`border ${banner.border} ${banner.bg}`}
        >
          <CardContent className="flex items-center gap-4 py-5">
            <BannerIcon className={`h-10 w-10 shrink-0 ${banner.text}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-lg ${banner.text}`}>
                {banner.label}
              </p>
              {lastUpdated && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Last checked{" "}
                  <time dateTime={lastUpdated.toISOString()}>
                    {lastUpdated.toLocaleTimeString()}
                  </time>
                </p>
              )}
            </div>
            {health && (
              <div className="hidden text-right sm:block shrink-0">
                <p className="text-xs text-muted-foreground">Response</p>
                <p className="text-sm font-medium text-foreground">
                  {health.responseTimeMs.toFixed(0)}ms
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Refresh status"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Error State */}
        {error && !health && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="flex items-center gap-3 py-5">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  Unable to load status
                </p>
                <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
                  {error}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subsystem Cards */}
        <div className="space-y-4">
          {loading && !health
            ? // Initial loading skeleton
              SUBSYSTEMS.map((sub) => (
                <Card key={sub.serviceKey}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-3 w-48 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : SUBSYSTEMS.map((sub) => {
                // Retrieve the health object for this subsystem
                const healthObj =
                  sub.healthPath === "database"
                    ? health?.services.supabase.database
                    : sub.healthPath === "auth"
                      ? health?.services.supabase.auth
                      : sub.healthPath === "xendit"
                        ? health?.services.xendit
                        : health?.services.redis;

                const serviceStatus: ServiceStatus =
                  healthObj?.status ?? "unavailable";
                const styles = getStatusStyles(serviceStatus);
                const latencyMs = healthObj?.latencyMs ?? 0;

                return (
                  <Card
                    key={sub.serviceKey}
                    className={
                      serviceStatus === "unavailable"
                        ? "border-red-200 dark:border-red-800"
                        : "border-border"
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        {/* Status dot */}
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${styles.dot}`}
                          aria-label={`${sub.name} status: ${styles.badgeLabel}`}
                        />
                        <CardTitle className="text-base font-medium">
                          {sub.name}
                        </CardTitle>
                      </div>
                      <CardDescription>{sub.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.badge}`}
                        >
                          {serviceStatus === "ok" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {styles.badgeLabel}
                        </span>

                        {/* Latency */}
                        {latencyMs > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {latencyMs.toFixed(0)}ms
                          </span>
                        )}
                      </div>

                      {/* Error detail */}
                      {serviceStatus === "unavailable" &&
                        healthObj?.error && (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400 truncate">
                            {healthObj.error}
                          </p>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          Status updates every 30 seconds. If the problem persists,{" "}
          <a
            href="mailto:support@dailyworkerhub.com"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}
