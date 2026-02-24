import * as React from "react"
import { Star } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const reliabilityBadgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        excellent:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        verygood:
          "border-transparent bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400",
        good:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        fair:
          "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        poor:
          "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        none:
          "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    },
    defaultVariants: {
      variant: "none",
    },
  }
)

export interface ReliabilityBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof reliabilityBadgeVariants> {
  score: number | null | undefined
  showStars?: boolean
}

const getScoreVariant = (score: number | null | undefined): ReliabilityBadgeProps["variant"] => {
  if (score === null || score === undefined) return "none"
  if (score >= 4.5) return "excellent"
  if (score >= 3.5) return "verygood"
  if (score >= 2.5) return "good"
  if (score >= 1.5) return "fair"
  return "poor"
}

const getStarCount = (score: number | null | undefined): number => {
  if (score === null || score === undefined) return 0
  return Math.max(1, Math.min(5, Math.round(score)))
}

export function ReliabilityBadge({
  score,
  showStars = true,
  className,
  ...props
}: ReliabilityBadgeProps) {
  const variant = getScoreVariant(score)
  const starCount = getStarCount(score)

  if (score === null || score === undefined) {
    return (
      <div
        className={cn(reliabilityBadgeVariants({ variant }), className)}
        {...props}
      >
        N/A
      </div>
    )
  }

  const clampedScore = Math.max(0, Math.min(5, score))

  return (
    <div
      className={cn(reliabilityBadgeVariants({ variant }), "gap-1", className)}
      {...props}
    >
      {showStars && (
        <div className="flex items-center" aria-label={`${starCount} stars`}>
          {Array.from({ length: starCount }).map((_, i) => (
            <Star
              key={i}
              className="h-3 w-3 fill-current"
            />
          ))}
        </div>
      )}
      <span>{clampedScore.toFixed(1)}</span>
    </div>
  )
}
