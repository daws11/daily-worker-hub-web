"use client"

import * as React from "react"
import { MapPin, Phone, Mail, Star, Briefcase, MessageSquare } from "lucide-react"

import { cn } from "@/lib/utils"
import { KycStatusBadge } from "@/components/worker/kyc-status-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { WorkerManagementItem } from "@/lib/types/admin"

interface WorkerCardProps extends React.HTMLAttributes<HTMLDivElement> {
  worker: WorkerManagementItem
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function WorkerCard({ worker, className, ...props }: WorkerCardProps) {
  const formatDate = React.useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={worker.avatar_url || undefined} alt={worker.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(worker.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl truncate">{worker.full_name}</CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{worker.location_name || "No location"}</span>
              </CardDescription>
            </div>
          </div>
          <KycStatusBadge status={worker.kyc_status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {worker.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {worker.bio}
          </p>
        )}

        <div className="space-y-2 text-sm">
          {worker.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground line-clamp-1">{worker.address}</span>
            </div>
          )}
          {worker.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={`tel:${worker.phone}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {worker.phone}
              </a>
            </div>
          )}
          {worker.user?.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={`mailto:${worker.user.email}`}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {worker.user.email}
              </a>
            </div>
          )}
        </div>

        {worker.experience_years !== null && worker.experience_years !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {worker.experience_years} {worker.experience_years === 1 ? "year" : "years"} experience
            </span>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm pt-2 border-t">
          {worker.bookingCount !== undefined && worker.bookingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {worker.bookingCount} {worker.bookingCount === 1 ? "booking" : "bookings"}
              </span>
            </div>
          )}
          {worker.reviewCount !== undefined && worker.reviewCount > 0 && (
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {worker.reviewCount} {worker.reviewCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
          {worker.averageRating !== undefined && worker.averageRating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{worker.averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Reliability Score:</span>
            <span className="font-medium">{worker.reliability_score.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Joined:</span>
            <span className="font-medium">{formatDate(worker.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { WorkerCard }
