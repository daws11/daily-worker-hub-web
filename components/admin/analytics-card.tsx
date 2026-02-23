"use client"

import * as React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export interface AnalyticsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label?: string
  }
  icon?: React.ReactNode
  loading?: boolean
}

const AnalyticsCard = React.forwardRef<HTMLDivElement, AnalyticsCardProps>(
  ({ title, value, description, trend, icon, loading = false, className, ...props }, ref) => {
    const formatValue = React.useCallback((val: string | number) => {
      if (typeof val === "number") {
        return val.toLocaleString("en-US")
      }
      return val
    }, [])

    const formatTrend = React.useCallback((val: number) => {
      const sign = val > 0 ? "+" : ""
      return `${sign}${val.toFixed(1)}%`
    }, [])

    return (
      <Card ref={ref} className={cn("", className)} {...props}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold tracking-tight">{formatValue(value)}</div>
              {trend !== undefined && (
                <div className="flex items-center gap-1 text-xs">
                  {trend.value > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                  ) : trend.value < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-500" />
                  ) : null}
                  <span
                    className={cn(
                      "font-medium",
                      trend.value > 0 && "text-green-600 dark:text-green-500",
                      trend.value < 0 && "text-red-600 dark:text-red-500"
                    )}
                  >
                    {formatTrend(trend.value)}
                  </span>
                  {trend.label && (
                    <span className="text-muted-foreground ml-1">{trend.label}</span>
                  )}
                </div>
              )}
              {description && !trend && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }
)
AnalyticsCard.displayName = "AnalyticsCard"

export { AnalyticsCard }
