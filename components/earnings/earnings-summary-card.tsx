import * as React from "react"
import { TrendingUp } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatIDR } from "@/lib/utils/currency"
import type { EarningsSummary } from "@/lib/types/earnings"

export interface EarningsSummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  summary?: EarningsSummary | null
  isLoading?: boolean
  title?: string
  description?: string
  showIcon?: boolean
  periodLabel?: string
}

const EarningsSummaryCard = React.forwardRef<HTMLDivElement, EarningsSummaryCardProps>(
  (
    {
      summary,
      isLoading = false,
      title = "Ringkasan Pendapatan",
      description = "Pendapatan Anda dari pekerjaan yang diselesaikan",
      showIcon = true,
      periodLabel = "Total Pendapatan",
      className,
      ...props
    },
    ref
  ) => {
    // Loading state
    if (isLoading) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {showIcon && <TrendingUp className="h-5 w-5 text-muted-foreground" />}
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Empty state (no summary)
    if (!summary) {
      return (
        <Card ref={ref} className={cn("w-full", className)} {...props}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {showIcon && <TrendingUp className="h-5 w-5 text-muted-foreground" />}
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
              <p className="text-2xl font-semibold text-muted-foreground">
                {formatIDR(0)}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Calculate change color and icon
    const isPositiveChange = summary.month_over_month_change >= 0
    const changeColor = isPositiveChange ? "text-green-600" : "text-red-600"
    const changePrefix = isPositiveChange ? "+" : ""

    // Normal state with summary data
    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {showIcon && <TrendingUp className="h-5 w-5 text-muted-foreground" />}
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
              <p className="text-3xl font-semibold tracking-tight">
                {formatIDR(summary.total_earnings)}
              </p>
            </div>

            {/* Month over Month Change */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Bulan ini:</span>
              <span className="text-sm font-medium">{formatIDR(summary.current_month_earnings)}</span>
            </div>

            {/* Change indicator */}
            {summary.month_over_month_change !== 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Perubahan:</span>
                <span className={cn("text-sm font-medium", changeColor)}>
                  {changePrefix}{summary.month_over_month_change.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Additional stats */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Pekerjaan Selesai</p>
                <p className="text-sm font-semibold">{summary.total_bookings_completed}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Rata-rata</p>
                <p className="text-sm font-semibold">{formatIDR(summary.average_earnings_per_booking)}</p>
              </div>
            </div>

            {summary.currency && summary.currency !== "IDR" && (
              <p className="text-xs text-muted-foreground">
                Mata uang: {summary.currency}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
EarningsSummaryCard.displayName = "EarningsSummaryCard"

export { EarningsSummaryCard }
