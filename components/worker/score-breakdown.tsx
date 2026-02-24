import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface ScoreBreakdownProps {
  attendanceRate: number // 0-100 percentage
  punctualityRate: number // 0-100 percentage
  avgRating: number // 1-5 rating
  className?: string
}

interface MetricItemProps {
  label: string
  value: number
  maxValue: number
  suffix: string
  weight: string
  colorClass: string
  bgColorClass: string
}

function MetricItem({
  label,
  value,
  maxValue,
  suffix,
  weight,
  colorClass,
  bgColorClass,
}: MetricItemProps) {
  const percentage = (value / maxValue) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{weight}</span>
          <span className={cn("text-sm font-semibold", colorClass)}>
            {value}{suffix}
          </span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-300", bgColorClass)}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
    </div>
  )
}

export function ScoreBreakdown({
  attendanceRate,
  punctualityRate,
  avgRating,
  className,
}: ScoreBreakdownProps) {
  // Determine color classes based on values
  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-500",
    }
    if (rate >= 75) return {
      text: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500",
    }
    return {
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-500",
    }
  }

  const getPunctualityColor = (rate: number) => {
    if (rate >= 90) return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-500",
    }
    if (rate >= 75) return {
      text: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500",
    }
    return {
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-500",
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-500",
    }
    if (rating >= 3.5) return {
      text: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500",
    }
    return {
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-500",
    }
  }

  const attendanceColors = getAttendanceColor(attendanceRate)
  const punctualityColors = getPunctualityColor(punctualityRate)
  const ratingColors = getRatingColor(avgRating)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
        <CardDescription>
          Your reliability score is calculated using a weighted formula
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricItem
          label="Attendance Rate"
          value={Math.round(attendanceRate)}
          maxValue={100}
          suffix="%"
          weight="40%"
          colorClass={attendanceColors.text}
          bgColorClass={attendanceColors.bg}
        />
        <MetricItem
          label="Punctuality Rate"
          value={Math.round(punctualityRate)}
          maxValue={100}
          suffix="%"
          weight="30%"
          colorClass={punctualityColors.text}
          bgColorClass={punctualityColors.bg}
        />
        <MetricItem
          label="Average Rating"
          value={Math.round(avgRating * 10) / 10}
          maxValue={5}
          suffix=""
          weight="30%"
          colorClass={ratingColors.text}
          bgColorClass={ratingColors.bg}
        />
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Formula: (Attendance × 0.4) + (Punctuality × 0.3) + (Rating × 0.3)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
