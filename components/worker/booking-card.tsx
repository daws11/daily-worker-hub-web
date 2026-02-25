"use client"

import * as React from "react"
import { Calendar, Clock, MapPin, DollarSign, Building2, CheckCircle, Star, MessageSquare } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookingStatusBadge, type BookingStatus } from "@/components/worker/booking-status-badge"
import { CancelBookingDialog } from "@/components/worker/cancel-booking-dialog"
import { ReliabilityScore } from "@/components/worker/reliability-score"

export interface BookingJob {
  id: string
  title: string
  description: string
  address: string
}

export interface BookingBusiness {
  id: string
  name: string
  is_verified: boolean
}

export interface BusinessRatingSummary {
  averageRating: number | null
  reviewCount: number
}

export interface Booking {
  id: string
  job_id: string
  business_id: string
  status: "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"
  start_date: string
  end_date: string
  final_price: number
  created_at: string
  job?: BookingJob
  business?: BookingBusiness
}

export interface BookingCardProps {
  booking: Booking
  onCancel?: (bookingId: string) => void | Promise<void>
  businessRating?: BusinessRatingSummary
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function mapBookingStatus(
  status: Booking["status"]
): BookingStatus {
  if (status === "in_progress") return "accepted"
  return status as BookingStatus
}

function BookingCard({ booking, onCancel, businessRating }: BookingCardProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)

  const handleCancelConfirm = async () => {
    if (!onCancel) return
    setIsCancelling(true)
    try {
      await onCancel(booking.id)
      setCancelDialogOpen(false)
    } finally {
      setIsCancelling(false)
    }
  }

  const canCancel = booking.status === "pending"
  const displayStatus = mapBookingStatus(booking.status)

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">{booking.job?.title || "Unknown Job"}</CardTitle>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {booking.business?.name || "Unknown Business"}
              </span>
              {booking.business?.is_verified && (
                <CheckCircle className="h-4 w-4 text-blue-500" />
              )}
            </div>
          </div>
          <BookingStatusBadge status={displayStatus} />
        </CardHeader>

        <CardContent className="space-y-3">
          {booking.job?.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {booking.job.description}
            </p>
          )}

          {/* Reviews Section - shows business rating from worker reviews */}
          {businessRating && booking.status === "completed" && (
            <Link
              href="/dashboard/worker/reviews"
              className="block group"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Business Rating</p>
                    <p className="text-xs text-muted-foreground">
                      From {businessRating.reviewCount} {businessRating.reviewCount === 1 ? 'worker' : 'workers'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {businessRating.averageRating !== null ? (
                    <ReliabilityScore
                      score={businessRating.averageRating}
                      showValue={true}
                      showLabel={false}
                      size="sm"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">No ratings</span>
                  )}
                  <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          )}

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{formatDate(booking.start_date)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">
                {formatTime(booking.start_date)} - {formatTime(booking.end_date)}
              </span>
            </div>

            {booking.job?.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium flex-1">{booking.job.address}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Wage:</span>
              <span className="font-semibold text-lg">{formatPrice(booking.final_price)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between pt-4">
          <span className="text-xs text-muted-foreground">
            Booked on {formatDate(booking.created_at)}
          </span>
          {canCancel && onCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isCancelling}
            >
              Cancel Booking
            </Button>
          )}
        </CardFooter>
      </Card>

      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />
    </>
  )
}

export { BookingCard }
