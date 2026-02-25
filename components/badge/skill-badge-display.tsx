import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Award, Clock, XCircle, CheckCircle2 } from "lucide-react"
import * as LucideIcons from "lucide-react"

import { cn } from "@/lib/utils"
import type { Badge, BadgeVerificationStatus } from "@/lib/types/badge"

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
  {
    variants: {
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-2 text-sm",
        lg: "px-4 py-3 text-base",
      },
      status: {
        pending:
          "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/30 dark:bg-yellow-900/20 dark:text-yellow-400",
        verified:
          "border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400",
        rejected:
          "border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400",
        default:
          "border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
      variant: {
        default: "",
        outline: "bg-transparent",
        ghost: "border-transparent bg-transparent",
      },
    },
    defaultVariants: {
      size: "md",
      status: "default",
      variant: "default",
    },
  }
)

const statusIcons: Record<BadgeVerificationStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  verified: CheckCircle2,
  rejected: XCircle,
}

export interface SkillBadgeDisplayProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  badge: Badge
  verificationStatus?: BadgeVerificationStatus
  showIcon?: boolean
  showDescription?: boolean
  showStatus?: boolean
  verifiedAt?: string | null
}

// Dynamic icon component from string name
const DynamicIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName]

  if (!IconComponent || typeof IconComponent !== 'function') {
    return <Award className={className} />
  }

  const Icon = IconComponent as React.ComponentType<{ className?: string }>
  return <Icon className={className} />
}

export function SkillBadgeDisplay({
  badge,
  verificationStatus,
  size = "md",
  variant = "default",
  showIcon = true,
  showDescription = false,
  showStatus = true,
  verifiedAt,
  className,
  ...props
}: SkillBadgeDisplayProps) {
  // Determine status based on verificationStatus
  const displayStatus = verificationStatus || "default"

  // Get status icon
  const StatusIcon = verificationStatus ? statusIcons[verificationStatus] : null

  // Format verified date
  const formatVerifiedDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(badgeVariants({ size, status: displayStatus, variant }))}
        {...props}
      >
        {/* Badge icon */}
        {showIcon && (
          <DynamicIcon
            iconName={badge.icon}
            className={cn(
              "h-4 w-4 flex-shrink-0",
              size === "sm" && "h-3 w-3",
              size === "lg" && "h-5 w-5"
            )}
          />
        )}

        {/* Badge name */}
        <span className="font-medium">{badge.name}</span>

        {/* Status icon */}
        {showStatus && verificationStatus && StatusIcon && (
          <StatusIcon
            className={cn(
              "h-3.5 w-3.5 flex-shrink-0",
              size === "sm" && "h-3 w-3",
              size === "lg" && "h-4 w-4"
            )}
          />
        )}

        {/* Certified badge indicator */}
        {badge.is_certified && !verificationStatus && (
          <CheckCircle2
            className={cn(
              "h-3.5 w-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400",
              size === "sm" && "h-3 w-3",
              size === "lg" && "h-4 w-4"
            )}
            aria-label="Certified badge"
          />
        )}
      </div>

      {/* Badge description */}
      {showDescription && badge.description && (
        <p className={cn(
          "text-muted-foreground",
          size === "sm" && "text-xs",
          size === "md" && "text-xs",
          size === "lg" && "text-sm"
        )}>
          {badge.description}
        </p>
      )}

      {/* Verified date */}
      {verifiedAt && verificationStatus === "verified" && (
        <p className="text-xs text-muted-foreground">
          Verified on {formatVerifiedDate(verifiedAt)}
        </p>
      )}
    </div>
  )
}

// Compact version for inline display (e.g., in cards)
export interface SkillBadgeChipProps {
  badge: Badge
  verificationStatus?: BadgeVerificationStatus
  size?: "sm" | "md" | "lg"
  className?: string
}

export function SkillBadgeChip({
  badge,
  verificationStatus,
  size = "sm",
  className,
}: SkillBadgeChipProps) {
  return (
    <SkillBadgeDisplay
      badge={badge}
      verificationStatus={verificationStatus}
      size={size}
      variant="outline"
      showIcon={size !== "sm"}
      showDescription={false}
      showStatus={verificationStatus !== undefined}
      className={className}
    />
  )
}

// Badge icon only (for use in grids/lists)
export interface SkillBadgeIconProps {
  badge: Badge
  verificationStatus?: BadgeVerificationStatus
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const iconSizeVariants = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
}

const iconContainerVariants = {
  sm: "p-1.5",
  md: "p-2.5",
  lg: "p-3.5",
}

export function SkillBadgeIcon({
  badge,
  verificationStatus,
  size = "md",
  showLabel = true,
  className,
}: SkillBadgeIconProps) {
  const getStatusColor = () => {
    if (verificationStatus === "verified") {
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
    }
    if (verificationStatus === "pending") {
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
    }
    if (verificationStatus === "rejected") {
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
    }
    return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
  }

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div
        className={cn(
          "rounded-lg border",
          iconContainerVariants[size],
          getStatusColor()
        )}
      >
        <DynamicIcon
          iconName={badge.icon}
          className={cn(iconSizeVariants[size])}
        />
      </div>
      {showLabel && (
        <span className={cn(
          "text-center font-medium",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base"
        )}>
          {badge.name}
        </span>
      )}
    </div>
  )
}
