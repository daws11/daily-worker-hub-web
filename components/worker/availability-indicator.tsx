/**
 * Worker Availability Indicator
 *
 * Simple component to show worker availability status in profile cards
 */

import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface AvailabilityIndicatorProps {
  isAvailable: boolean
  availableDays?: number // Number of days available per week
  averageHours?: number // Average hours available per day
  compact?: boolean // Show compact version
}

export function AvailabilityIndicator({
  isAvailable,
  availableDays,
  averageHours,
  compact = false,
}: AvailabilityIndicatorProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5",
          isAvailable ? "text-green-600" : "text-muted-foreground"
        )}
      >
        {isAvailable ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isAvailable ? "Available" : "Not Available"}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Availability Status */}
      <div className="flex items-center gap-2">
        {isAvailable ? (
          <Badge className="bg-green-600 hover:bg-green-700" variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Available
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Not Available
          </Badge>
        )}
      </div>

      {/* Detailed Availability Info */}
      {isAvailable && (availableDays !== undefined || averageHours !== undefined) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {availableDays !== undefined && `${availableDays} days/week`}
            {availableDays !== undefined && averageHours !== undefined && " • "}
            {averageHours !== undefined && `${averageHours}h/day`}
          </span>
        </div>
      )}

      {/* Low availability warning */}
      {isAvailable && availableDays !== undefined && availableDays < 3 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          <AlertCircle className="h-3 w-3" />
          <span>Limited availability</span>
        </div>
      )}
    </div>
  )
}

/**
 * Get availability level based on days available
 */
export function getAvailabilityLevel(daysAvailable: number): {
  level: "high" | "medium" | "low"
  label: string
  color: string
} {
  if (daysAvailable >= 5) {
    return {
      level: "high",
      label: "High Availability",
      color: "text-green-600",
    }
  } else if (daysAvailable >= 3) {
    return {
      level: "medium",
      label: "Medium Availability",
      color: "text-amber-600",
    }
  } else {
    return {
      level: "low",
      label: "Low Availability",
      color: "text-red-600",
    }
  }
}

/**
 * Availability Badge for worker cards
 */
export function AvailabilityBadge({
  isAvailable,
  daysAvailable,
}: {
  isAvailable: boolean
  daysAvailable?: number
}) {
  if (!isAvailable) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not Available
      </Badge>
    )
  }

  if (!daysAvailable) {
    return (
      <Badge className="bg-green-600 hover:bg-green-700" variant="default">
        Available
      </Badge>
    )
  }

  const level = getAvailabilityLevel(daysAvailable)

  return (
    <Badge
      className={cn(
        level.level === "high" && "bg-green-600 hover:bg-green-700",
        level.level === "medium" && "bg-amber-600 hover:bg-amber-700",
        level.level === "low" && "bg-red-600 hover:bg-red-700"
      )}
      variant="default"
    >
      {level.label}
    </Badge>
  )
}
