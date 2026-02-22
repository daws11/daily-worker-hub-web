"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ComplianceStatus, ComplianceStatusResult } from "@/lib/supabase/queries/compliance"

export interface ComplianceStatusBadgeProps {
  compliance: ComplianceStatusResult
  showDays?: boolean
  showIcon?: boolean
  size?: "sm" | "md"
  className?: string
}

type ComplianceStatusVariant = {
  variant: "default" | "secondary" | "destructive" | "outline"
  label: string
  icon: React.ReactNode
}

const statusVariants: Record<ComplianceStatus, ComplianceStatusVariant> = {
  ok: {
    variant: "outline",
    label: "Compliant",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  warning: {
    variant: "default",
    label: "Warning",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  blocked: {
    variant: "destructive",
    label: "Blocked",
    icon: <XCircle className="h-3 w-3" />,
  },
}

export function ComplianceStatusBadge({
  compliance,
  showDays = true,
  showIcon = true,
  size = "sm",
  className,
}: ComplianceStatusBadgeProps) {
  const { status, daysWorked } = compliance
  const statusConfig = statusVariants[status]

  // Custom styling for warning state (amber/yellow)
  const warningStyles =
    status === "warning"
      ? "border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-100"
      : undefined

  // Size variants
  const sizeStyles = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"

  return (
    <Badge
      variant={statusConfig.variant}
      className={cn(
        "flex items-center gap-1.5 font-medium",
        sizeStyles,
        warningStyles,
        className
      )}
    >
      {showIcon && statusConfig.icon}
      <span>{statusConfig.label}</span>
      {showDays && (
        <span className="text-xs opacity-75">
          ({daysWorked}/21)
        </span>
      )}
    </Badge>
  )
}
