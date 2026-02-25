import { supabase } from '../client'
import type { Database } from '../types'

export type BadgesRow = Database['public']['Tables']['badges']['Row']
type BadgesInsert = Database['public']['Tables']['badges']['Insert']
type BadgesUpdate = Database['public']['Tables']['badges']['Update']

export type WorkerBadgesRow = Database['public']['Tables']['worker_badges']['Row']
type WorkerBadgesInsert = Database['public']['Tables']['worker_badges']['Insert']
type WorkerBadgesUpdate = Database['public']['Tables']['worker_badges']['Update']

export type BadgeCategory = Database['public']['Enums']['badge_category']
export type BadgeVerificationStatus = Database['public']['Enums']['badge_verification_status']

type BadgeWithRelations = BadgesRow & {
  provider?: {
    id: string
    name: string
  }
}

type WorkerBadgeWithRelations = WorkerBadgesRow & {
  badge?: BadgesRow
  worker?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  verifier?: {
    id: string
    name: string
  }
}

/**
 * Get all badges, optionally filtered by category
 */
export async function getBadges(
  category?: BadgeCategory
): Promise<BadgesRow[]> {
  let query = supabase
    .from('badges')
    .select('*')
    .order('name', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch badges: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single badge by ID
 */
export async function getBadgeById(badgeId: string): Promise<BadgeWithRelations | null> {
  const { data, error } = await supabase
    .from('badges')
    .select(`
      *,
      provider:businesses(id, name)
    `)
    .eq('id', badgeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch badge: ${error.message}`)
  }

  return data
}

/**
 * Get all badges for a specific worker
 */
export async function getWorkerBadges(
  workerId: string,
  status?: BadgeVerificationStatus
): Promise<WorkerBadgeWithRelations[]> {
  let query = supabase
    .from('worker_badges')
    .select(`
      *,
      badge:badges(*),
      worker:workers(id, full_name, avatar_url),
      verifier:businesses(id, name)
    `)
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('verification_status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch worker badges: ${error.message}`)
  }

  return data || []
}

/**
 * Worker requests a new badge (creates a worker_badge record)
 */
export async function requestBadge(
  workerId: string,
  badgeId: string
): Promise<WorkerBadgesRow> {
  // Check if worker already has this badge
  const { data: existing } = await supabase
    .from('worker_badges')
    .select('*')
    .eq('worker_id', workerId)
    .eq('badge_id', badgeId)
    .single()

  if (existing) {
    throw new Error('Worker already has this badge')
  }

  const { data, error } = await supabase
    .from('worker_badges')
    .insert({
      worker_id: workerId,
      badge_id: badgeId,
      verification_status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to request badge: ${error.message}`)
  }

  return data
}

/**
 * Verify a worker's badge (by a business)
 */
export async function verifyBadge(
  workerBadgeId: string,
  verifierId: string,
  status: 'verified' | 'rejected'
): Promise<WorkerBadgesRow> {
  const updateData = {
    verification_status: status,
    verified_by: verifierId,
  } as WorkerBadgesUpdate

  if (status === 'verified') {
    updateData.verified_at = new Date().toISOString()
  }

  const { data, error } = await (supabase as any)
    .from('worker_badges')
    .update(updateData)
    .eq('id', workerBadgeId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to verify badge: ${error.message}`)
  }

  return data
}

/**
 * Get all workers who have a specific badge
 */
export async function getWorkersByBadge(
  badgeId: string,
  status: BadgeVerificationStatus = 'verified'
): Promise<any[]> {
  const { data, error } = await supabase
    .from('worker_badges')
    .select(`
      *,
      worker:workers(*)
    `)
    .eq('badge_id', badgeId)
    .eq('verification_status', status)
    .order('verified_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch workers by badge: ${error.message}`)
  }

  return data || []
}

/**
 * Create a new badge
 */
export async function createBadge(
  badgeData: Omit<BadgesInsert, 'id' | 'created_at'>
): Promise<BadgesRow> {
  const { data, error } = await supabase
    .from('badges')
    .insert(badgeData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create badge: ${error.message}`)
  }

  return data
}

/**
 * Update an existing badge
 */
export async function updateBadge(
  badgeId: string,
  updates: BadgesUpdate
): Promise<BadgesRow> {
  const { data, error } = await supabase
    .from('badges')
    .update(updates)
    .eq('id', badgeId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update badge: ${error.message}`)
  }

  return data
}

/**
 * Delete a badge
 */
export async function deleteBadge(badgeId: string): Promise<void> {
  const { error } = await supabase
    .from('badges')
    .delete()
    .eq('id', badgeId)

  if (error) {
    throw new Error(`Failed to delete badge: ${error.message}`)
  }
}

/**
 * Get pending badge verification requests for a business
 */
export async function getPendingBadgeVerifications(
  businessId: string
): Promise<WorkerBadgeWithRelations[]> {
  const { data, error } = await supabase
    .from('worker_badges')
    .select(`
      *,
      badge:badges(*),
      worker:workers(id, full_name, avatar_url)
    `)
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch pending verifications: ${error.message}`)
  }

  // Filter by badges provided by this business
  const filteredData = data?.filter((wb: any) => wb.badge?.provider_id === businessId) || []

  return filteredData
}

/**
 * Search badges by name or description
 */
export async function searchBadges(
  searchTerm: string,
  category?: BadgeCategory,
  limit: number = 20
): Promise<BadgesRow[]> {
  let query = supabase
    .from('badges')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .order('name', { ascending: true })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to search badges: ${error.message}`)
  }

  return data || []
}

/**
 * Get badges by provider (business)
 */
export async function getBadgesByProvider(providerId: string): Promise<BadgesRow[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .eq('provider_id', providerId)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch provider badges: ${error.message}`)
  }

  return data || []
}

/**
 * Get a worker badge by ID
 */
export async function getWorkerBadgeById(
  workerBadgeId: string
): Promise<WorkerBadgeWithRelations | null> {
  const { data, error } = await (supabase as any)
    .from('worker_badges')
    .select(`
      *,
      badge:badges(*),
      worker:workers(id, full_name, avatar_url),
      verifier:businesses(id, name)
    `)
    .eq('id', workerBadgeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch worker badge: ${error.message}`)
  }

  return data as WorkerBadgeWithRelations | null
}

/**
 * Delete a worker badge (remove badge from worker)
 */
export async function deleteWorkerBadge(workerBadgeId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('worker_badges')
    .delete()
    .eq('id', workerBadgeId)

  if (error) {
    throw new Error(`Failed to delete worker badge: ${error.message}`)
  }
}
