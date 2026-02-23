"use client"

import * as React from "react"
import { useCallback } from "react"
import { useAuth } from '@/providers/auth-provider'
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { ReviewFormDialog } from "@/components/review/review-form-dialog"
import type { ReviewerType } from "@/lib/schemas/review"
import { Loader2, AlertCircle, Building2, CheckCircle, XCircle, Clock, Star, Calendar, MapPin, DollarSign } from "lucide-react"
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
  onWriteReview?: (booking: Booking) => void
  hasExistingReview?: boolean
}

interface BookingReview {
  id: string
  rating: number
  comment: string | null
}

type BookingStatusGroup = {
  pending: Booking[]
  accepted: Booking[]
  completed: Booking[]
  cancelled: Booking[]
}

const statusGroupLabels: Record<keyof BookingStatusGroup, string> = {
  pending: "Pending Bookings",
  accepted: "Accepted & In Progress",
  completed: "Completed - Ready for Review",
  cancelled: "Cancelled",
}

function groupBookingsByStatus(bookings: Booking[]): BookingStatusGroup {
  return bookings.reduce<BookingStatusGroup>(
    (groups, booking) => {
      if (booking.status === "pending") {
        groups.pending.push(booking)
      } else if (booking.status === "accepted" || booking.status === "in_progress") {
        groups.accepted.push(booking)
      } else if (booking.status === "completed") {
        groups.completed.push(booking)
      } else if (booking.status === "cancelled" || booking.status === "rejected") {
        groups.cancelled.push(booking)
      }
      return groups
    },
    { pending: [], accepted: [], completed: [], cancelled: [] }
  )
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

function mapBookingStatus(status: Booking["status"]): BookingStatus {
  if (status === "in_progress") return "accepted"
  return status as BookingStatus
}

function BookingCard({ booking, onCancel, onWriteReview, hasExistingReview }: BookingCardProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)
  const canCancel = booking.status === "pending"
  const displayStatus = mapBookingStatus(booking.status)
  const canWriteReview = booking.status === "completed" && !hasExistingReview && onWriteReview

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
          <div className="flex gap-2">
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
            {canWriteReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onWriteReview?.(booking)}
              >
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                Tulis Ulasan
              </Button>
            )}
            {hasExistingReview && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>Ulasan diberikan</span>
              </div>
            )}
          </div>
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

async function fetchBookings(workerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      job_id,
      business_id,
      status,
      start_date,
      end_date,
      final_price,
      created_at,
      job:jobs(
        id,
        title,
        description,
        address
      ),
      business:businesses(
        id,
        name,
        is_verified
      )
    `)
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data as Booking[]) || []
}

async function fetchReviewsForBookings(bookingIds: string[]): Promise<Map<string, BookingReview>> {
  if (bookingIds.length === 0) return new Map()

  const { data } = await supabase
    .from("reviews")
    .select("id, booking_id, rating, comment")
    .in("booking_id", bookingIds)
    .eq("reviewer", "worker")

  const reviewsMap = new Map<string, BookingReview>()
  data?.forEach((review: any) => {
    reviewsMap.set(review.booking_id, {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
    })
  })

  return reviewsMap
}

async function cancelBooking(bookingId: string): Promise<void> {
  const { data, error } = await supabase
    .from("bookings")
    // @ts-ignore - Supabase type inference issue with React 19
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .select()

  if (error) {
    throw error
  }
}

export default function WorkerBookingsPage() {
  const { signOut, user, isLoading: authLoading } = useAuth()
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [bookingReviews, setBookingReviews] = React.useState<Map<string, BookingReview>>(new Map())
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)

  const fetchBookingsWithReviews = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const bookingsData = await fetchBookings(user.id)

      // Fetch existing reviews for completed bookings
      const completedBookingIds = bookingsData
        .filter((b) => b.status === "completed")
        .map((b) => b.id)

      if (completedBookingIds.length > 0) {
        const reviewsMap = await fetchReviewsForBookings(completedBookingIds)
        setBookingReviews(reviewsMap)
      }

      setBookings(bookingsData)
    } catch (err: any) {
      const message = err.message || "Gagal memuat data booking"
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  React.useEffect(() => {
    fetchBookingsWithReviews()
  }, [fetchBookingsWithReviews])

  const handleLogout = async () => {
    await signOut()
  }

  const handleCancel = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId)
      toast.success("Booking berhasil dibatalkan")
      await fetchBookingsWithReviews()
    } catch (error: any) {
      toast.error("Gagal membatalkan booking: " + error.message)
    }
  }

  const handleWriteReview = (booking: Booking) => {
    setSelectedBooking(booking)
    setReviewDialogOpen(true)
  }

  const handleReviewSuccess = () => {
    setReviewDialogOpen(false)
    setSelectedBooking(null)
    fetchBookingsWithReviews()
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Loader2 style={{ width: '2rem', height: '2rem', color: '#2563eb', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
          <p style={{ color: '#991b1b', fontWeight: 500 }}>
            Error: Tidak dapat memuat informasi pengguna. Silakan refresh halaman.
          </p>
        </div>
      </div>
    )
  }

  const groupedBookings = groupBookingsByStatus(bookings)
  const hasBookings = Object.values(groupedBookings).some((group) => group.length > 0)

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Booking Pekerja
            </h1>
            <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
              Kelola booking pekerjaan Anda dan berikan ulasan
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={authLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: authLoading ? '#9ca3af' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: authLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              opacity: authLoading ? 0.6 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            {authLoading ? 'Memproses...' : 'Keluar'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#991b1b', fontWeight: 500, marginBottom: '0.25rem' }}>
                Gagal memuat data
              </p>
              <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
            </div>
            <button
              onClick={fetchBookingsWithReviews}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Loader2 style={{ width: '1rem', height: '1rem' }} />
              Coba Lagi
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <Loader2 style={{ width: '2rem', height: '2rem', color: '#2563eb', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#666' }}>Memuat data booking...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && !hasBookings && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            border: '1px dashed #d1d5db'
          }}>
            <Building2 style={{ width: '3rem', height: '3rem', color: '#9ca3af', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Belum Ada Booking
            </h3>
            <p style={{ color: '#666' }}>
              Booking pekerjaan akan muncul di sini setelah Anda melamar pada pekerjaan
            </p>
          </div>
        )}

        {/* Bookings List */}
        {!isLoading && !error && hasBookings && (
          <div className="space-y-8">
            {(Object.keys(groupedBookings) as Array<keyof BookingStatusGroup>).map(
              (status) => {
                const groupBookings = groupedBookings[status]
                if (groupBookings.length === 0) return null

                return (
                  <div key={status} className="space-y-4">
                    <h2 className="text-xl font-semibold">{statusGroupLabels[status]}</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupBookings.map((booking) => {
                        const existingReview = bookingReviews.get(booking.id)
                        const hasReviewed = !!existingReview

                        return (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            onCancel={
                              booking.status === "pending"
                                ? handleCancel
                                : undefined
                            }
                            onWriteReview={booking.status === "completed" && !hasReviewed ? handleWriteReview : undefined}
                            hasExistingReview={hasReviewed}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        )}

        {/* Review Form Dialog */}
        {selectedBooking && (
          <ReviewFormDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            bookingId={selectedBooking.id}
            workerId={user.id}
            businessId={selectedBooking.business_id}
            reviewer="worker"
            targetName={selectedBooking.business?.name || 'Bisnis'}
            onSuccess={handleReviewSuccess}
          />
        )}

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
