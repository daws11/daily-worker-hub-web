import { useState, useEffect, useCallback } from 'react'
import { getJobs } from '../api/jobs'
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

  const fetchJobs = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: apiError } = await getJobs({ filters, sort, page, limit })

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

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
  }
}
