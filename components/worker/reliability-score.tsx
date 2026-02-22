import * as React from "react"
import { Star, StarHalf } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ReliabilityScoreProps {
  score: number
  showValue?: boolean
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeVariants = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

const labelSizeVariants = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

const valueSizeVariants = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
}

export function ReliabilityScore({
  score,
  showValue = true,
  showLabel = false,
  size = "md",
  className,
}: ReliabilityScoreProps) {
  // Clamp score between 0 and 5
  const clampedScore = Math.max(0, Math.min(5, score))
  const fullStars = Math.floor(clampedScore)
  const hasHalfStar = clampedScore - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  const getScoreColor = (score: number) => {
    if (score === 5.0) return "text-yellow-600 dark:text-yellow-400"
    if (score >= 4.0) return "text-green-600 dark:text-green-400"
    if (score >= 3.0) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  const getStarColor = (score: number) => {
    if (score === 5.0) return "fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400"
    if (score >= 4.0) return "fill-green-500 text-green-500 dark:fill-green-400 dark:text-green-400"
    if (score >= 3.0) return "fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400"
    return "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400"
  }

  const starColor = getStarColor(clampedScore)
  const scoreColor = getScoreColor(clampedScore)

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="flex items-center" aria-label={`Reliability score: ${clampedScore} out of 5 stars`}>
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(sizeVariants[size], starColor)}
          />
        ))}

        {/* Half star */}
        {hasHalfStar && (
          <StarHalf
            className={cn(sizeVariants[size], starColor)}
          />
        )}

        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(sizeVariants[size], "text-gray-300 dark:text-gray-600")}
          />
        ))}
      </div>

      {showValue && (
        <span className={cn("font-semibold", scoreColor, valueSizeVariants[size])}>
          {clampedScore.toFixed(1)}
        </span>
      )}

      {showLabel && (
        <span className={cn("text-muted-foreground", labelSizeVariants[size])}>
          {clampedScore === 5 ? "Excellent" :
           clampedScore >= 4 ? "Very Good" :
           clampedScore >= 3 ? "Good" :
           clampedScore >= 2 ? "Fair" :
           "Poor"}
        </span>
      )}
    </div>
  )
}

export interface ReliabilityScoreBreakdownProps {
  score: number
  breakdown?: {
    completedJobs?: number
    onTimeDelivery?: number
    qualityRating?: number
    communication?: number
  }
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ReliabilityScoreBreakdown({
  score,
  breakdown,
  size = "md",
  className,
}: ReliabilityScoreBreakdownProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <ReliabilityScore score={score} showValue showLabel size={size} />

      {breakdown && (
        <div className="space-y-2">
          {breakdown.completedJobs !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completed Jobs</span>
              <span className="font-medium">{breakdown.completedJobs}</span>
            </div>
          )}
          {breakdown.onTimeDelivery !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">On-time Delivery</span>
              <span className="font-medium">{breakdown.onTimeDelivery}%</span>
            </div>
          )}
          {breakdown.qualityRating !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quality Rating</span>
              <span className="font-medium">{breakdown.qualityRating}/5</span>
            </div>
          )}
          {breakdown.communication !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Communication</span>
              <span className="font-medium">{breakdown.communication}/5</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
