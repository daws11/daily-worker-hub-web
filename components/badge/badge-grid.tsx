import * as React from "react"
import { Award, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SkillBadgeIcon } from "./skill-badge-display"
import type { Badge, BadgeVerificationStatus } from "@/lib/types/badge"

export interface BadgeWithStatus extends Badge {
  verificationStatus?: BadgeVerificationStatus
  verifiedAt?: string | null
}

export interface BadgeGridProps extends React.HTMLAttributes<HTMLDivElement> {
  badges: BadgeWithStatus[]
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  showVerificationStatus?: boolean
  onBadgeClick?: (badge: BadgeWithStatus) => void
  cardClassName?: string
}

const gridVariants = {
  sm: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  md: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  lg: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
}

export type BadgeGridSize = keyof typeof gridVariants

export interface BadgeGridWithSizeProps extends BadgeGridProps {
  size?: BadgeGridSize
}

const categoryColors: Record<Badge['category'], string> = {
  skill: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  training: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  certification: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  specialization: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
}

const categoryLabels: Record<Badge['category'], string> = {
  skill: "Skill",
  training: "Training",
  certification: "Certification",
  specialization: "Specialization",
}

function BadgeGridCard({
  badge,
  onClick,
  cardClassName,
}: {
  badge: BadgeWithStatus
  onClick?: () => void
  cardClassName?: string
}) {
  const CardWrapper = onClick ? "button" : "div"
  const isInteractive = !!onClick

  return (
    <CardWrapper
      className={cardClassName}
      onClick={onClick}
      {...(isInteractive && {
        type: "button",
        "aria-label": `View details for ${badge.name}`,
      })}
    >
      <Card
        className={cn(
          "transition-all hover:shadow-md",
          isInteractive && "cursor-pointer hover:border-primary/50",
          badge.verificationStatus === "verified" && "border-green-200 dark:border-green-800",
          badge.verificationStatus === "pending" && "border-yellow-200 dark:border-yellow-800",
          badge.verificationStatus === "rejected" && "border-red-200 dark:border-red-800"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <SkillBadgeIcon
              badge={badge}
              verificationStatus={badge.verificationStatus}
              size="md"
              showLabel={false}
              className="flex-shrink-0"
            />
            <div className="flex flex-col items-end gap-1.5">
              {badge.is_certified && (
                <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  <Award className="h-3 w-3" />
                  Certified
                </div>
              )}
              <div
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  categoryColors[badge.category]
                )}
              >
                {categoryLabels[badge.category]}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <CardTitle className="text-base leading-tight">{badge.name}</CardTitle>
          {badge.description && (
            <CardDescription className="line-clamp-2 text-xs">
              {badge.description}
            </CardDescription>
          )}
          {badge.verifiedAt && badge.verificationStatus === "verified" && (
            <p className="text-xs text-muted-foreground">
              Verified on {new Date(badge.verifiedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  )
}

function EmptyState({
  message,
  description,
}: {
  message: string
  description?: string
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <Award className="mb-4 h-16 w-16 text-muted-foreground/30" />
      <h3 className="text-lg font-semibold text-foreground">{message}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading badges...</p>
      </div>
    </div>
  )
}

export function BadgeGrid({
  badges,
  loading = false,
  emptyMessage = "No badges found",
  emptyDescription = "Check back later for new badges or adjust your filters.",
  showVerificationStatus = true,
  onBadgeClick,
  cardClassName,
  size = "md",
  className,
  ...props
}: BadgeGridWithSizeProps) {
  if (loading) {
    return <LoadingState />
  }

  if (badges.length === 0) {
    return <EmptyState message={emptyMessage} description={emptyDescription} />
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        gridVariants[size],
        className
      )}
      {...props}
    >
      {badges.map((badge) => (
        <BadgeGridCard
          key={badge.id}
          badge={badge}
          onClick={onBadgeClick ? () => onBadgeClick(badge) : undefined}
          cardClassName={cardClassName}
        />
      ))}
    </div>
  )
}

BadgeGrid.displayName = "BadgeGrid"
