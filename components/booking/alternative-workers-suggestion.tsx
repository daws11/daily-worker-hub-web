"use client"

import * as React from "react"
import { AlertCircle, Calendar, Phone, Star, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { AlternativeWorker } from "@/lib/supabase/queries/compliance"

export interface AlternativeWorkersSuggestionProps {
  workers: AlternativeWorker[]
  isLoading?: boolean
  onSelectWorker?: (workerId: string) => void
  className?: string
}

function ReliabilityScore({ score }: { score?: number }) {
  if (score === undefined || score === null) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium">No score yet</span>
      </div>
    )
  }

  const clampedScore = Math.max(1, Math.min(5, score))
  const fullStars = Math.floor(clampedScore)
  const hasHalfStar = clampedScore % 1 >= 0.5

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-green-600"
    if (score >= 3.5) return "text-yellow-600"
    if (score >= 2.5) return "text-orange-500"
    return "text-red-500"
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" aria-label={`Reliability score: ${clampedScore} out of 5 stars`}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < fullStars
                ? cn("fill-current", getScoreColor(clampedScore))
                : i === fullStars && hasHalfStar
                  ? cn("fill-current", getScoreColor(clampedScore), "opacity-50")
                  : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
      <span className={cn("text-sm font-semibold", getScoreColor(clampedScore))}>
        {clampedScore.toFixed(1)}
      </span>
    </div>
  )
}

function DaysWorkedBadge({ daysWorked }: { daysWorked: number }) {
  // Get badge variant based on days worked
  const getVariant = (days: number): "default" | "secondary" | "outline" => {
    if (days >= 18) return "default" // Approaching limit
    if (days >= 15) return "outline" // Warning zone
    return "secondary" // Safe zone
  }

  // Get color for different warning levels
  const getColorClass = (days: number) => {
    if (days >= 18) return "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700"
    if (days >= 15) return "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800"
    return ""
  }

  const variant = getVariant(daysWorked)
  const colorClass = getColorClass(daysWorked)

  return (
    <Badge
      variant={variant}
      className={cn(
        "font-medium",
        colorClass
      )}
    >
      {daysWorked} day{daysWorked !== 1 ? "s" : ""} this month
    </Badge>
  )
}

function AlternativeWorkerCard({
  worker,
  onSelect,
}: {
  worker: AlternativeWorker
  onSelect?: (workerId: string) => void
}) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        onSelect && "cursor-pointer"
      )}
      onClick={() => onSelect?.(worker.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={worker.avatar_url} alt={worker.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(worker.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{worker.full_name}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <DaysWorkedBadge daysWorked={worker.daysWorked} />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {worker.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{worker.bio}</p>
        )}

        {worker.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <a
              href={`tel:${worker.phone}`}
              className="hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {worker.phone}
            </a>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground font-medium mb-1">Compliance Status:</p>
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Available for booking this month
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AlternativeWorkersSuggestion({
  workers,
  isLoading = false,
  onSelectWorker,
  className,
}: AlternativeWorkersSuggestionProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Alert>
          <Users className="h-4 w-4" />
          <AlertTitle>Finding Alternative Workers</AlertTitle>
          <AlertDescription>
            Searching for available workers who haven't reached the monthly limit...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!workers || workers.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Alternative Workers Available</AlertTitle>
          <AlertDescription>
            All workers have reached the PP 35/2021 monthly limit for this business. Consider
            scheduling bookings for next month.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          Alternative Workers Available
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Found {workers.length} worker{workers.length !== 1 ? "s" : ""} who{" "}
          {workers.length !== 1 ? "have" : "has"} not reached the monthly limit.
          {workers.length > 0 && ` Workers are sorted by availability.`}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <AlternativeWorkerCard
            key={worker.id}
            worker={worker}
            onSelect={onSelectWorker}
          />
        ))}
      </div>
    </div>
  )
}
