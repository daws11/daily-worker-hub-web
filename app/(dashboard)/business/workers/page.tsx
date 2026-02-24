"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { getBadges, getWorkersByBadge } from '@/lib/supabase/queries/badges'
import type { BadgesRow } from '@/lib/supabase/queries/badges'
import { BadgeFilterSelect } from '@/components/badge/badge-filter-select'
import { SkillBadgeChip } from '@/components/badge/skill-badge-display'
import { Loader2, AlertCircle, Users, Search, MapPin, Star, Award } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface WorkerWithBadges {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  phone: string | null
  address: string | null
  location_name: string | null
  reliability_score?: number
  badges?: Array<{
    id: string
    badge_id: string
    verification_status: 'pending' | 'verified' | 'rejected'
    badge: BadgesRow
  }>
}

interface WorkersData {
  total: number
  filtered: number
  workersList: WorkerWithBadges[]
}

export default function BusinessWorkersPage() {
  const { user } = useAuth()
  const [workers, setWorkers] = useState<WorkersData>({ total: 0, filtered: 0, workersList: [] })
  const [badges, setBadges] = useState<BadgesRow[]>([])
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all available badges
  const fetchBadges = useCallback(async () => {
    try {
      const allBadges = await getBadges()
      setBadges(allBadges)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data badge'
      toast.error(message)
    }
  }, [])

  // Fetch workers with their badges
  const fetchWorkers = useCallback(async (badgeIds?: string[]) => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    try {
      let workersWithBadges: WorkerWithBadges[] = []

      if (badgeIds && badgeIds.length > 0) {
        // Fetch workers who have the selected badges
        const workersByBadgePromises = badgeIds.map(badgeId =>
          getWorkersByBadge(badgeId, 'verified')
        )

        const workersByBadgeResults = await Promise.all(workersByBadgePromises)

        // Deduplicate workers by ID
        const workersMap = new Map<string, WorkerWithBadges>()

        for (const result of workersByBadgeResults) {
          for (const wb of result) {
            if (!wb.worker) continue

            const existingWorker = workersMap.get(wb.worker.id)

            if (existingWorker) {
              // Add badge to existing worker
              if (wb.badge) {
                existingWorker.badges = existingWorker.badges || []
                existingWorker.badges.push({
                  id: wb.id,
                  badge_id: wb.badge_id,
                  verification_status: wb.verification_status,
                  badge: wb.badge
                })
              }
            } else {
              // Create new worker entry
              workersMap.set(wb.worker.id, {
                id: wb.worker.id,
                full_name: wb.worker.full_name || 'Pekerja',
                avatar_url: wb.worker.avatar_url,
                bio: wb.worker.bio,
                phone: wb.worker.phone,
                address: wb.worker.address,
                location_name: wb.worker.location_name,
                badges: wb.badge ? [{
                  id: wb.id,
                  badge_id: wb.badge_id,
                  verification_status: wb.verification_status,
                  badge: wb.badge
                }] : []
              })
            }
          }
        }

        // Workers must have ALL selected badges
        workersWithBadges = Array.from(workersMap.values()).filter(worker =>
          badgeIds.every(badgeId =>
            worker.badges?.some(wb => wb.badge_id === badgeId && wb.verification_status === 'verified')
          )
        )
      } else {
        // Fetch all workers
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select(`
            id,
            full_name,
            avatar_url,
            bio,
            phone,
            address,
            location_name
          `)
          .order('created_at', { ascending: false })

        if (workersError) throw workersError

        // Fetch badges for each worker
        workersWithBadges = await Promise.all(
          (workersData || []).map(async (worker: any) => {
            const { data: workerBadges } = await supabase
              .from('worker_badges')
              .select(`
                id,
                badge_id,
                verification_status,
                badge:badges(*)
              `)
              .eq('worker_id', worker.id)
              .eq('verification_status', 'verified')

            return {
              ...worker,
              badges: workerBadges || []
            }
          })
        )
      }

      setWorkers({
        total: workersWithBadges.length,
        filtered: workersWithBadges.length,
        workersList: workersWithBadges
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data pekerja'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Handle badge filter change
  const handleBadgeFilterChange = useCallback((badgeIds: string[]) => {
    setSelectedBadgeIds(badgeIds)
    fetchWorkers(badgeIds)
  }, [fetchWorkers])

  // Format reliability score to stars
  const renderStars = (score: number = 0) => {
    const fullStars = Math.floor(score)
    const hasHalfStar = score % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <div style={{ display: 'flex', gap: '0.125rem' }}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} style={{ width: '1rem', height: '1rem', fill: '#fbbf24', color: '#fbbf24' }} />
        ))}
        {hasHalfStar && (
          <Star key="half" style={{ width: '1rem', height: '1rem', fill: 'url(#half-fill)', color: '#fbbf24' }} />
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} style={{ width: '1rem', height: '1rem', color: '#d1d5db' }} />
        ))}
      </div>
    )
  }

  // Fetch badges and workers on mount
  useEffect(() => {
    fetchBadges()
    fetchWorkers()
  }, [fetchBadges, fetchWorkers])

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
            Cari Pekerja
          </h1>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            Temukan pekerja dengan keahlian dan sertifikasi yang sesuai
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
              onClick={() => fetchWorkers(selectedBadgeIds)}
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
            <p style={{ color: '#666' }}>Memuat data pekerja...</p>
          </div>
        )}

        {/* Filter Section */}
        {!loading && !error && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Search style={{ width: '1.25rem', height: '1.25rem', color: '#666' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Filter Berdasarkan Badge
              </h3>
            </div>
            <BadgeFilterSelect
              badges={badges}
              selectedBadges={selectedBadgeIds}
              onBadgesChange={handleBadgeFilterChange}
              placeholder="Pilih badge untuk filter pekerja..."
            />
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
                Total Pekerja
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
                {workers.total ?? 0}
              </p>
            </div>

            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              backgroundColor: 'white'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Filtered
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                {workers.filtered ?? 0}
              </p>
            </div>

            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              backgroundColor: 'white'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Badge Tersedia
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                {badges.length ?? 0}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && workers.workersList?.length === 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            border: '1px dashed #d1d5db'
          }}>
            <Users style={{ width: '3rem', height: '3rem', color: '#9ca3af', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {selectedBadgeIds.length > 0 ? 'Tidak Ada Pekerja Dengan Filter Ini' : 'Tidak Ada Pekerja'}
            </h3>
            <p style={{ color: '#666' }}>
              {selectedBadgeIds.length > 0
                ? 'Coba ubah filter badge untuk menampilkan lebih banyak pekerja'
                : 'Belum ada pekerja yang terdaftar'}
            </p>
          </div>
        )}

        {/* Workers List */}
        {!loading && !error && workers.workersList && workers.workersList.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {workers.workersList.map((worker) => (
              <div
                key={worker.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                {/* Worker Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {worker.avatar_url ? (
                        <img
                          src={worker.avatar_url}
                          alt={worker.full_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#666' }}>
                          {worker.full_name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {worker.full_name || 'Pekerja'}
                      </h3>
                      {worker.location_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#666', fontSize: '0.75rem' }}>
                          <MapPin style={{ width: '0.75rem', height: '0.75rem' }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {worker.location_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Worker Info */}
                <div style={{ padding: '1rem' }}>
                  {/* Bio */}
                  {worker.bio && (
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#666',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.4'
                    }}>
                      {worker.bio}
                    </p>
                  )}

                  {/* Badges */}
                  {worker.badges && worker.badges.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Award style={{ width: '1rem', height: '1rem', color: '#8b5cf6' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#666' }}>
                          Badges ({worker.badges.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {worker.badges.map((wb) => (
                          <div key={wb.id}>
                            <SkillBadgeChip
                              badge={wb.badge}
                              verificationStatus={wb.verification_status}
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Badges */}
                  {(!worker.badges || worker.badges.length === 0) && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.375rem',
                      marginBottom: '1rem',
                      textAlign: 'center'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>
                        Belum memiliki badge
                      </p>
                    </div>
                  )}
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
