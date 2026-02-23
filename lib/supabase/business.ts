import { supabase } from './client'
import type { Database } from './types'

type BusinessRow = Database['public']['Tables']['businesses']['Row']
type BusinessInsert = any
type BusinessUpdate = any

/**
 * Get a business profile by user ID
 * @param userId - The user ID to fetch the business profile for
 * @returns The business profile or error
 */
export async function getBusinessProfile(
  userId: string
): Promise<{ data: BusinessRow | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: undefined }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get business profile',
    }
  }
}

/**
 * Get a business profile by business ID
 * @param businessId - The business ID to fetch the profile for
 * @returns The business profile or error
 */
export async function getBusinessProfileById(
  businessId: string
): Promise<{ data: BusinessRow | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: undefined }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get business profile',
    }
  }
}

/**
 * Create a new business profile
 * @param businessData - The business profile data to insert
 * @returns The created business profile or error
 */
export async function createBusinessProfile(
  businessData: BusinessInsert
): Promise<{ data: BusinessRow | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .insert(businessData)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: undefined }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create business profile',
    }
  }
}

/**
 * Update an existing business profile
 * @param businessId - The business ID to update
 * @param businessData - The business profile data to update
 * @returns The updated business profile or error
 */
export async function updateBusinessProfile(
  businessId: string,
  businessData: BusinessUpdate
): Promise<{ data: BusinessRow | null; error?: string }> {
  try {
    const { data, error } = await (supabase
      .from('businesses') as any)
      .update(businessData)
      .eq('id', businessId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: undefined }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update business profile',
    }
  }
}

/**
 * Delete a business profile
 * @param businessId - The business ID to delete
 * @returns Success or error
 */
export async function deleteBusinessProfile(
  businessId: string
): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId)

    if (error) {
      return { error: error.message }
    }

    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete business profile',
    }
  }
}
