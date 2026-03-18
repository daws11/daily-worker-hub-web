"use client"

import * as React from "react"
import { Award, Lock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AchievementBadgeIcon } from "./achievement-badge-icon"
import type { BadgeWithProgress } from "@/lib/badges"

export interface AchievementBadgeGridProps {
  badges: BadgeWithProgress[]
  loading?: boolean
  showProgress?: boolean
  showUnearned?: boolean
  columns?: 2 | 3 | 4 | 5
  emptyMessage?: string
  emptyDescription?: string
  onBadgeClick?: (badge: BadgeWithProgress) => void
  className?: string
}

const columnClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
}

export function AchievementBadgeGrid({
  badges,
  loading = false,
  showProgress = true,
  showUnearned = true,
  columns = 4,
  emptyMessage = "No badges yet",
  emptyDescription = "Complete jobs to earn achievement badges",
  onBadgeClick,
  className
}: AchievementBadgeGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const displayBadges = showUnearned ? badges : badges.filter(b => b.earned)

  if (displayBadges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Award className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{emptyMessage}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {displayBadges.map((badge) => (
        <AchievementBadgeCard
          key={badge.type}
          badge={badge}
          showProgress={showProgress}
          onClick={onBadgeClick ? () => onBadgeClick(badge) : undefined}
        />
      ))}
    </div>
  )
}

export interface AchievementBadgeCardProps {
  badge: BadgeWithProgress
  showProgress?: boolean
  onClick?: () => void
  className?: string
}

export function AchievementBadgeCard({
  badge,
  showProgress = true,
  onClick,
  className
}: AchievementBadgeCardProps) {
  const isClickable = !!onClick

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        badge.earned && "border-primary/20 hover:border-primary/40",
        !badge.earned && "opacity-75 hover:opacity-100",
        isClickable && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AchievementBadgeIcon
            type={badge.type}
            tier={badge.tier}
            earned={badge.earned}
            size="lg"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={cn(
                "font-semibold text-sm truncate",
                !badge.earned && "text-muted-foreground"
              )}>
                {badge.name}
              </h4>
              {!badge.earned && (
                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {badge.description}
            </p>
            
            {badge.earned && badge.earnedAt && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Earned {new Date(badge.earnedAt).toLocaleDateString()}
              </p>
            )}
            
            {showProgress && !badge.earned && badge.progress && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{badge.progress.percentage}%</span>
                </div>
                <Progress 
                  value={badge.progress.percentage} 
                  className="h-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {badge.progress.current} / {badge.progress.target}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export interface AchievementBadgeMiniGridProps {
  badges: BadgeWithProgress[]
  maxDisplay?: number
  size?: 'sm' | 'md'
  className?: string
}

export function AchievementBadgeMiniGrid({
  badges,
  maxDisplay = 6,
  size = 'md',
  className
}: AchievementBadgeMiniGridProps) {
  const earnedBadges = badges.filter(b => b.earned)
  const displayBadges = earnedBadges.slice(0, maxDisplay)
  const remainingCount = earnedBadges.length - maxDisplay

  return (
    <div className={cn("flex flex-wrap gap-2 items-center", className)}>
      {displayBadges.map((badge) => (
        <div key={badge.type} className="group relative">
          <AchievementBadgeIcon
            type={badge.type}
            tier={badge.tier}
            earned={true}
            size={size}
          />
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <div className="bg-popover text-popover-foreground rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-md">
              {badge.name}
            </div>
          </div>
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className={cn(
          "flex items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground",
          size === 'sm' ? 'w-8 h-8' : 'w-12 h-12'
        )}>
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
