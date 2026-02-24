"use client"

import * as React from "react"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/hooks"

type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"

export interface BookingActionsProps {
  bookingId: string
  status: BookingStatus
  onAccept?: (bookingId: string) => Promise<void> | void
  onReject?: (bookingId: string) => Promise<void> | void
  isLoading?: boolean
  disabled?: boolean
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline" | "ghost"
  className?: string
  showLabels?: boolean
}

export function BookingActions({
  bookingId,
  status,
  onAccept,
  onReject,
  isLoading = false,
  disabled = false,
  size = "default",
  variant = "default",
  className,
  showLabels = true,
}: BookingActionsProps) {
  const { t } = useTranslation()
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

  const isPending = status === "pending"
  const isActionDisabled = disabled || isLoading || !isPending

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
          disabled={isActionDisabled}
          aria-label={t('bookings.accept', { bookingId })}
        >
          {isAccepting ? (
            <>{t('common.processing')}</>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {showLabels && <span>{t('bookings.accept')}</span>}
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
          aria-label={t('bookings.reject', { bookingId })}
        >
          {isRejecting ? (
            <>{t('common.processing')}</>
          ) : (
            <>
              <X className="h-4 w-4" />
              {showLabels && <span>{t('bookings.reject')}</span>}
            </>
          )}
        </Button>
      )}
    </div>
  )
}
