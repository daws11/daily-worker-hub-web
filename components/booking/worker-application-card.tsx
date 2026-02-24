"use client"

import * as React from "react"
import { Calendar, Phone, Star, Award } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SkillBadgeChip } from "@/components/badge/skill-badge-display"
import { cn } from "@/lib/utils"
import type { Badge as BadgeType, BadgeVerificationStatus } from "@/lib/types/badge"

type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"

export interface WorkerBadge {
  id: string
  badge_id: string
  verification_status: BadgeVerificationStatus
  badge: BadgeType
}

export interface WorkerApplicationCardProps {
  booking: {
    id: string
    status: BookingStatus
    start_date: string
    end_date: string
    booking_notes?: string
    worker: {
      id: string
      full_name: string
      avatar_url: string
      phone: string
      bio: string
    }
  }
  reliabilityScore?: number
  badges?: WorkerBadge[]
  onSelect?: (bookingId: string) => void
  isSelected?: boolean
}

const statusVariants: Record<BookingStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pending: { variant: "outline", label: "Pending" },
  accepted: { variant: "default", label: "Accepted" },
  rejected: { variant: "destructive", label: "Rejected" },
  in_progress: { variant: "default", label: "In Progress" },
  completed: { variant: "secondary", label: "Completed" },
  cancelled: { variant: "destructive", label: "Cancelled" },
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

export function WorkerApplicationCard({
  booking,
  reliabilityScore,
  badges,
  onSelect,
  isSelected,
}: WorkerApplicationCardProps) {
  const { status, start_date, end_date, booking_notes, worker } = booking
  const statusConfig = statusVariants[status]

  // Filter verified badges for display
  const verifiedBadges = badges?.filter(b => b.verification_status === 'verified') || []
  const hasBadges = verifiedBadges.length > 0

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

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
        onSelect && "cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2",
        hasBadges && "border-l-4 border-l-purple-500"
      )}
      onClick={() => onSelect?.(booking.id)}
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
              <div className="flex items-center gap-2 mt-1">
                <ReliabilityScore score={reliabilityScore} />
              </div>
            </div>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {worker.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{worker.bio}</p>
        )}

        {/* Badges Section */}
        {hasBadges && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">
                Badges ({verifiedBadges.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {verifiedBadges.slice(0, 3).map((wb) => (
                <SkillBadgeChip
                  key={wb.id}
                  badge={wb.badge}
                  verificationStatus={wb.verification_status}
                  size="sm"
                />
              ))}
              {verifiedBadges.length > 3 && (
                <div className="flex items-center px-2 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-md">
                  +{verifiedBadges.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {formatDate(start_date)}
            {end_date && end_date !== start_date && ` - ${formatDate(end_date)}`}
          </span>
        </div>

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

        {booking_notes && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium mb-1">Your Notes:</p>
            <p className="text-sm line-clamp-2">{booking_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
