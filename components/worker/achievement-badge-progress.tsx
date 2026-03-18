"use client"

import * as React from "react"
import { Award, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { AchievementBadgeIcon } from "./achievement-badge-icon"
import type { BadgeWithProgress } from "@/lib/badges"

export interface AchievementBadgeProgressProps {
  badges: BadgeWithProgress[]
  loading?: boolean
  maxDisplay?: number
  className?: string
  onViewAll?: () => void
}

export function AchievementBadgeProgress({
  badges,
  loading = false,
  maxDisplay = 3,
  className,
  onViewAll
}: AchievementBadgeProgressProps) {
  // Filter to only show unearned badges with progress
  const inProgressBadges = badges
    .filter(b => !b.earned && b.progress && b.progress.percentage > 0)
    .sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0))
    .slice(0, maxDisplay)

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Badge Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (inProgressBadges.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Badge Progress</CardTitle>
          <CardDescription>
            Complete jobs to start earning badges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Award className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No badges in progress yet
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Badge Progress</CardTitle>
            <CardDescription>
              Keep going! You're making progress
            </CardDescription>
          </div>
          {onViewAll && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewAll}
              className="text-primary"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {inProgressBadges.map((badge) => (
          <BadgeProgressBar key={badge.type} badge={badge} />
        ))}
      </CardContent>
    </Card>
  )
}

export interface BadgeProgressBarProps {
  badge: BadgeWithProgress
  className?: string
}

export function BadgeProgressBar({ badge, className }: BadgeProgressBarProps) {
  const progress = badge.progress!

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AchievementBadgeIcon
        type={badge.type}
        tier={badge.tier}
        earned={false}
        size="sm"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{badge.name}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {progress.current}/{progress.target}
          </span>
        </div>
        
        <div className="relative">
          <Progress 
            value={progress.percentage} 
            className="h-2"
          />
        </div>
        
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {badge.criteria}
        </p>
      </div>
    </div>
  )
}

export interface BadgeProgressListProps {
  badges: BadgeWithProgress[]
  loading?: boolean
  className?: string
}

export function BadgeProgressList({ badges, loading, className }: BadgeProgressListProps) {
  const inProgressBadges = badges
    .filter(b => !b.earned && b.progress && b.progress.percentage > 0)
    .sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0))

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-2 bg-muted rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (inProgressBadges.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">All badges earned!</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {inProgressBadges.map((badge) => (
        <BadgeProgressBar key={badge.type} badge={badge} />
      ))}
    </div>
  )
}
