import { useState, useEffect, useCallback, useMemo } from 'react'
import { getJobs } from '../api/jobs'
import { calculateDistance } from '../utils/distance'
import type { JobWithRelations, JobListParams } from '../types/job'

export interface UseJobsParams {
  filters?: JobListParams['filters']
  sort?: JobListParams['sort']
  page?: JobListParams['page']
  limit?: JobListParams['limit']
  enabled?: boolean
}

export interface UseJobsResult {
  jobs: JobWithRelations[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useJobs({
  filters,
  sort = 'newest',
  page = 1,
  limit = 20,
  enabled = true,
}: UseJobsParams = {}): UseJobsResult {
  const [jobs, setJobs] = useState<JobWithRelations[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Get user's location for distance sorting
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return
    }

    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      // Silently fail - user may have denied permission
      () => {
        // Location not available, nearest sort will fall back to created_at
      }
    )
  }, [])

  const fetchJobs = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // For 'nearest' sort, we don't pass it to API since it requires client-side calculation
      const sortParam = sort === 'nearest' ? 'newest' : sort
      const { data, error: apiError } = await getJobs({ filters, sort: sortParam, page, limit })

      if (apiError) {
        setError(apiError)
        setJobs([])
      } else {
        setJobs(data || [])
      }
    } catch (err) {
      setError(err as Error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [enabled, filters, sort, page, limit])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Apply client-side sorting for 'nearest' option
  const sortedJobs = useMemo(() => {
    if (sort !== 'nearest' || !userLocation) {
      return jobs
    }

    // Calculate distances and sort
    return jobs
      .map((job) => ({
        ...job,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          job.lat,
          job.lng
        ),
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }, [jobs, sort, userLocation])

  return {
    jobs: sortedJobs,
    loading,
    error,
    refetch: fetchJobs,
  }
}
