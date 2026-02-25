import { useState, useEffect, useCallback } from 'react'
import {
  getSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  toggleSavedSearchFavorite,
} from '../api/saved-searches'
import type { SavedSearch, JobFilters, CreateSavedSearchInput } from '../types/job'

export interface UseSavedSearchesParams {
  workerId?: string
  enabled?: boolean
}

export interface UseSavedSearchesResult {
  savedSearches: SavedSearch[]
  loading: boolean
  error: Error | null
  saveSearch: (name: string, filters: JobFilters) => Promise<SavedSearch | null>
  loadSearch: (id: string) => JobFilters | null
  deleteSearch: (id: string) => Promise<boolean>
  toggleFavorite: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
}

export function useSavedSearches({
  workerId,
  enabled = true,
}: UseSavedSearchesParams = {}): UseSavedSearchesResult {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSavedSearches = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: apiError } = await getSavedSearches(workerId)

      if (apiError) {
        setError(apiError)
        setSavedSearches([])
      } else {
        setSavedSearches(data || [])
      }
    } catch (err) {
      setError(err as Error)
      setSavedSearches([])
    } finally {
      setLoading(false)
    }
  }, [enabled, workerId])

  const saveSearch = useCallback(
    async (name: string, filters: JobFilters): Promise<SavedSearch | null> => {
      if (!workerId) {
        setError(new Error('Worker ID is required to save a search'))
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const input: CreateSavedSearchInput = {
          name,
          filters,
          is_favorite: false,
        }

        const { data, error: apiError } = await createSavedSearch(workerId, input)

        if (apiError) {
          setError(apiError)
          return null
        }

        // Refresh the list after saving
        await fetchSavedSearches()
        return data
      } catch (err) {
        setError(err as Error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [workerId, fetchSavedSearches]
  )

  const loadSearch = useCallback(
    (id: string): JobFilters | null => {
      const search = savedSearches.find((s) => s.id === id)
      return search?.filters ?? null
    },
    [savedSearches]
  )

  const deleteSearch = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const { error: apiError } = await deleteSavedSearch(id)

        if (apiError) {
          setError(apiError)
          return false
        }

        // Remove from local state
        setSavedSearches((prev) => prev.filter((s) => s.id !== id))
        return true
      } catch (err) {
        setError(err as Error)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const toggleFavorite = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: apiError } = await toggleSavedSearchFavorite(id)

        if (apiError) {
          setError(apiError)
          return false
        }

        // Update local state with the updated favorite status
        if (data) {
          setSavedSearches((prev) =>
            prev.map((s) => (s.id === id ? data : s))
          )
        }

        return true
      } catch (err) {
        setError(err as Error)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchSavedSearches()
  }, [fetchSavedSearches])

  return {
    savedSearches,
    loading,
    error,
    saveSearch,
    loadSearch,
    deleteSearch,
    toggleFavorite,
    refetch: fetchSavedSearches,
  }
}
