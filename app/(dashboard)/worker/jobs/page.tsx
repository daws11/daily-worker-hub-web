"use client"

import { useState, useCallback, useEffect } from 'react'
import { JobSearch } from '@/components/job-marketplace/JobSearch'
import { JobFilters } from '@/components/job-marketplace/JobFilters'
import { JobSort } from '@/components/job-marketplace/JobSort'
import { JobListWithHeader } from '@/components/job-marketplace/JobList'
import { JobDetailDialog } from '@/components/job-marketplace/JobDetailDialog'
import { CheckoutDialog } from '@/components/booking/checkout-dialog'
import { PaymentStatusBadge } from '@/components/booking/payment-status-badge'
import { useJobs } from '@/lib/hooks/useJobs'
import { useBookings } from '@/lib/hooks/use-bookings'
import { useAuth } from '@/app/providers/auth-provider'
import { JobWithRelations, JobFilters as JobFiltersType, JobSortOption } from '@/lib/types/job'
import { toast } from 'sonner'
import { Briefcase, Loader2, LogOut, Calendar, Banknote } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
type PaymentStatus = 'pending_review' | 'available' | 'released' | 'disputed' | 'cancelled'

export default function WorkerJobsPage() {
  const { user } = useAuth()

  // State for filters and search
  const [search, setSearch] = useState<string>('')
  const [filters, setFilters] = useState<JobFiltersType>({})
  const [sort, setSort] = useState<JobSortOption>('newest')

  // State for job detail dialog
  const [selectedJob, setSelectedJob] = useState<JobWithRelations | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // Fetch jobs with filters and sorting
  const { jobs, loading: jobsLoading, error: jobsError, refetch } = useJobs({
    filters: { ...filters, search },
    sort,
    enabled: true,
  })

  // Fetch worker bookings
  const [workerBookings, setWorkerBookings] = useState<any[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  // Fetch worker bookings
  const fetchWorkerBookings = useCallback(async () => {
    if (!user) return

    setBookingsLoading(true)
    setBookingsError(null)

    try {
      // Get worker ID from user ID
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (workerError || !workerData) {
        setBookingsError('Gagal mengambil data worker')
        return
      }

      const workerId = (workerData as any).id

      // Get worker's active bookings (accepted, in_progress, completed)
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
          businesses (
            id,
            name
          )
        `)
        .eq('worker_id', workerId)
        .in('status', ['accepted', 'in_progress', 'completed'])
        .order('created_at', { ascending: false })

      if (bookingsError) {
        setBookingsError(bookingsError.message)
        return
      }

      setWorkerBookings((bookings as any) || [])
    } catch (err) {
      setBookingsError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setBookingsLoading(false)
    }
  }, [user])

  // Fetch bookings on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchWorkerBookings()
    }
  }, [user, fetchWorkerBookings])

  // Handle job click - open detail dialog
  const handleJobClick = useCallback((job: JobWithRelations) => {
    setSelectedJob(job)
    setIsDialogOpen(true)
  }, [])

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false)
    setTimeout(() => setSelectedJob(null), 300)
  }, [])

  // Handle job application
  const handleApply = useCallback(async (job: JobWithRelations) => {
    setIsApplying(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Application submitted successfully!')
      handleDialogClose()
    } catch (err) {
      toast.error('Failed to submit application. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }, [handleDialogClose])

  // Handle checkout complete
  const handleCheckoutComplete = useCallback(() => {
    fetchWorkerBookings()
  }, [fetchWorkerBookings])

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: JobFiltersType) => {
    setFilters(newFilters)
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((newSort: JobSortOption) => {
    setSort(newSort)
  }, [])

  // Handle retry on error
  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

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

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Job Marketplace</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Discover and apply for jobs across Bali
          </p>
        </div>

        {/* Active Bookings Section */}
        {user && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Booking Aktif Saya</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchWorkerBookings}
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

            {bookingsLoading && workerBookings.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : workerBookings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workerBookings.map((booking) => (
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
                      {/* Business Name */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Oleh:</span>
                        <span className="font-medium">{booking.businesses?.name || 'Bisnis'}</span>
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
                        <div className="pt-2 border-t">
                          <span className="text-xs text-muted-foreground">Status Pembayaran:</span>
                          <div className="mt-1">
                            <PaymentStatusBadge
                              status={getPaymentStatusLabel(booking.payment_status as PaymentStatus)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Checkout Button (for in_progress bookings) */}
                      {booking.status === 'in_progress' && (
                        <CheckoutDialog
                          bookingId={booking.id}
                          workerId={booking.worker_id}
                          status={booking.status as BookingStatus}
                          job={{
                            id: booking.jobs?.id || '',
                            title: booking.jobs?.title || '',
                            description: booking.jobs?.description,
                            budget_max: booking.jobs?.budget_max,
                            address: booking.jobs?.address,
                          }}
                          finalPrice={booking.final_price}
                          startDate={booking.start_date}
                          endDate={booking.end_date}
                          onCheckoutComplete={handleCheckoutComplete}
                          trigger={
                            <Button className="w-full" size="sm">
                              <LogOut className="mr-2 h-4 w-4" />
                              Checkout
                            </Button>
                          }
                        />
                      )}

                      {/* Info for accepted bookings */}
                      {booking.status === 'accepted' && (
                        <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                          Menunggu bisnis memulai pekerjaan
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada booking aktif. Cari dan lamar pekerjaan sekarang!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {jobsError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium mb-2">Failed to load jobs</p>
            <p className="text-sm text-muted-foreground mb-4">{jobsError.message}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Try Again
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar - Filters */}
          <aside className="lg:col-span-1">
            <JobFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              className="sticky top-6"
            />
          </aside>

          {/* Main Column - Search, Sort, and Job List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search and Sort Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <JobSearch
                  value={search}
                  onSearchChange={handleSearchChange}
                  placeholder="Search jobs by keyword or position..."
                  className="w-full sm:max-w-md"
                />
              </div>
              <div className="flex-shrink-0">
                <JobSort
                  value={sort}
                  onSortChange={handleSortChange}
                />
              </div>
            </div>

            {/* Job List */}
            <JobListWithHeader
              jobs={jobs}
              loading={jobsLoading}
              onJobClick={handleJobClick}
              title="Available Jobs"
              subtitle={search || Object.keys(filters).length > 0
                ? 'Filtered results'
                : 'Browse all open positions'}
              emptyTitle={search || Object.keys(filters).length > 0
                ? 'No jobs match your criteria'
                : 'No jobs available'}
              emptyDescription={search || Object.keys(filters).length > 0
                ? 'Try adjusting your filters or search terms'
                : 'Check back later for new opportunities'}
            />
          </div>
        </div>
      </div>

      {/* Job Detail Dialog */}
      <JobDetailDialog
        job={selectedJob}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onApply={handleApply}
        isApplying={isApplying}
      />
    </div>
  )
}
