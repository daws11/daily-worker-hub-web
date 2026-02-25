"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import type { ServiceHealth } from "@/lib/types/admin"

export interface HealthMetricProps extends React.HTMLAttributes<HTMLDivElement> {
  service: ServiceHealth
  loading?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

const statusConfig = {
  operational: {
    label: "Operational",
    variant: "default" as const,
    icon: CheckCircle2,
    iconColor: "text-green-600 dark:text-green-500",
    bgClass: "bg-green-50 dark:bg-green-950/20",
  },
  degraded: {
    label: "Degraded",
    variant: "secondary" as const,
    icon: AlertTriangle,
    iconColor: "text-amber-600 dark:text-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
  },
  down: {
    label: "Down",
    variant: "destructive" as const,
    icon: XCircle,
    iconColor: "text-red-600 dark:text-red-500",
    bgClass: "bg-red-50 dark:bg-red-950/20",
  },
}

const HealthMetric = React.forwardRef<HTMLDivElement, HealthMetricProps>(
  ({ service, loading = false, onRefresh, refreshing = false, className, ...props }, ref) => {
    const config = statusConfig[service.status]
    const StatusIcon = config.icon

    const formatResponseTime = React.useCallback((ms?: number) => {
      if (ms === undefined) return null
      if (ms < 100) return `${ms}ms`
      if (ms < 1000) return `${ms.toFixed(0)}ms`
      return `${(ms / 1000).toFixed(2)}s`
    }, [])

    const formatLastChecked = React.useCallback((dateStr: string) => {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      return `${diffDays}d ago`
    }, [])

    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all hover:shadow-md",
          config.bgClass,
          className
        )}
        {...props}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", config.iconColor)} />
            <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.variant}>{config.label}</Badge>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRefresh}
                disabled={loading || refreshing}
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    (loading || refreshing) && "animate-spin"
                  )}
                />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Response Time</span>
                <span className="text-xs font-medium">
                  {service.responseTime !== undefined
                    ? formatResponseTime(service.responseTime)
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Last Checked</span>
                <span className="text-xs font-medium">
                  {formatLastChecked(service.lastChecked)}
                </span>
              </div>
              {service.errorMessage && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-destructive">{service.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
HealthMetric.displayName = "HealthMetric"

export { HealthMetric }
