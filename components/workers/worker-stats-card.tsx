"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Briefcase, 
  Star, 
  Calendar, 
  Clock,
  TrendingUp,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface WorkerStats {
  jobsCompleted: number
  avgRating: number | null
  reviewsCount: number
  yearsOfExperience: number
}

export interface WorkerStatsCardProps {
  stats: WorkerStats
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
}

export function WorkerStatsCard({ 
  stats, 
  className,
  variant = 'default' 
}: WorkerStatsCardProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-wrap gap-4", className)}>
        <StatItemCompact
          icon={Briefcase}
          label="Jobs"
          value={stats.jobsCompleted}
        />
        <StatItemCompact
          icon={Star}
          label="Rating"
          value={stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}
        />
        <StatItemCompact
          icon={Users}
          label="Reviews"
          value={stats.reviewsCount}
        />
        <StatItemCompact
          icon={Calendar}
          label="Experience"
          value={formatExperience(stats.yearsOfExperience)}
        />
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <StatItemDetailed
              icon={Briefcase}
              label="Jobs Completed"
              value={stats.jobsCompleted}
              description="Successfully finished jobs"
            />
            <StatItemDetailed
              icon={Star}
              label="Average Rating"
              value={stats.avgRating ? `${stats.avgRating.toFixed(1)} / 5.0` : 'No ratings yet'}
              description={stats.reviewsCount > 0 
                ? `Based on ${stats.reviewsCount} review${stats.reviewsCount !== 1 ? 's' : ''}`
                : 'Complete jobs to get rated'
              }
              highlight={!!stats.avgRating && stats.avgRating >= 4.5}
            />
            <StatItemDetailed
              icon={Users}
              label="Reviews Received"
              value={stats.reviewsCount}
              description="Feedback from businesses"
            />
            <StatItemDetailed
              icon={Calendar}
              label="Experience"
              value={formatExperience(stats.yearsOfExperience)}
              description="Time on platform"
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      <StatItemDefault
        icon={Briefcase}
        label="Jobs Completed"
        value={stats.jobsCompleted}
      />
      <StatItemDefault
        icon={Star}
        label="Rating"
        value={stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}
        highlight={!!stats.avgRating && stats.avgRating >= 4.5}
      />
      <StatItemDefault
        icon={Users}
        label="Reviews"
        value={stats.reviewsCount}
      />
      <StatItemDefault
        icon={Calendar}
        label="Experience"
        value={formatExperience(stats.yearsOfExperience)}
      />
    </div>
  )
}

// Stat Item Variants

interface StatItemProps {
  icon: React.ElementType
  label: string
  value: string | number
  highlight?: boolean
}

function StatItemDefault({ icon: Icon, label, value, highlight }: StatItemProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 text-center">
      <Icon className={cn(
        "h-5 w-5 mb-2",
        highlight ? "text-yellow-500" : "text-muted-foreground"
      )} />
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  )
}

function StatItemCompact({ icon: Icon, label, value }: StatItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="font-semibold text-sm">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

interface StatItemDetailedProps extends StatItemProps {
  description?: string
}

function StatItemDetailed({ 
  icon: Icon, 
  label, 
  value, 
  description,
  highlight 
}: StatItemDetailedProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full",
        highlight ? "bg-yellow-100 text-yellow-600" : "bg-muted"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={cn(
          "text-lg font-semibold",
          highlight && "text-yellow-600"
        )}>
          {value}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function
function formatExperience(years: number): string {
  if (years === 0) {
    return '< 1 year'
  }
  if (years === 1) {
    return '1 year'
  }
  return `${years} years`
}

// Mini Stats for inline display
export interface MiniStatsProps {
  stats: WorkerStats
  className?: string
}

export function MiniStats({ stats, className }: MiniStatsProps) {
  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="font-medium">
          {stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}
        </span>
        <span className="text-muted-foreground">
          ({stats.reviewsCount})
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <span>{stats.jobsCompleted} jobs</span>
      </div>
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span>{formatExperience(stats.yearsOfExperience)}</span>
      </div>
    </div>
  )
}
