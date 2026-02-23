import * as React from "react"
import { BarChart3 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatIDR } from "@/lib/utils/currency"
import type { MonthlyEarnings } from "@/lib/types/earnings"

export interface MonthlyEarningsChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data?: MonthlyEarnings[] | null
  isLoading?: boolean
  title?: string
  description?: string
  showIcon?: boolean
  showEmptyState?: boolean
  maxBars?: number
}

const MonthlyEarningsChart = React.forwardRef<HTMLDivElement, MonthlyEarningsChartProps>(
  (
    {
      data,
      isLoading = false,
      title = "Grafik Pendapatan Bulanan",
      description = "Tren pendapatan Anda dalam beberapa bulan terakhir",
      showIcon = true,
      showEmptyState = true,
      maxBars = 12,
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
              {showIcon && <BarChart3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Empty state (no data)
    if (!data || data.length === 0) {
      if (showEmptyState) {
        return (
          <Card ref={ref} className={cn("w-full", className)} {...props}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {showIcon && <BarChart3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
                <CardTitle>{title}</CardTitle>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Belum ada data pendapatan</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data pendapatan bulanan akan muncul di sini setelah Anda menyelesaikan pekerjaan
                </p>
              </div>
            </CardContent>
          </Card>
        )
      }
      return null
    }

    // Limit data to maxBars
    const chartData = data.slice(-maxBars)

    // Calculate chart dimensions
    const maxEarnings = Math.max(...chartData.map((d) => d.earnings), 1)
    const chartHeight = 200
    const barWidth = 24
    const gapWidth = 12
    const chartWidth = chartData.length * (barWidth + gapWidth) - gapWidth

    // Helper to get month short name
    const getMonthShortName = (monthName: string): string => {
      const parts = monthName.split(" ")
      if (parts.length >= 2) {
        const month = parts[0]
        const monthMap: Record<string, string> = {
          January: "Jan",
          February: "Feb",
          March: "Mar",
          April: "Apr",
          May: "Mei",
          June: "Jun",
          July: "Jul",
          August: "Agu",
          September: "Sep",
          October: "Okt",
          November: "Nov",
          December: "Des",
        }
        return monthMap[month] || month.substring(0, 3)
      }
      return monthName.substring(0, 3)
    }

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {showIcon && <BarChart3 className="h-5 w-5 text-muted-foreground" />}
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chart */}
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-fit">
                <svg
                  width={Math.max(chartWidth, 300)}
                  height={chartHeight + 30}
                  className="mx-auto"
                  viewBox={`0 0 ${Math.max(chartWidth, 300)} ${chartHeight + 30}`}
                  aria-label="Grafik pendapatan bulanan"
                  role="img"
                >
                  {/* Background grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <line
                      key={`grid-${ratio}`}
                      x1="0"
                      y1={chartHeight * (1 - ratio)}
                      x2={chartWidth}
                      y2={chartHeight * (1 - ratio)}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-muted-foreground/10"
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Bars */}
                  {chartData.map((item, index) => {
                    const barHeight = (item.earnings / maxEarnings) * (chartHeight - 20)
                    const x = index * (barWidth + gapWidth)
                    const y = chartHeight - barHeight

                    return (
                      <g key={item.month}>
                        {/* Bar */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          fill="hsl(var(--primary))"
                          rx="4"
                          className="hover:fill-primary/80 transition-colors cursor-pointer"
                        >
                          <title>
                            {item.month_name}: {formatIDR(item.earnings)} ({item.bookings_count}{" "}
                            {item.bookings_count === 1 ? "pekerjaan" : "pekerjaan"})
                          </title>
                        </rect>

                        {/* Earnings label on top of bar */}
                        {barHeight > 20 && (
                          <text
                            x={x + barWidth / 2}
                            y={y - 5}
                            textAnchor="middle"
                            className="text-[10px] fill-muted-foreground"
                            fontSize="10"
                          >
                            {item.earnings >= 1000000
                              ? `${(item.earnings / 1000000).toFixed(1)}jt`
                              : item.earnings >= 1000
                                ? `${(item.earnings / 1000).toFixed(0)}k`
                                : ""}
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {/* X-axis labels */}
                  {chartData.map((item, index) => {
                    const x = index * (barWidth + gapWidth) + barWidth / 2

                    return (
                      <text
                        key={`label-${item.month}`}
                        x={x}
                        y={chartHeight + 15}
                        textAnchor="middle"
                        className="text-[10px] fill-muted-foreground"
                        fontSize="10"
                      >
                        {getMonthShortName(item.month_name)}
                      </text>
                    )
                  })}
                </svg>
              </div>
            </div>

            {/* Summary statistics */}
            <div className="flex items-center justify-between pt-2 border-t text-sm flex-wrap gap-2">
              <div className="text-center flex-1 min-w-[100px]">
                <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                <p className="font-semibold">
                  {formatIDR(chartData.reduce((sum, item) => sum + item.earnings, 0))}
                </p>
              </div>
              <div className="text-center flex-1 min-w-[100px] border-x px-4">
                <p className="text-xs text-muted-foreground">Rata-rata</p>
                <p className="font-semibold">
                  {formatIDR(
                    chartData.reduce((sum, item) => sum + item.earnings, 0) / chartData.length
                  )}
                </p>
              </div>
              <div className="text-center flex-1 min-w-[100px]">
                <p className="text-xs text-muted-foreground">Tertinggi</p>
                <p className="font-semibold">{formatIDR(maxEarnings)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)
MonthlyEarningsChart.displayName = "MonthlyEarningsChart"

export { MonthlyEarningsChart }
