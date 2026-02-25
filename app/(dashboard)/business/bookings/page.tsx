"use client"

import * as React from "react"
import { useCallback } from "react"
import { useAuth } from "@/providers/auth-provider"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { ReviewFormDialog } from "@/components/review/review-form-dialog"
import type { ReviewerType } from "@/lib/schemas/review"
import { Loader2, AlertCircle, Building2, CheckCircle, XCircle, Clock, Star } from "lucide-react"

interface BookingWorker {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
}

interface BookingJob {
  id: string
  title: string
  description: string
  address: string | null
}

interface Booking {
  id: string
  job_id: string
  worker_id: string
  status: "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"
  start_date: string
  end_date: string
  final_price: number
  created_at: string
  worker?: BookingWorker
  job?: BookingJob
}

interface BookingReview {
  id: string
  rating: number
  comment: string | null
  would_rehire: boolean | null
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function BusinessBookingsPage() {
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
      // Fetch all bookings for the business
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          job_id,
          worker_id,
          status,
          start_date,
          end_date,
          final_price,
          created_at,
          worker:workers(
            id,
            full_name,
            phone,
            avatar_url
          ),
          job:jobs(
            id,
            title,
            description,
            address
          )
        `)
        .eq("business_id", user.id)
        .order("created_at", { ascending: false })

      if (bookingsError) throw bookingsError

      const bookings = (bookingsData as Booking[]) || []

      // Fetch existing reviews for completed bookings
      const completedBookingIds = bookings
        .filter((b) => b.status === "completed")
        .map((b) => b.id)

      if (completedBookingIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("id, booking_id, rating, comment, would_rehire")
          .in("booking_id", completedBookingIds)
          .eq("reviewer", "business")

        const reviewsMap = new Map<string, BookingReview>()
        reviewsData?.forEach((review: any) => {
          reviewsMap.set(review.booking_id, {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            would_rehire: review.would_rehire,
          })
        })

        setBookingReviews(reviewsMap)
      }

      setBookings(bookings)
    } catch (err: any) {
      const message = err.message || "Gagal memuat data booking"
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Fetch bookings on mount
  React.useEffect(() => {
    fetchBookingsWithReviews()
  }, [fetchBookingsWithReviews])

  const handleLogout = async () => {
    await signOut()
  }

  const handleWriteReview = (booking: Booking) => {
    setSelectedBooking(booking)
    setReviewDialogOpen(true)
  }

  const handleReviewSuccess = () => {
    setReviewDialogOpen(false)
    setSelectedBooking(null)
    // Refresh bookings to update review status
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
              Booking Bisnis
            </h1>
            <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
              Kelola booking pekerja dan berikan ulasan
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
              Booking pekerja akan muncul di sini setelah pekerja melamar pada pekerjaan Anda
            </p>
          </div>
        )}

        {/* Bookings List */}
        {!isLoading && !error && hasBookings && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {(Object.keys(groupedBookings) as Array<keyof BookingStatusGroup>).map(
              (status) => {
                const groupBookings = groupedBookings[status]
                if (groupBookings.length === 0) return null

                return (
                  <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {statusGroupLabels[status]} ({groupBookings.length})
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                      {groupBookings.map((booking) => {
                        const existingReview = bookingReviews.get(booking.id)
                        const hasReviewed = !!existingReview

                        return (
                          <div
                            key={booking.id}
                            style={{
                              backgroundColor: 'white',
                              borderRadius: '0.5rem',
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              overflow: 'hidden'
                            }}
                          >
                            {/* Worker Info Header */}
                            <div style={{
                              padding: '1rem 1rem 0.75rem',
                              borderBottom: '1px solid #e5e7eb',
                              backgroundColor: '#f9fafb'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  width: '2.5rem',
                                  height: '2.5rem',
                                  borderRadius: '50%',
                                  backgroundColor: '#e5e7eb',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                  flexShrink: 0
                                }}>
                                  {booking.worker?.avatar_url ? (
                                    <img
                                      src={booking.worker.avatar_url}
                                      alt={booking.worker.full_name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#666' }}>
                                      {getInitials(booking.worker?.full_name || '?')}
                                    </span>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {booking.worker?.full_name || 'Pekerja'}
                                  </p>
                                  <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
                                    {booking.worker?.phone || ''}
                                  </p>
                                </div>
                                {booking.status === 'completed' ? (
                                  <div style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#dcfce7',
                                    color: '#166534',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    flexShrink: 0
                                  }}>
                                    <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                                    Selesai
                                  </div>
                                ) : booking.status === 'accepted' || booking.status === 'in_progress' ? (
                                  <div style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#dbeafe',
                                    color: '#1e40af',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    flexShrink: 0
                                  }}>
                                    <Clock style={{ width: '0.875rem', height: '0.875rem' }} />
                                    {booking.status === 'accepted' ? 'Diterima' : 'Bekerja'}
                                  </div>
                                ) : (
                                  <div style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#6b7280',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    flexShrink: 0
                                  }}>
                                    {booking.status === 'pending' ? 'Menunggu' : booking.status}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Job Details */}
                            <div style={{ padding: '1rem' }}>
                              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                {booking.job?.title || 'Unknown Job'}
                              </h3>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 500 }}>Tanggal:</span>
                                  <span>{formatDate(booking.start_date)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 500 }}>Waktu:</span>
                                  <span>{formatTime(booking.start_date)} - {formatTime(booking.end_date)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 500 }}>Gaji:</span>
                                  <span style={{ fontWeight: 600, color: '#2563eb' }}>{formatPrice(booking.final_price)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Review Section - Only for completed bookings */}
                            {booking.status === 'completed' && (
                              <div style={{
                                padding: '0.75rem 1rem',
                                borderTop: '1px solid #e5e7eb',
                                backgroundColor: '#f9fafb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                {hasReviewed ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span style={{ fontSize: '0.875rem', color: '#666' }}>
                                      Ulasan diberikan ({existingReview.rating}/5)
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleWriteReview(booking)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.5rem 1rem',
                                      backgroundColor: '#2563eb',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                  >
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    Tulis Ulasan
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
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
            workerId={selectedBooking.worker_id}
            businessId={user.id}
            reviewer="business"
            targetName={selectedBooking.worker?.full_name || 'Pekerja'}
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
