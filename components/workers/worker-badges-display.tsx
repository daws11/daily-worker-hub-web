"use client"

import * as React from "react"
import { Award, ShieldCheck, Star, BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BadgeWithProgress, BADGE_DEFINITIONS } from "@/lib/badges"
import { AchievementBadgeIcon } from "@/components/worker/achievement-badge-icon"

// Types from the API response
export interface WorkerBadge {
  id: string
  name: string
  slug: string
  icon: string
  description: string
  category: string
  earnedAt?: string
}

export interface WorkerBadgesDisplayProps {
  badges: WorkerBadge[]
  achievements?: BadgeWithProgress[]
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact' | 'grid'
  className?: string
}

export function WorkerBadgesDisplay({
  badges,
  achievements = [],
  maxDisplay = 6,
  size = 'md',
  variant = 'default',
  className
}: WorkerBadgesDisplayProps) {
  // Combine certification badges and achievements
  const allBadges = [
    ...badges.map(b => ({
      type: 'certification' as const,
      badge: b
    })),
    ...achievements.filter(a => a.earned).map(a => ({
      type: 'achievement' as const,
      badge: a
    }))
  ]

  const displayBadges = allBadges.slice(0, maxDisplay)
  const remainingCount = allBadges.length - maxDisplay

  if (allBadges.length === 0) {
    return null
  }

  if (variant === 'grid') {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Award className="h-4 w-4" />
          Badges & Achievements
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allBadges.map((item, index) => (
            <BadgeCard 
              key={`${item.type}-${index}`}
              badge={item.badge}
              type={item.type}
              size={size}
            />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className={cn("flex flex-wrap gap-2 items-center", className)}>
          {displayBadges.map((item, index) => (
            <Tooltip key={`${item.type}-${index}`}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  {item.type === 'certification' ? (
                    <CertificationBadgeIcon 
                      badge={item.badge as WorkerBadge} 
                      size={size} 
                    />
                  ) : (
                    <AchievementBadgeIcon
                      type={(item.badge as BadgeWithProgress).type}
                      tier={(item.badge as BadgeWithProgress).tier}
                      earned={true}
                      size={size}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{getBadgeName(item.badge, item.type)}</p>
                {getBadgeDescription(item.badge, item.type) && (
                  <p className="text-xs text-muted-foreground max-w-[200px]">
                    {getBadgeDescription(item.badge, item.type)}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <div className={cn(
              "flex items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground",
              size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
            )}>
              +{remainingCount}
            </div>
          )}
        </div>
      </TooltipProvider>
    )
  }

  // Default variant - horizontal list with tooltips
  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" />
          Badges ({allBadges.length})
        </h3>
        <div className="flex flex-wrap gap-3">
          {displayBadges.map((item, index) => (
            <Tooltip key={`${item.type}-${index}`}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors cursor-default">
                  {item.type === 'certification' ? (
                    <CertificationBadgeIcon 
                      badge={item.badge as WorkerBadge} 
                      size="sm" 
                    />
                  ) : (
                    <AchievementBadgeIcon
                      type={(item.badge as BadgeWithProgress).type}
                      tier={(item.badge as BadgeWithProgress).tier}
                      earned={true}
                      size="sm"
                    />
                  )}
                  <span className="text-xs font-medium">
                    {getBadgeName(item.badge, item.type)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">{getBadgeName(item.badge, item.type)}</p>
                {getBadgeDescription(item.badge, item.type) && (
                  <p className="text-xs text-muted-foreground max-w-[200px]">
                    {getBadgeDescription(item.badge, item.type)}
                  </p>
                )}
                {getEarnedDate(item.badge, item.type) && (
                  <p className="text-xs text-green-600 mt-1">
                    Earned {getEarnedDate(item.badge, item.type)}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
              +{remainingCount} more
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Badge Card for grid variant
interface BadgeCardProps {
  badge: WorkerBadge | BadgeWithProgress
  type: 'certification' | 'achievement'
  size?: 'sm' | 'md' | 'lg'
}

function BadgeCard({ badge, type, size = 'md' }: BadgeCardProps) {
  const name = getBadgeName(badge, type)
  const description = getBadgeDescription(badge, type)
  const earnedDate = getEarnedDate(badge, type)

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className="flex-shrink-0">
        {type === 'certification' ? (
          <CertificationBadgeIcon badge={badge as WorkerBadge} size={size} />
        ) : (
          <AchievementBadgeIcon
            type={(badge as BadgeWithProgress).type}
            tier={(badge as BadgeWithProgress).tier}
            earned={true}
            size={size}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {description}
          </p>
        )}
        {earnedDate && (
          <p className="text-xs text-green-600 mt-1">
            Earned {earnedDate}
          </p>
        )}
      </div>
    </div>
  )
}

// Certification Badge Icon
interface CertificationBadgeIconProps {
  badge: WorkerBadge
  size?: 'sm' | 'md' | 'lg'
}

function CertificationBadgeIcon({ badge, size = 'md' }: CertificationBadgeIconProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  // Get icon based on category
  const IconComponent = getIconForCategory(badge.category)

  // Get color based on category
  const colorClasses = getColorForCategory(badge.category)

  return (
    <div className={cn(
      "rounded-full flex items-center justify-center",
      sizeClasses[size],
      colorClasses
    )}>
      <IconComponent className={cn(iconSizes[size], "text-current")} />
    </div>
  )
}

// Helper functions
function getBadgeName(badge: WorkerBadge | BadgeWithProgress, type: 'certification' | 'achievement'): string {
  return badge.name
}

function getBadgeDescription(badge: WorkerBadge | BadgeWithProgress, type: 'certification' | 'achievement'): string | undefined {
  return badge.description
}

function getEarnedDate(badge: WorkerBadge | BadgeWithProgress, type: 'certification' | 'achievement'): string | undefined {
  const date = 'earnedAt' in badge ? badge.earnedAt : undefined
  if (!date) return undefined
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short'
  })
}

function getIconForCategory(category: string): React.ElementType {
  switch (category?.toLowerCase()) {
    case 'certification':
      return BadgeCheck
    case 'safety':
      return ShieldCheck
    case 'quality':
      return Star
    default:
      return Award
  }
}

function getColorForCategory(category: string): string {
  switch (category?.toLowerCase()) {
    case 'certification':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    case 'safety':
      return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
    case 'quality':
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
    default:
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
  }
}

// Empty state component
export function WorkerBadgesEmpty({ className }: { className?: string }) {
  return (
    <div className={cn("text-center py-6", className)}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
        <Award className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No badges yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Complete jobs to earn badges
      </p>
    </div>
  )
}
