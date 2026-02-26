// @ts-nocheck
import { supabase } from '../supabase/client'
import { Database } from '../supabase/types'
import { SavedSearch, CreateSavedSearchInput, UpdateSavedSearchInput, JobFilters } from '../types/job'

type SavedSearchesRow = Database['public']['Tables']['saved_searches']['Row']
type SavedSearchesInsert = Database['public']['Tables']['saved_searches']['Insert']
type SavedSearchesUpdate = Database['public']['Tables']['saved_searches']['Update']

export async function getSavedSearches(workerId?: string): Promise<{
  data: SavedSearch[] | null
  error: Error | null
}> {
  try {
    let query = supabase
      .from('saved_searches')
      .select('*')
      .order('created_at', { ascending: false })

    if (workerId) {
      query = query.eq('worker_id', workerId)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error }
    }

    // Transform data to match SavedSearch type
    const savedSearches: SavedSearch[] = (data || []).map((search: SavedSearchesRow) => {
      return {
        id: search.id,
        worker_id: search.worker_id,
        name: search.name,
        filters: search.filters as JobFilters,
        is_favorite: search.is_favorite,
        created_at: search.created_at,
        updated_at: search.updated_at,
      }
    })

    return { data: savedSearches, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function getSavedSearchById(id: string): Promise<{
  data: SavedSearch | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error }
    }

    if (!data) {
      return { data: null, error: new Error('Saved search not found') }
    }

    const savedSearch: SavedSearch = {
      id: data.id,
      worker_id: data.worker_id,
      name: data.name,
      filters: data.filters as JobFilters,
      is_favorite: data.is_favorite,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return { data: savedSearch, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function createSavedSearch(
  workerId: string,
  input: CreateSavedSearchInput
): Promise<{
  data: SavedSearch | null
  error: Error | null
}> {
  try {
    const insertData: SavedSearchesInsert = {
      worker_id: workerId,
      name: input.name,
      filters: input.filters as any,
      is_favorite: input.is_favorite ?? false,
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    const savedSearch: SavedSearch = {
      id: data.id,
      worker_id: data.worker_id,
      name: data.name,
      filters: data.filters as JobFilters,
      is_favorite: data.is_favorite,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return { data: savedSearch, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function updateSavedSearch(
  id: string,
  input: UpdateSavedSearchInput
): Promise<{
  data: SavedSearch | null
  error: Error | null
}> {
  try {
    const updateData: SavedSearchesUpdate = {}

    if (input.name !== undefined) {
      updateData.name = input.name
    }
    if (input.filters !== undefined) {
      updateData.filters = input.filters as any
    }
    if (input.is_favorite !== undefined) {
      updateData.is_favorite = input.is_favorite
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    if (!data) {
      return { data: null, error: new Error('Saved search not found') }
    }

    const savedSearch: SavedSearch = {
      id: data.id,
      worker_id: data.worker_id,
      name: data.name,
      filters: data.filters as JobFilters,
      is_favorite: data.is_favorite,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return { data: savedSearch, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function deleteSavedSearch(id: string): Promise<{
  error: Error | null
}> {
  try {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)

    if (error) {
      return { error }
    }

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

export async function toggleSavedSearchFavorite(id: string): Promise<{
  data: SavedSearch | null
  error: Error | null
}> {
  try {
    // First, get the current saved search
    const { data: current, error: fetchError } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      return { data: null, error: fetchError }
    }

    if (!current) {
      return { data: null, error: new Error('Saved search not found') }
    }

    // Toggle the favorite status
    const { data, error } = await supabase
      .from('saved_searches')
      .update({ is_favorite: !current.is_favorite })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    const savedSearch: SavedSearch = {
      id: data.id,
      worker_id: data.worker_id,
      name: data.name,
      filters: data.filters as JobFilters,
      is_favorite: data.is_favorite,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return { data: savedSearch, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
