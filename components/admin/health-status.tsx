"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, XCircle, AlertCircle, Activity, Server, Database } from "lucide-react"
import { cn } from "@/lib/utils"

export interface HealthMetric {
  name: string
  status: "healthy" | "warning" | "critical"
  value?: string | number
  description?: string
}

export interface HealthStatusProps {
  metrics: HealthMetric[]
  loading?: boolean
  className?: string
}

export function HealthStatus({ metrics, loading = false, className }: HealthStatusProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = (status: HealthMetric["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "critical":
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusBadge = (status: HealthMetric["status"]) => {
    switch (status) {
      case "healthy":
        return <Badge variant="default" className="bg-green-600">Healthy</Badge>
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-600 text-white">Warning</Badge>
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <CardDescription>
          Overall system health status and key indicators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => (
          <div
            key={metric.name}
            className="flex items-start justify-between p-4 rounded-lg border"
          >
            <div className="flex items-start gap-3">
              {getStatusIcon(metric.status)}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">{metric.name}</h4>
                  {getStatusBadge(metric.status)}
                </div>
                {metric.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                )}
              </div>
            </div>
            {metric.value !== undefined && (
              <div className="text-right">
                <span className="text-sm font-bold">{metric.value}</span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export interface SystemOverviewProps {
  system: {
    cpu: {
      usage: number
      cores: number
      model: string
    }
    memory: {
      usagePercent: number
      used: number
      total: number
    }
    uptime: {
      formatted: string
    }
    platform: string
    nodeVersion: string
  }
  loading?: boolean
  className?: string
}

export function SystemOverview({ system, loading = false, className }: SystemOverviewProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  const getCpuStatus = (usage: number): "healthy" | "warning" | "critical" => {
    if (usage < 70) return "healthy"
    if (usage < 90) return "warning"
    return "critical"
  }

  const getMemoryStatus = (usage: number): "healthy" | "warning" | "critical" => {
    if (usage < 70) return "healthy"
    if (usage < 90) return "warning"
    return "critical"
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          System Overview
        </CardTitle>
        <CardDescription>
          Server resource utilization and uptime
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CPU Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">CPU Usage</span>
              <Badge variant={getCpuStatus(system.cpu.usage) === "healthy" ? "default" : "secondary"}>
                {system.cpu.usage}%
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {system.cpu.cores} cores
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                system.cpu.usage < 70 && "bg-green-600",
                system.cpu.usage >= 70 && system.cpu.usage < 90 && "bg-yellow-600",
                system.cpu.usage >= 90 && "bg-red-600"
              )}
              style={{ width: `${system.cpu.usage}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Memory Usage</span>
              <Badge variant={getMemoryStatus(system.memory.usagePercent) === "healthy" ? "default" : "secondary"}>
                {system.memory.usagePercent}%
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatBytes(system.memory.used)} / {formatBytes(system.memory.total)}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                system.memory.usagePercent < 70 && "bg-green-600",
                system.memory.usagePercent >= 70 && system.memory.usagePercent < 90 && "bg-yellow-600",
                system.memory.usagePercent >= 90 && "bg-red-600"
              )}
              style={{ width: `${system.memory.usagePercent}%` }}
            />
          </div>
        </div>

        {/* System Info */}
        <div className="grid gap-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uptime</span>
            <span className="font-medium">{system.uptime.formatted}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-medium capitalize">{system.platform}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Node Version</span>
            <span className="font-medium">{system.nodeVersion}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export interface DatabaseStatusProps {
  database: {
    connectionCount: number
    maxConnections: number
    averageQueryTime: number
    slowQueries: Array<{ query: string; duration: number; timestamp: number }>
  }
  loading?: boolean
  className?: string
}

export function DatabaseStatus({ database, loading = false, className }: DatabaseStatusProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  const connectionUsage = (database.connectionCount / database.maxConnections) * 100
  
  const getConnectionStatus = (usage: number): "healthy" | "warning" | "critical" => {
    if (usage < 70) return "healthy"
    if (usage < 90) return "warning"
    return "critical"
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Status
        </CardTitle>
        <CardDescription>
          Connection pool and query performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Pool */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Pool</span>
            <Badge variant={getConnectionStatus(connectionUsage) === "healthy" ? "default" : "secondary"}>
              {database.connectionCount} / {database.maxConnections}
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                connectionUsage < 70 && "bg-green-600",
                connectionUsage >= 70 && connectionUsage < 90 && "bg-yellow-600",
                connectionUsage >= 90 && "bg-red-600"
              )}
              style={{ width: `${connectionUsage}%` }}
            />
          </div>
        </div>

        {/* Query Performance */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Avg Query Time</span>
          <span className="font-medium">{database.averageQueryTime}ms</span>
        </div>

        {/* Slow Queries */}
        {database.slowQueries.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium">Slow Queries</h4>
            {database.slowQueries.slice(0, 3).map((query, index) => (
              <div key={index} className="p-2 rounded-lg bg-muted space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono truncate flex-1">{query.query}</span>
                  <Badge variant="outline" className="ml-2">{query.duration}ms</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
