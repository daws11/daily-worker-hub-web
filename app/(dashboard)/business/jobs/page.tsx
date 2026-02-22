"use client"

import { useState, useCallback, useEffect } from 'react'
import { Briefcase, Loader2, Calendar, Banknote, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PaymentStatusBadge } from '@/components/booking/payment-status-badge'
import { DisputeDialog } from '@/components/booking/dispute-dialog'
import { useAuth } from '@/app/providers/auth-provider'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
type PaymentStatus = 'pending_review' | 'available' | 'released' | 'disputed' | 'cancelled'

export default function BusinessJobsPage() {
  const { user } = useAuth()

  // State for bookings
  const [businessBookings, setBusinessBookings] = useState<any[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  // Fetch business bookings
  const fetchBusinessBookings = useCallback(async () => {
    if (!user) return

    setBookingsLoading(true)
    setBookingsError(null)

    try {
      // Get business ID from user ID
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (businessError || !businessData) {
        setBookingsError('Gagal mengambil data bisnis')
        return
      }

      const businessId = (businessData as any).id

      // Get business's bookings, focusing on completed ones with payment info
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          jobs (
            id,
            title,
            description,
            budget_max,
            address
          ),
          workers (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('business_id', businessId)
        .in('status', ['accepted', 'in_progress', 'completed'])
        .order('created_at', { ascending: false })

      if (bookingsError) {
        setBookingsError(bookingsError.message)
        return
      }

      setBusinessBookings((bookings as any) || [])
    } catch (err) {
      setBookingsError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setBookingsLoading(false)
    }
  }, [user])

  // Fetch bookings on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchBusinessBookings()
    }
  }, [user, fetchBusinessBookings])

  // Handle dispute raised
  const handleDisputeRaised = useCallback(() => {
    fetchBusinessBookings()
    toast.success('Sengketa berhasil dibuat', {
      description: 'Pembayaran akan ditahan sampai sengketa diselesaikan.',
    })
  }, [fetchBusinessBookings])

  // Get payment status label
  const getPaymentStatusLabel = (status: PaymentStatus): 'pending' | 'review' | 'available' | 'released' => {
    switch (status) {
      case 'pending_review':
        return 'review'
      case 'available':
        return 'available'
      case 'released':
        return 'released'
      case 'disputed':
      case 'cancelled':
        return 'pending'
      default:
        return 'pending'
    }
  }

  // Get booking status badge variant
  const getStatusBadgeVariant = (status: BookingStatus) => {
    switch (status) {
      case 'accepted':
        return 'default'
      case 'in_progress':
        return 'default'
      case 'completed':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Get booking status label
  const getStatusLabel = (status: BookingStatus) => {
    switch (status) {
      case 'accepted':
        return 'Diterima'
      case 'in_progress':
        return 'Sedang Berjalan'
      case 'completed':
        return 'Selesai'
      default:
        return status
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Calculate review time remaining
  const getReviewTimeRemaining = (reviewDeadline: string | null) => {
    if (!reviewDeadline) return null

    const now = new Date()
    const deadline = new Date(reviewDeadline)
    const diffMs = deadline.getTime() - now.getTime()

    if (diffMs <= 0) return null

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} hari ${hours % 24} jam`
    }

    return `${hours} jam ${minutes} menit`
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Dashboard Business - Jobs</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Kelola pekerjaan dan pantau pembayaran
          </p>
        </div>

        {/* Bookings Section */}
        {user && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Booking Saya</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchBusinessBookings}
                disabled={bookingsLoading}
              >
                <Loader2 className={cn('h-4 w-4', bookingsLoading && 'animate-spin')} />
              </Button>
            </div>

            {bookingsError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{bookingsError}</p>
              </div>
            )}

            {bookingsLoading && businessBookings.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : businessBookings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {businessBookings.map((booking) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-base line-clamp-1">
                            {booking.jobs?.title || 'Pekerjaan'}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {booking.jobs?.description || '-'}
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusBadgeVariant(booking.status as BookingStatus)}>
                          {getStatusLabel(booking.status as BookingStatus)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Worker Name */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Pekerja:</span>
                        <span className="font-medium">{booking.workers?.full_name || 'Pekerja'}</span>
                      </div>

                      {/* Work Period */}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatDate(booking.start_date)}
                          {booking.end_date && ` - ${formatDate(booking.end_date)}`}
                        </span>
                      </div>

                      {/* Payment Amount */}
                      <div className="flex items-center gap-2 text-sm">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{formatCurrency(booking.final_price)}</span>
                      </div>

                      {/* Payment Status (for completed bookings) */}
                      {booking.status === 'completed' && booking.payment_status && (
                        <div className="pt-2 border-t space-y-2">
                          <div>
                            <span className="text-xs text-muted-foreground">Status Pembayaran:</span>
                            <div className="mt-1">
                              <PaymentStatusBadge
                                status={getPaymentStatusLabel(booking.payment_status as PaymentStatus)}
                              />
                            </div>
                          </div>

                          {/* Review Period Countdown */}
                          {booking.payment_status === 'pending_review' && booking.review_deadline && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-950/30">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                                    Periode Tinjauan
                                  </p>
                                  {(() => {
                                    const timeRemaining = getReviewTimeRemaining(booking.review_deadline)
                                    return timeRemaining ? (
                                      <p className="text-xs text-amber-700 dark:text-amber-300">
                                        {timeRemaining} tersisa untuk melaporkan masalah
                                      </p>
                                    ) : (
                                      <p className="text-xs text-amber-700 dark:text-amber-300">
                                        Periode tinjauan telah berakhir
                                      </p>
                                    )
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Dispute Button (only during review period) */}
                          {booking.payment_status === 'pending_review' && booking.review_deadline && (
                            <DisputeDialog
                              bookingId={booking.id}
                              businessId={booking.business_id}
                              paymentStatus={booking.payment_status as PaymentStatus}
                              jobTitle={booking.jobs?.title}
                              workerName={booking.workers?.full_name}
                              onDisputeRaised={handleDisputeRaised}
                              trigger={
                                <Button variant="destructive" size="sm" className="w-full">
                                  Laporkan Masalah
                                </Button>
                              }
                            />
                          )}

                          {/* Disputed Status Message */}
                          {booking.payment_status === 'disputed' && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950/30">
                              <p className="text-xs text-red-800 dark:text-red-200">
                                Pembayaran ditahan karena sengketa
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info for in_progress bookings */}
                      {booking.status === 'in_progress' && (
                        <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                          Pekerjaan sedang berjalan
                        </div>
                      )}

                      {/* Info for accepted bookings */}
                      {booking.status === 'accepted' && (
                        <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                          Booking diterima, menunggu untuk dimulai
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada booking. Posting pekerjaan sekarang!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Job Posting Info */}
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Fitur posting pekerjaan akan segera tersedia...
          </p>
        </div>
      </div>
    </div>
  )
}
