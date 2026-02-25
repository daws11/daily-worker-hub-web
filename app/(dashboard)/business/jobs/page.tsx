"use client"

import { useState, useCallback, useEffect } from 'react'
<<<<<<< HEAD
import { useAuth } from '@/providers/auth-provider'
import { getBusinessJobs } from '@/lib/supabase/queries/jobs'
import { getJobBookings } from '@/lib/supabase/queries/bookings'
import type { JobsRow } from '@/lib/supabase/queries/jobs'
import type { JobBookingWithDetails } from '@/lib/supabase/queries/bookings'
import { QRCodeGenerator } from '@/components/attendance/qr-code-generator'
import { Calendar, MapPin, Users, Loader2, AlertCircle, CheckCircle, XCircle, Clock, Building2, QrCode } from 'lucide-react'
import { toast } from 'sonner'

interface JobWithAttendance extends JobsRow {
  bookings?: JobBookingWithDetails[]
  stats?: {
    total: number
    checkedIn: number
    checkedOut: number
  }
  qr_code?: string | null
}

interface JobsData {
  total: number
  active: number
  completed: number
  jobsList: JobWithAttendance[]
}

export default function BusinessJobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<JobsData>({ total: 0, active: 0, completed: 0, jobsList: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch business jobs with attendance data
  const fetchJobsWithAttendance = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      // Fetch all jobs for the business
      const businessJobs = await getBusinessJobs(user.id)

      // Calculate stats
      const totalJobs = businessJobs.length
      const activeJobs = businessJobs.filter(job =>
        job.status === 'open' || job.status === 'in_progress'
      ).length
      const completedJobs = businessJobs.filter(job => job.status === 'completed').length

      // Fetch bookings for active jobs
      const activeJobsList = businessJobs.filter(job =>
        job.status === 'open' || job.status === 'in_progress'
      )

      const jobsWithAttendance: JobWithAttendance[] = await Promise.all(
        activeJobsList.map(async (job) => {
          const { data: bookings } = await getJobBookings(job.id)

          const stats = {
            total: bookings?.length ?? 0,
            checkedIn: bookings?.filter(b => b.check_in_at).length ?? 0,
            checkedOut: bookings?.filter(b => b.check_out_at).length ?? 0,
          }

          return {
            ...job,
            bookings: bookings ?? undefined,
            stats,
          }
        })
      )

      setJobs({
        total: totalJobs,
        active: activeJobs,
        completed: completedJobs,
        jobsList: jobsWithAttendance
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Handle QR code refresh
  const handleQRRefresh = useCallback(() => {
    fetchJobsWithAttendance()
  }, [fetchJobsWithAttendance])

  // Format date to Indonesian locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
=======
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
>>>>>>> auto-claude/017-job-completion-payment-release
      month: 'short',
      year: 'numeric',
    })
  }

<<<<<<< HEAD
  // Format time to Indonesian locale
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobsWithAttendance()
  }, [fetchJobsWithAttendance])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Pekerjaan Saya
          </h1>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            Kelola pekerjaan dan pantau kehadiran pekerja
          </p>
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
              onClick={fetchJobsWithAttendance}
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
        {loading && !error && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <Loader2 style={{ width: '2rem', height: '2rem', color: '#2563eb', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#666' }}>Memuat data pekerjaan...</p>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              backgroundColor: 'white'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Total Pekerjaan
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
                {jobs.total ?? 0}
              </p>
            </div>

            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              backgroundColor: 'white'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Pekerjaan Aktif
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                {jobs.active ?? 0}
              </p>
            </div>

            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              backgroundColor: 'white'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Selesai
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6b7280' }}>
                {jobs.completed ?? 0}
              </p>
=======
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
>>>>>>> auto-claude/017-job-completion-payment-release
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

<<<<<<< HEAD
        {/* Empty State */}
        {!loading && !error && jobs.jobsList?.length === 0 && (
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
              Tidak Ada Pekerjaan Aktif
            </h3>
            <p style={{ color: '#666' }}>
              Buat pekerjaan baru untuk mulai melacak kehadiran pekerja
            </p>
          </div>
        )}

        {/* Active Jobs List */}
        {!loading && !error && jobs.jobsList && jobs.jobsList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {jobs.jobsList.map((job) => (
              <div
                key={job.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}
              >
                {/* Job Header */}
                <div style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        {job.title}
                      </h3>
                      {job.address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
                          <MapPin style={{ width: '1rem', height: '1rem' }} />
                          <span>{job.address}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // Open QR code dialog
                        const dialog = document.getElementById(`qr-dialog-${job.id}`) as HTMLDialogElement
                        dialog?.showModal()
                      }}
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
                      <QrCode style={{ width: '1rem', height: '1rem' }} />
                      QR Code
                    </button>
                  </div>
                  {job.stats && job.stats.total > 0 && (
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                        <Users style={{ width: '1rem', height: '1rem' }} />
                        <span>{job.stats.total} Pekerja</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#10b981' }}>
                        <CheckCircle style={{ width: '1rem', height: '1rem' }} />
                        <span>{job.stats.checkedIn} Check In</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <XCircle style={{ width: '1rem', height: '1rem' }} />
                        <span>{job.stats.checkedOut} Check Out</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Workers List */}
                {job.bookings && job.bookings.length > 0 && (
                  <div style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users style={{ width: '1.25rem', height: '1.25rem', color: '#666' }} />
                      Daftar Pekerja
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                      {job.bookings.map((booking) => (
                        <div
                          key={booking.id}
                          style={{
                            padding: '1rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.375rem',
                            backgroundColor: '#fafafa'
                          }}
                        >
                          {/* Worker Info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#666' }}>
                                  {booking.worker?.full_name?.charAt(0) || '?'}
                                </span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 500, fontSize: '0.875rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {booking.worker?.full_name || 'Pekerja'}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
                                {booking.worker?.phone || ''}
                              </p>
                            </div>
                            {booking.check_out_at ? (
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
                            ) : booking.check_in_at ? (
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
                                Bekerja
                              </div>
                            ) : (
                              <div style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                flexShrink: 0
                              }}>
                                <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                                Belum
                              </div>
                            )}
                          </div>

                          {/* Attendance Times */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                            <div>
                              <span style={{ color: '#666' }}>Check In: </span>
                              <span style={{ fontWeight: 500 }}>{formatTime(booking.check_in_at)}</span>
                            </div>
                            <div>
                              <span style={{ color: '#666' }}>Check Out: </span>
                              <span style={{ fontWeight: 500 }}>{formatTime(booking.check_out_at)}</span>
                            </div>
                          </div>

                          {/* Location Verification */}
                          {booking.check_in_lat && booking.check_in_lng && (
                            <div style={{
                              marginTop: '0.5rem',
                              paddingTop: '0.5rem',
                              borderTop: '1px solid #e5e7eb',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: '#10b981'
                            }}>
                              <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                              <span>Lokasi terverifikasi</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
=======
        {/* Job Posting Info */}
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Fitur posting pekerjaan akan segera tersedia...
          </p>
        </div>
>>>>>>> auto-claude/017-job-completion-payment-release
      </div>

      {/* QR Code Dialogs */}
      {jobs.jobsList?.map((job) => (
        <dialog
          key={`qr-dialog-${job.id}`}
          id={`qr-dialog-${job.id}`}
          style={{
            border: 'none',
            borderRadius: '0.5rem',
            padding: 0,
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ padding: '0' }}>
            <QRCodeGenerator
              jobId={job.id}
              jobTitle={job.title}
              businessName={user?.user_metadata?.full_name || 'Business'}
              address={job.address || undefined}
              startDate={job.deadline || undefined}
              existingQRCode={job.qr_code || undefined}
              onRefresh={handleQRRefresh}
            />
            <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  const dialog = document.getElementById(`qr-dialog-${job.id}`) as HTMLDialogElement
                  dialog?.close()
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </dialog>
      ))}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        dialog::backdrop {
          background: rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  )
}
