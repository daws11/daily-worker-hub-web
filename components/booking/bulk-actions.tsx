"use client"

import * as React from "react"
import { Check, X, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"

export interface BulkActionsProps {
  selectedBookingIds: string[]
  onBulkAccept?: (bookingIds: string[]) => Promise<void> | void
  onBulkReject?: (bookingIds: string[]) => Promise<void> | void
  isLoading?: boolean
  disabled?: boolean
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline" | "ghost"
  className?: string
  showLabels?: boolean
  showCount?: boolean
}

export function BulkActions({
  selectedBookingIds,
  onBulkAccept,
  onBulkReject,
  isLoading = false,
  disabled = false,
  size = "default",
  variant = "default",
  className,
  showLabels = true,
  showCount = true,
}: BulkActionsProps) {
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

  const hasSelection = selectedBookingIds.length > 0
  const isActionDisabled = disabled || isLoading || !hasSelection

  const handleBulkAccept = async () => {
    if (isActionDisabled || !onBulkAccept) return

    setIsAccepting(true)
    try {
      await onBulkAccept(selectedBookingIds)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleBulkReject = async () => {
    if (isActionDisabled || !onBulkReject) return

    setIsRejecting(true)
    try {
      await onBulkReject(selectedBookingIds)
    } finally {
      setIsRejecting(false)
    }
  }

  const getButtonSize = () => {
    switch (size) {
      case "sm":
        return "sm"
      case "lg":
        return "lg"
      default:
        return "default"
    }
  }

  const getAcceptVariant = () => {
    if (variant === "ghost") return "ghost"
    if (variant === "outline") return "outline"
    return "default"
  }

  const getRejectVariant = () => {
    if (variant === "ghost") return "ghost"
    return "destructive"
  }

  const getLabel = (baseLabel: string) => {
    if (!showCount) return baseLabel
    return `${baseLabel} (${selectedBookingIds.length})`
  }

  if (!hasSelection) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {onBulkAccept && (
        <Button
          variant={getAcceptVariant()}
          size={getButtonSize()}
          onClick={handleBulkAccept}
          disabled={isActionDisabled}
          aria-label={`Accept ${selectedBookingIds.length} selected bookings`}
        >
          {isAccepting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {showLabels && <span>Processing...</span>}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {showLabels && <span>{getLabel("Accept All")}</span>}
            </>
          )}
        </Button>
      )}

      {onBulkReject && (
        <Button
          variant={getRejectVariant()}
          size={getButtonSize()}
          onClick={handleBulkReject}
          disabled={isActionDisabled}
          aria-label={`Reject ${selectedBookingIds.length} selected bookings`}
        >
          {isRejecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {showLabels && <span>Processing...</span>}
            </>
          ) : (
            <>
              <X className="h-4 w-4" />
              {showLabels && <span>{getLabel("Reject All")}</span>}
            </>
          )}
        </Button>
      )}
    </div>
  )
}
