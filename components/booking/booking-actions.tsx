"use client"

import * as React from "react"
import { Check, X, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ComplianceStatusResult } from "@/lib/supabase/queries/compliance"

type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"

export interface BookingActionsProps {
  bookingId: string
  status: BookingStatus
  onAccept?: (bookingId: string) => Promise<void> | void
  onReject?: (bookingId: string) => Promise<void> | void
  isLoading?: boolean
  disabled?: boolean
  complianceStatus?: ComplianceStatusResult | null
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline" | "ghost"
  className?: string
  showLabels?: boolean
  // Review-related props
  hasExistingReview?: boolean
  onWriteReview?: () => void
}

export function BookingActions({
  bookingId,
  status,
  onAccept,
  onReject,
  isLoading = false,
  disabled = false,
  complianceStatus,
  size = "default",
  variant = "default",
  className,
  showLabels = true,
  hasExistingReview = false,
  onWriteReview,
}: BookingActionsProps) {
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

  const isPending = status === "pending"
  const isComplianceBlocked = complianceStatus?.status === "blocked"
  const isCompleted = status === "completed"
  const isActionDisabled = disabled || isLoading || !isPending
  const isAcceptDisabled = isActionDisabled || isComplianceBlocked
  const canWriteReview = isCompleted && !hasExistingReview && onWriteReview

  const handleAccept = async () => {
    if (isActionDisabled || !onAccept) return

    setIsAccepting(true)
    try {
      await onAccept(bookingId)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleReject = async () => {
    if (isActionDisabled || !onReject) return

    setIsRejecting(true)
    try {
      await onReject(bookingId)
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {onAccept && (
        <Button
          variant={getAcceptVariant()}
          size={getButtonSize()}
          onClick={handleAccept}
          disabled={isAcceptDisabled}
          aria-label={`Accept booking ${bookingId}`}
        >
          {isAccepting ? (
            <>Processing...</>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {showLabels && <span>Accept</span>}
            </>
          )}
        </Button>
      )}

      {onReject && (
        <Button
          variant={getRejectVariant()}
          size={getButtonSize()}
          onClick={handleReject}
          disabled={isActionDisabled}
          aria-label={`Reject booking ${bookingId}`}
        >
          {isRejecting ? (
            <>Processing...</>
          ) : (
            <>
              <X className="h-4 w-4" />
              {showLabels && <span>Reject</span>}
            </>
          )}
        </Button>
      )}

      {canWriteReview && (
        <Button
          variant="outline"
          size={getButtonSize()}
          onClick={onWriteReview}
          disabled={disabled || isLoading}
          aria-label={`Write review for booking ${bookingId}`}
        >
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          {showLabels && <span>Tulis Ulasan</span>}
        </Button>
      )}
    </div>
  )
}
