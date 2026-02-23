"use client"

import { useState, useCallback } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { SearchAutocomplete } from '@/components/job-marketplace/SearchAutocomplete'
import type { SearchSuggestion } from '@/lib/api/autocomplete'
import { JobFilters } from '@/components/job-marketplace/JobFilters'
import { JobSort } from '@/components/job-marketplace/JobSort'
import { JobListWithHeader } from '@/components/job-marketplace/JobList'
import { JobDetailDialog } from '@/components/job-marketplace/JobDetailDialog'
import { SavedSearchesDialog } from '@/components/job-marketplace/SavedSearchesDialog'
import { CheckInOutButton } from '@/components/attendance/check-in-out-button'
import { QRCodeScanner } from '@/components/attendance/qr-code-scanner'
import { Button } from '@/components/ui/button'
import { Bookmark } from 'lucide-react'
import { useJobs } from '@/lib/hooks/useJobs'
import { useBookings } from '@/lib/hooks/use-bookings'
import { useAttendance } from '@/lib/hooks/use-attendance'
import { useGeolocation } from '@/lib/hooks/use-geolocation'
import { JobWithRelations, JobFilters as JobFiltersType, JobSortOption } from '@/lib/types/job'
import type { JobBookingWithDetails } from '@/lib/supabase/queries/bookings'
import { toast } from 'sonner'
import { Briefcase, Loader2, Calendar, Clock, MapPin, CheckCircle } from 'lucide-react'

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

  // State for saved searches dialog
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(false)

  // State for QR scanner
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerMode, setScannerMode] = useState<'check-in' | 'check-out'>('check-in')
  const [selectedBooking, setSelectedBooking] = useState<JobBookingWithDetails | null>(null)

  // Fetch jobs with filters and sorting
  const { jobs, loading, error, refetch } = useJobs({
    filters: { ...filters, search },
    sort,
    enabled: true,
  })

  // Fetch worker bookings for attendance
  const { bookings, isLoading: bookingsLoading, refreshBookings } = useBookings({
    workerId: user?.id,
    autoFetch: true,
  })

  // Attendance and geolocation hooks
  const { workerCheckIn, workerCheckOut, isLoading: attendanceLoading } = useAttendance({
    workerId: user?.id,
    autoFetch: false,
  })

  const { location, isLoading: locationLoading, getCurrentPosition } = useGeolocation({
    autoFetch: false,
  })

  // Filter active bookings (accepted, in_progress, or with check-in)
  const activeBookings = bookings?.filter(booking =>
    booking.status === 'accepted' ||
    booking.status === 'in_progress' ||
    booking.check_in_at
  ) ?? []

  // Handle job click - open detail dialog
  const handleJobClick = useCallback((job: JobWithRelations) => {
    setSelectedJob(job)
    setIsDialogOpen(true)
  }, [])

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false)
    // Delay clearing selected job to allow animation to complete
    setTimeout(() => setSelectedJob(null), 300)
  }, [])

  // Handle job application
  const handleApply = useCallback(async (job: JobWithRelations) => {
    setIsApplying(true)
    try {
      // TODO: Implement actual application logic when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Application submitted successfully!')
      handleDialogClose()
    } catch (err) {
      toast.error('Failed to submit application. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }, [handleDialogClose])

  // Handle check-in button click
  const handleCheckInClick = useCallback(async (bookingId: string) => {
    const booking = bookings?.find(b => b.id === bookingId)
    if (!booking) return

    setSelectedBooking(booking)
    setScannerMode('check-in')

    // Try to get GPS location first
    const position = await getCurrentPosition()
    if (position) {
      // We have location, proceed with check-in
      await workerCheckIn(bookingId, position.lat, position.lng)
      await refreshBookings()
    } else {
      // No location available, open QR scanner
      setScannerOpen(true)
    }
  }, [bookings, getCurrentPosition, workerCheckIn, refreshBookings])

  // Handle check-out button click
  const handleCheckOutClick = useCallback(async (bookingId: string) => {
    const booking = bookings?.find(b => b.id === bookingId)
    if (!booking) return

    setSelectedBooking(booking)
    setScannerMode('check-out')

    // Try to get GPS location first
    const position = await getCurrentPosition()
    if (position) {
      // We have location, proceed with check-out
      await workerCheckOut(bookingId, position.lat, position.lng)
      await refreshBookings()
    } else {
      // No location available, open QR scanner
      setScannerOpen(true)
    }
  }, [bookings, getCurrentPosition, workerCheckOut, refreshBookings])

  // Handle QR scanner success
  const handleScannerSuccess = useCallback(async (jobId: string, lat?: number, lng?: number) => {
    if (!selectedBooking) return

    try {
      if (scannerMode === 'check-in') {
        await workerCheckIn(selectedBooking.id, lat, lng)
      } else {
        await workerCheckOut(selectedBooking.id, lat, lng)
      }
      await refreshBookings()
      setSelectedBooking(null)
    } catch (err) {
      toast.error('Gagal memproses check-in/out. Silakan coba lagi.')
    }
  }, [selectedBooking, scannerMode, workerCheckIn, workerCheckOut, refreshBookings])

  // Handle scanner close
  const handleScannerClose = useCallback(() => {
    setScannerOpen(false)
    setSelectedBooking(null)
  }, [])

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  // Handle suggestion select from autocomplete
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    // When a suggestion is selected, we can optionally update filters
    // For now, the search text is already set by the component
    // This callback can be used for analytics or additional filter logic
  }, [])

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: JobFiltersType) => {
    setFilters(newFilters)
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((newSort: JobSortOption) => {
    setSort(newSort)
  }, [])

  // Handle load saved search
  const handleLoadSavedSearch = useCallback((savedFilters: JobFiltersType) => {
    setFilters(savedFilters)
    setSearch(savedFilters.search || '')
  }, [])

  // Handle retry on error
  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  // Format date to Indonesian locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Format time to Indonesian locale
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string, checkInAt: string | null, checkOutAt: string | null) => {
    if (checkOutAt) return 'bg-green-100 text-green-800 border-green-200'
    if (checkInAt) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (status === 'accepted') return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Get status text
  const getStatusText = (status: string, checkInAt: string | null, checkOutAt: string | null) => {
    if (checkOutAt) return 'Selesai'
    if (checkInAt) return 'Sedang Bekerja'
    if (status === 'accepted') return 'Diterima'
    return status
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

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium mb-2">Failed to load jobs</p>
            <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Try Again
            </button>
          </div>
        )}

        {/* My Bookings Section */}
        {activeBookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">My Bookings</h2>
            {bookingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    {/* Header: Job Title and Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-1">{booking.job?.title || 'Pekerjaan'}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {booking.business?.name || 'Business'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border shrink-0 ${getStatusBadgeColor(
                          booking.status,
                          booking.check_in_at,
                          booking.check_out_at
                        )}`}
                      >
                        {getStatusText(booking.status, booking.check_in_at, booking.check_out_at)}
                      </span>
                    </div>

                    {/* Date and Time */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(booking.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(booking.start_date)} - {formatTime(booking.end_date)}
                        </span>
                      </div>
                      {booking.job?.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{booking.job.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Check-in/out Times */}
                    {(booking.check_in_at || booking.check_out_at) && (
                      <div className="pt-2 border-t space-y-1 text-sm">
                        {booking.check_in_at && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Check In:</span>
                            <span className="font-medium text-foreground">
                              {formatTime(booking.check_in_at)}
                            </span>
                          </div>
                        )}
                        {booking.check_out_at && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Check Out:</span>
                            <span className="font-medium text-foreground">
                              {formatTime(booking.check_out_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Check In/Out Button */}
                    <CheckInOutButton
                      bookingId={booking.id}
                      status={booking.status}
                      checkInAt={booking.check_in_at}
                      checkOutAt={booking.check_out_at}
                      onCheckIn={handleCheckInClick}
                      onCheckOut={handleCheckOutClick}
                      isLoading={locationLoading || attendanceLoading}
                      className="w-full"
                      showLabel={true}
                    />
                  </div>
                ))}
              </div>
            )}
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
                <SearchAutocomplete
                  value={search}
                  onSearchChange={handleSearchChange}
                  onSuggestionSelect={handleSuggestionSelect}
                  placeholder="Search jobs by position or area..."
                  className="w-full sm:max-w-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setSavedSearchesOpen(true)}
                  className="flex-shrink-0"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Saved Searches
                </Button>
                <JobSort
                  value={sort}
                  onSortChange={handleSortChange}
                />
              </div>
            </div>

            {/* Job List */}
            <JobListWithHeader
              jobs={jobs}
              loading={loading}
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

      {/* QR Code Scanner Dialog */}
      {selectedBooking && (
        <QRCodeScanner
          bookingId={selectedBooking.id}
          mode={scannerMode}
          open={scannerOpen}
          onOpenChange={handleScannerClose}
          onSuccess={handleScannerSuccess}
        />
      )}

      {/* Saved Searches Dialog */}
      <SavedSearchesDialog
        open={savedSearchesOpen}
        onOpenChange={setSavedSearchesOpen}
        currentFilters={{ ...filters, search }}
        onLoadSearch={handleLoadSavedSearch}
        workerId={user?.id}
      />
    </div>
  )
}
