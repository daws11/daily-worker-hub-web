"use client"

import { useState, useCallback } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useTranslation } from '@/lib/i18n/hooks'
import { useBookings } from '@/lib/hooks/use-bookings'
import { useAttendance } from '@/lib/hooks/use-attendance'
import { useGeolocation } from '@/lib/hooks/use-geolocation'
import { CheckInOutButton } from '@/components/attendance/check-in-out-button'
import { AttendanceHistory } from '@/components/attendance/attendance-history'
import { QRCodeScanner } from '@/components/attendance/qr-code-scanner'
import { toast } from 'sonner'
import { Calendar, Clock, MapPin, Loader2, AlertCircle } from 'lucide-react'
import type { JobBookingWithDetails } from '@/lib/supabase/queries/bookings'

export default function WorkerAttendancePage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerMode, setScannerMode] = useState<'check-in' | 'check-out'>('check-in')
  const [selectedBooking, setSelectedBooking] = useState<JobBookingWithDetails | null>(null)

  // Fetch worker bookings (today's schedule)
  const { bookings, isLoading: bookingsLoading, error: bookingsError, refreshBookings } = useBookings({
    workerId: user?.id,
    autoFetch: true,
  })

  // Fetch attendance history and stats
  const { workerHistory, attendanceStats, isLoading: attendanceLoading, workerCheckIn, workerCheckOut } = useAttendance({
    workerId: user?.id,
    autoFetch: true,
  })

  // GPS location capture
  const { location, isLoading: locationLoading, permission: locationPermission, getCurrentPosition } = useGeolocation({
    autoFetch: false,
  })

  // Filter today's bookings that need attendance
  const todayBookings = bookings?.filter(booking => {
    const today = new Date().toISOString().split('T')[0]
    const bookingDate = booking.start_date?.split('T')[0]
    return bookingDate === today && (booking.status === 'accepted' || booking.status === 'in_progress' || booking.check_in_at)
  }) ?? []

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
      toast.error(t('errors.checkInFailed'))
    }
  }, [selectedBooking, scannerMode, workerCheckIn, workerCheckOut, refreshBookings])

  // Handle scanner close
  const handleScannerClose = useCallback(() => {
    setScannerOpen(false)
    setSelectedBooking(null)
  }, [])

  // Handle retry on error
  const handleRetry = useCallback(() => {
    refreshBookings()
  }, [refreshBookings])

  // Format date based on current locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Format time based on current locale
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{t('attendance.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('attendance.subtitle')}
          </p>
        </div>

        {/* Location Permission Banner */}
        {locationPermission === 'prompt' && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">{t('attendance.enableLocation')}</p>
                <p className="text-sm text-amber-700 mt-1">
                  {t('attendance.enableLocationDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {bookingsError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium mb-2">{t('errors.failedToLoadData')}</p>
            <p className="text-sm text-muted-foreground mb-4">{bookingsError}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Today's Schedule */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('attendance.todaysSchedule')}</h2>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('attendance.noScheduleToday')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('availability.noJobsMessage')}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border bg-card p-4 space-y-3"
                >
                  {/* Job Title */}
                  <div className="space-y-1">
                    <h3 className="font-medium line-clamp-1">{booking.job?.title || t('common.job')}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {booking.business?.name || t('common.business')}
                    </p>
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
                          <span>{t('attendance.checkIn')}:</span>
                          <span className="font-medium text-foreground">
                            {formatTime(booking.check_in_at)}
                          </span>
                        </div>
                      )}
                      {booking.check_out_at && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{t('attendance.checkOut')}:</span>
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

        {/* Attendance History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('attendance.history')}</h2>
          <AttendanceHistory
            records={workerHistory?.records ?? []}
            stats={attendanceStats ?? undefined}
            isLoading={attendanceLoading}
            showStats={true}
          />
        </div>
      </div>

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
    </div>
  )
}
