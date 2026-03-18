"use client"

import * as React from "react"
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  BadgeCheck,
  MessageCircle,
  ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TierBadge } from "@/components/worker/tier-badge"
import { WorkerStatsCard, MiniStats, type WorkerStats } from "@/components/workers/worker-stats-card"
import { WorkerBadgesDisplay, WorkerBadgesEmpty } from "@/components/workers/worker-badges-display"
import type { BadgeWithProgress } from "@/lib/badges"
import type { WorkerTier } from "@/lib/supabase/types"

// Public worker profile type matching API response
export interface PublicWorkerProfile {
  id: string
  fullName: string
  avatarUrl: string | null
  bio: string | null
  tier: WorkerTier
  skills: Array<{
    id: string
    name: string
    slug: string
  }>
  stats: WorkerStats
  badges: Array<{
    id: string
    name: string
    slug: string
    icon: string
    description: string
    category: string
    earnedAt?: string
  }>
  achievements: BadgeWithProgress[]
  isAvailable: boolean
  isVerified: boolean
  joinedAt: string
}

export interface PublicWorkerProfileProps {
  worker: PublicWorkerProfile
  isAuthenticated?: boolean
  onBookNow?: () => void
  onBack?: () => void
  className?: string
}

export function PublicWorkerProfile({
  worker,
  isAuthenticated = false,
  onBookNow,
  onBack,
  className
}: PublicWorkerProfileProps) {
  const initials = getInitials(worker.fullName)

  const handleBookNow = () => {
    if (isAuthenticated) {
      onBookNow?.()
    } else {
      // Redirect to login with return URL
      const currentPath = window.location.pathname
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
    }
  }

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Workers
        </button>
      )}

      {/* Main profile card */}
      <Card className="overflow-hidden">
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <CardContent className="relative pt-8 pb-6 px-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg">
                    <AvatarImage 
                      src={worker.avatarUrl || undefined} 
                      alt={worker.fullName} 
                    />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Availability indicator */}
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center",
                    worker.isAvailable 
                      ? "bg-green-500" 
                      : "bg-gray-400"
                  )}>
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  {/* Verified badge */}
                  {worker.isVerified && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center">
                      <BadgeCheck className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name and basic info */}
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold">
                      {worker.fullName}
                    </h1>
                    {worker.isVerified && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                    <TierBadge tier={worker.tier} size="sm" variant="minimal" />
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {formatJoinedDate(worker.joinedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Skills/Tags */}
                {worker.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {worker.skills.map((skill) => (
                      <Badge 
                        key={skill.id} 
                        variant="outline"
                        className="bg-background/50"
                      >
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Availability status */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
                    worker.isAvailable
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      worker.isAvailable ? "bg-green-500" : "bg-gray-400"
                    )} />
                    {worker.isAvailable ? 'Available Now' : 'Currently Unavailable'}
                  </span>
                </div>

                {/* Quick stats */}
                <MiniStats stats={worker.stats} />
              </div>
            </div>
          </CardContent>
        </div>

        {/* Action bar */}
        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {worker.stats.avgRating && (
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < Math.round(worker.stats.avgRating!)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                  <span className="ml-1 text-sm font-medium">
                    {worker.stats.avgRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <Button 
              size="lg" 
              onClick={handleBookNow}
              className="w-full sm:w-auto"
            >
              Book Now
            </Button>
          </div>
        </div>

        {/* Content sections */}
        <div className="p-6 space-y-8">
          {/* Bio section */}
          {worker.bio && (
            <section>
              <h2 className="text-lg font-semibold mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {worker.bio}
              </p>
            </section>
          )}

          <Separator />

          {/* Stats section */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Performance Stats</h2>
            <WorkerStatsCard stats={worker.stats} variant="detailed" />
          </section>

          <Separator />

          {/* Badges & Achievements section */}
          <section>
            {worker.badges.length > 0 || worker.achievements.length > 0 ? (
              <WorkerBadgesDisplay
                badges={worker.badges}
                achievements={worker.achievements}
                variant="grid"
                maxDisplay={12}
              />
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-4">Badges & Achievements</h2>
                <WorkerBadgesEmpty />
              </>
            )}
          </section>
        </div>
      </Card>
    </div>
  )
}

// Compact variant for use in lists or cards
export interface PublicWorkerProfileCompactProps {
  worker: PublicWorkerProfile
  onBookNow?: () => void
  className?: string
}

export function PublicWorkerProfileCompact({
  worker,
  onBookNow,
  className
}: PublicWorkerProfileCompactProps) {
  const initials = getInitials(worker.fullName)

  return (
    <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-14 w-14">
              <AvatarImage src={worker.avatarUrl || undefined} alt={worker.fullName} />
              <AvatarFallback className="bg-primary/10">{initials}</AvatarFallback>
            </Avatar>
            {worker.isAvailable && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{worker.fullName}</h3>
              {worker.isVerified && (
                <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <TierBadge tier={worker.tier} size="sm" variant="minimal" />
            </div>

            {/* Skills */}
            {worker.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {worker.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill.id} variant="outline" className="text-xs">
                    {skill.name}
                  </Badge>
                ))}
                {worker.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{worker.skills.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span>{worker.stats.avgRating?.toFixed(1) || 'N/A'}</span>
                <span className="text-xs">({worker.stats.reviewsCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{worker.stats.jobsCompleted} jobs</span>
              </div>
            </div>

            {/* Book button */}
            <Button 
              size="sm" 
              className="w-full"
              onClick={onBookNow}
            >
              Book Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatJoinedDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  })
}
