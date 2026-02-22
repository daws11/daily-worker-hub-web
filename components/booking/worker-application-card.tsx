"use client"

import * as React from "react"
import { Calendar, Phone } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReliabilityScore, NewWorkerBadge } from "@/components/worker/reliability-score"
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
  completedJobs?: number
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

export function WorkerApplicationCard({
  booking,
  reliabilityScore,
  completedJobs,
  onSelect,
  isSelected,
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
                {completedJobs !== undefined && completedJobs < 5 ? (
                  <NewWorkerBadge completedJobs={completedJobs} />
                ) : reliabilityScore !== undefined && reliabilityScore !== null ? (
                  <ReliabilityScore score={reliabilityScore} />
                ) : (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium">No score yet</span>
                  </div>
                )}
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
