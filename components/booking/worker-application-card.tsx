"use client"

import * as React from "react"
import { Calendar, Phone, Star, X } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { WorkerCancellationDialog } from "./worker-cancellation-dialog"
import { cn } from "@/lib/utils"

type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"

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
  onSelect?: (bookingId: string) => void
  isSelected?: boolean
  onCancelBooking?: (bookingId: string, notes: string) => Promise<void> | void
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
  onSelect,
  isSelected,
  onCancelBooking,
}: WorkerApplicationCardProps) {
  const { status, start_date, end_date, booking_notes, worker } = booking
  const statusConfig = statusVariants[status]

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

  const canCancel = status === "accepted" && onCancelBooking

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        onSelect && "cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2"
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
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            {canCancel && (
              <WorkerCancellationDialog
                bookingId={booking.id}
                workerName={worker.full_name}
                onCancel={onCancelBooking}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {worker.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{worker.bio}</p>
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
