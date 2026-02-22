"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ComplianceStatusResult } from "@/lib/supabase/queries/compliance"

export interface ComplianceWarningBannerProps {
  className?: string
  compliance: ComplianceStatusResult
  onViewAlternatives?: () => void
}

export function ComplianceWarningBanner({
  className,
  compliance,
  onViewAlternatives,
}: ComplianceWarningBannerProps) {
  // Don't render if status is 'ok' (no warning needed)
  if (compliance.status === "ok") {
    return null
  }

  const isBlocked = compliance.status === "blocked"
  const daysRemaining = 21 - compliance.daysWorked

  // Styles for blocked state (red/destructive)
  const blockedStyles = "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
  const blockedTextStyles = "text-red-900 dark:text-red-100"
  const blockedSubtextStyles = "text-red-700 dark:text-red-300"
  const blockedButtonStyles =
    "bg-red-900 text-red-50 hover:bg-red-800 dark:bg-red-100 dark:text-red-900 dark:hover:bg-red-200"
  const blockedGhostStyles =
    "text-red-900 hover:bg-red-100 dark:text-red-100 dark:hover:bg-red-900"

  // Styles for warning state (amber/yellow)
  const warningStyles = "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
  const warningTextStyles = "text-amber-900 dark:text-amber-100"
  const warningSubtextStyles = "text-amber-700 dark:text-amber-300"
  const warningButtonStyles =
    "bg-amber-900 text-amber-50 hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-900 dark:hover:bg-amber-200"
  const warningGhostStyles =
    "text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900"

  const styles = isBlocked ? blockedStyles : warningStyles
  const textStyles = isBlocked ? blockedTextStyles : warningTextStyles
  const subtextStyles = isBlocked ? blockedSubtextStyles : warningSubtextStyles
  const buttonStyles = isBlocked ? blockedButtonStyles : warningButtonStyles
  const ghostStyles = isBlocked ? blockedGhostStyles : warningGhostStyles

  return (
    <div className={cn("rounded-md border p-4", styles, className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className={cn("text-sm font-medium", textStyles)}>
            {isBlocked ? (
              <>
                PP 35/2021 Limit Reached ({compliance.daysWorked}/21 days)
              </>
            ) : (
              <>
                Approaching PP 35/2021 Limit ({compliance.daysWorked}/21 days)
              </>
            )}
          </p>
          <p className={cn("mt-1 text-xs", subtextStyles)}>
            {isBlocked ? (
              <>
                Worker has reached the monthly limit. Cannot accept more bookings
                this month. Consider alternative workers.
              </>
            ) : (
              <>
                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                before limit. Booking will be blocked at 21 days.
              </>
            )}
          </p>
        </div>
        {onViewAlternatives && (
          <div className="flex gap-2 sm:self-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onViewAlternatives}
              className={ghostStyles}
            >
              View Alternatives
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
