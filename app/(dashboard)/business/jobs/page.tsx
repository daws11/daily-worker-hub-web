"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useTranslation } from '@/lib/i18n/hooks'
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
  const { t, locale } = useTranslation()
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

  // Format date to current locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Format time to current locale
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
            {t('business.jobsPageTitle')}
          </h1>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            {t('business.jobsPageSubtitle')}
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
                {t('errors.loadFailed')}
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
            <p style={{ color: '#666' }}>{t('business.loadingJobs')}</p>
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
                {t('business.totalJobs')}
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
                {t('business.activeJobs')}
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
                {t('common.completed')}
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6b7280' }}>
                {jobs.completed ?? 0}
              </p>
            </div>
          </div>
        )}

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
              {t('business.noActiveJobs')}
            </h3>
            <p style={{ color: '#666' }}>
              {t('business.noActiveJobsDescription')}
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
                      {t('business.qrCodeButton')}
                    </button>
                  </div>
                  {job.stats && job.stats.total > 0 && (
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                        <Users style={{ width: '1rem', height: '1rem' }} />
                        <span>{job.stats.total} {t('attendance.workers')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#10b981' }}>
                        <CheckCircle style={{ width: '1rem', height: '1rem' }} />
                        <span>{job.stats.checkedIn} {t('attendance.checkIn')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <XCircle style={{ width: '1rem', height: '1rem' }} />
                        <span>{job.stats.checkedOut} {t('attendance.checkOut')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Workers List */}
                {job.bookings && job.bookings.length > 0 && (
                  <div style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users style={{ width: '1.25rem', height: '1.25rem', color: '#666' }} />
                      {t('attendance.workerList')}
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
                                {booking.worker?.full_name || t('attendance.worker')}
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
                                {t('common.completed')}
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
                                gap: '0.25rem',
                                flexShrink: 0
                              }}>
                                <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                                {t('attendance.notYet')}
                              </div>
                            )}
                          </div>

                          {/* Attendance Times */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                            <div>
                              <span style={{ color: '#666' }}>{t('bookings.checkInAt')} </span>
                              <span style={{ fontWeight: 500 }}>{formatTime(booking.check_in_at)}</span>
                            </div>
                            <div>
                              <span style={{ color: '#666' }}>{t('bookings.checkOutAt')} </span>
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
                {t('common.close')}
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
