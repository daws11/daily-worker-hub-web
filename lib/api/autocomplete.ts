import { supabase } from '../supabase/client'
import { Database } from '../supabase/types'

type JobsRow = Database['public']['Tables']['jobs']['Row']

export interface SearchSuggestion {
  id: string
  name: string
  type: 'position' | 'area'
  count?: number
}

export interface SearchSuggestionParams {
  query?: string
  limit?: number
}

export async function getSearchSuggestions(
  params?: SearchSuggestionParams
): Promise<{
  data: SearchSuggestion[] | null
  error: Error | null
}> {
  try {
    const { query = '', limit = 10 } = params || {}

    // If no query, return empty results
    if (!query || query.trim().length === 0) {
      return { data: [], error: null }
    }

    const suggestions: SearchSuggestion[] = []
    const trimmedQuery = query.trim()

    // Get position suggestions (distinct job titles)
    const { data: positionData, error: positionError } = await supabase
      .from('jobs')
      .select('title')
      .ilike('title', `%${trimmedQuery}%`)
      .limit(limit)

    if (positionError) {
      return { data: null, error: positionError }
    }

    // Get unique positions with counts
    const positionMap = new Map<string, number>()
    if (positionData) {
      for (const job of positionData) {
        const title = job.title
        positionMap.set(title, (positionMap.get(title) || 0) + 1)
      }
    }

    // Add position suggestions
    for (const [name, count] of Array.from(positionMap.entries())) {
      suggestions.push({
        id: `pos-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        type: 'position',
        count,
      })
    }

    // Get area suggestions (distinct addresses)
    const { data: areaData, error: areaError } = await supabase
      .from('jobs')
      .select('address')
      .ilike('address', `%${trimmedQuery}%`)
      .limit(limit)

    if (areaError) {
      return { data: null, error: areaError }
    }

    // Get unique areas with counts
    const areaMap = new Map<string, number>()
    if (areaData) {
      for (const job of areaData) {
        const address = job.address
        areaMap.set(address, (areaMap.get(address) || 0) + 1)
      }
    }

    // Add area suggestions
    for (const [name, count] of Array.from(areaMap.entries())) {
      suggestions.push({
        id: `area-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        type: 'area',
        count,
      })
    }

    // Sort suggestions by count (descending) and then alphabetically
    suggestions.sort((a, b) => {
      if (a.count !== undefined && b.count !== undefined) {
        if (b.count !== a.count) {
          return b.count - a.count
        }
      }
      return a.name.localeCompare(b.name)
    })

    // Limit total suggestions
    const limitedSuggestions = suggestions.slice(0, limit)

    return { data: limitedSuggestions, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function getPositionSuggestions(
  params?: SearchSuggestionParams
): Promise<{
  data: SearchSuggestion[] | null
  error: Error | null
}> {
  try {
    const { query = '', limit = 10 } = params || {}

    // If no query, return empty results
    if (!query || query.trim().length === 0) {
      return { data: [], error: null }
    }

    const trimmedQuery = query.trim()

    // Get position suggestions (distinct job titles)
    const { data, error } = await supabase
      .from('jobs')
      .select('title')
      .ilike('title', `%${trimmedQuery}%`)
      .limit(limit * 3) // Fetch more to account for duplicates

    if (error) {
      return { data: null, error }
    }

    // Get unique positions with counts
    const positionMap = new Map<string, number>()
    if (data) {
      for (const job of data) {
        const title = job.title
        positionMap.set(title, (positionMap.get(title) || 0) + 1)
      }
    }

    // Convert to suggestions array and sort by count (descending) and then alphabetically
    const suggestions: SearchSuggestion[] = Array.from(positionMap.entries())
      .map(([name, count]) => ({
        id: `pos-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        type: 'position' as const,
        count,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count
        }
        return a.name.localeCompare(b.name)
      })
      .slice(0, limit)

    return { data: suggestions, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function getAreaSuggestions(
  params?: SearchSuggestionParams
): Promise<{
  data: SearchSuggestion[] | null
  error: Error | null
}> {
  try {
    const { query = '', limit = 10 } = params || {}

    // If no query, return empty results
    if (!query || query.trim().length === 0) {
      return { data: [], error: null }
    }

    const trimmedQuery = query.trim()

    // Get area suggestions (distinct addresses)
    const { data, error } = await supabase
      .from('jobs')
      .select('address')
      .ilike('address', `%${trimmedQuery}%`)
      .limit(limit * 3) // Fetch more to account for duplicates

    if (error) {
      return { data: null, error }
    }

    // Get unique areas with counts
    const areaMap = new Map<string, number>()
    if (data) {
      for (const job of data) {
        const address = job.address
        areaMap.set(address, (areaMap.get(address) || 0) + 1)
      }
    }

    // Convert to suggestions array and sort by count (descending) and then alphabetically
    const suggestions: SearchSuggestion[] = Array.from(areaMap.entries())
      .map(([name, count]) => ({
        id: `area-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        type: 'area' as const,
        count,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count
        }
        return a.name.localeCompare(b.name)
      })
      .slice(0, limit)

    return { data: suggestions, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
