"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useAttendance } from '@/lib/hooks/use-attendance'
import { useTranslation } from '@/lib/i18n/hooks'
import { QRCodeGenerator } from '@/components/attendance/qr-code-generator'
import { getBusinessJobs } from '@/lib/supabase/queries/jobs'
import { getJobBookings } from '@/lib/supabase/queries/bookings'
import type { JobsRow } from '@/lib/supabase/queries/jobs'
import type { JobBookingWithDetails } from '@/lib/supabase/queries/bookings'
import { Calendar, Clock, MapPin, Users, Loader2, AlertCircle, CheckCircle, XCircle, Building2 } from 'lucide-react'
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

export default function BusinessJobAttendancePage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const [jobs, setJobs] = useState<JobWithAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Fetch business jobs with attendance data
  const fetchJobsWithAttendance = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      // Fetch active jobs for the business
      const businessJobs = await getBusinessJobs(user.id)
      const activeJobs = businessJobs.filter(job =>
        job.status === 'open' || job.status === 'in_progress'
      )

      // Fetch bookings for each job
      const jobsWithAttendance: JobWithAttendance[] = await Promise.all(
        activeJobs.map(async (job) => {
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

      setJobs(jobsWithAttendance)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.loadFailed')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, t])

  // Handle QR code refresh
  const handleQRRefresh = useCallback(() => {
    fetchJobsWithAttendance()
  }, [fetchJobsWithAttendance])

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
            {t('jobAttendance.title')}
          </h1>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            {t('jobAttendance.subtitle')}
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
            <div>
              <p style={{ color: '#991b1b', fontWeight: 500, marginBottom: '0.25rem' }}>
                {t('errors.loadFailed')}
              </p>
              <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
            </div>
            <button
              onClick={fetchJobsWithAttendance}
              style={{
                marginLeft: 'auto',
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
              {t('common.tryAgain')}
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
            <p style={{ color: '#666' }}>{t('jobAttendance.loading')}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && jobs.length === 0 && (
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
              {t('jobAttendance.noActiveJobs')}
            </h3>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              {t('jobAttendance.noActiveJobsDesc')}
            </p>
          </div>
        )}

        {/* Jobs List */}
        {!loading && !error && jobs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {jobs.map((job) => (
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
                    {job.stats && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                            {job.stats.total}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>{t('common.total')}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                            {job.stats.checkedIn}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>{t('attendance.checkIn')}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6b7280' }}>
                            {job.stats.checkedOut}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>{t('attendance.checkOut')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                  {/* QR Code Section */}
                  <div style={{ padding: '1.5rem', borderRight: '1px solid #e5e7eb' }}>
                    <QRCodeGenerator
                      jobId={job.id}
                      jobTitle={job.title}
                      businessName={user?.user_metadata?.full_name || 'Business'}
                      address={job.address || undefined}
                      startDate={job.deadline || undefined}
                      existingQRCode={job.qr_code || undefined}
                      onRefresh={handleQRRefresh}
                    />
                  </div>

                  {/* Workers List Section */}
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Users style={{ width: '1.25rem', height: '1.25rem', color: '#666' }} />
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{t('jobAttendance.workerList')}</h4>
                    </div>

                    {!job.bookings || job.bookings.length === 0 ? (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#9ca3af',
                        border: '1px dashed #d1d5db',
                        borderRadius: '0.375rem'
                      }}>
                        <Users style={{ width: '2rem', height: '2rem', margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.875rem' }}>{t('jobAttendance.noWorkers')}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                        {job.bookings.map((booking) => (
                          <div
                            key={booking.id}
                            style={{
                              padding: '0.75rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.375rem',
                              backgroundColor: '#fafafa'
                            }}
                          >
                            {/* Worker Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <div style={{
                                width: '2rem',
                                height: '2rem',
                                borderRadius: '50%',
                                backgroundColor: '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                              }}>
                                {booking.worker?.avatar_url ? (
                                  <img
                                    src={booking.worker.avatar_url}
                                    alt={booking.worker.full_name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666' }}>
                                    {booking.worker?.full_name?.charAt(0) || '?'}
                                  </span>
                                )}
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 500, fontSize: '0.875rem', margin: 0 }}>
                                  {booking.worker?.full_name || t('jobAttendance.worker')}
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
                                  gap: '0.25rem'
                                }}>
                                  <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                                  {t('attendance.completed')}
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
                                  gap: '0.25rem'
                                }}>
                                  <Clock style={{ width: '0.875rem', height: '0.875rem' }} />
                                  {t('attendance.working')}
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
                                  gap: '0.25rem'
                                }}>
                                  <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                                  {t('attendance.notYet')}
                                </div>
                              )}
                            </div>

                            {/* Attendance Times */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                              <div>
                                <span style={{ color: '#666' }}>{t('attendance.checkIn')}: </span>
                                <span style={{ fontWeight: 500 }}>{formatTime(booking.check_in_at)}</span>
                              </div>
                              <div>
                                <span style={{ color: '#666' }}>{t('attendance.checkOut')}: </span>
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
                                <span>{t('business.locationVerified')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
