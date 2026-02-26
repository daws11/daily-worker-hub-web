// @ts-nocheck
import { supabase } from "../../../supabase/client"
import type { Database } from "../../../supabase/types"

type DisputeRow = Database["public"]["Tables"]["disputes"]["Row"]
type DisputeInsert = Database["public"]["Tables"]["disputes"]["Insert"]
type DisputeUpdate = Database["public"]["Tables"]["disputes"]["Update"]

export type DisputeWithDetails = DisputeRow & {
  booking: {
    id: string
    status: string
    final_price: number
    job: {
      id: string
      title: string
    }
  }
  raised_by_user: {
    id: string
    full_name: string
    email: string
    role: 'worker' | 'business' | 'admin'
  }
}

/**
 * Get all disputes for a specific booking
 */
export async function getBookingDisputes(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings!inner(
          id,
          status,
          final_price,
          job:jobs!inner(
            id,
            title
          )
        ),
        raised_by_user:users!inner(
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching booking disputes:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching booking disputes:', error)
    return { data: null, error }
  }
}

/**
 * Get all disputes for a user (raised by or involving their bookings)
 */
export async function getUserDisputes(userId: string) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings!inner(
          id,
          status,
          final_price,
          worker_id,
          business_id,
          job:jobs!inner(
            id,
            title
          )
        ),
        raised_by_user:users!inner(
          id,
          full_name,
          email,
          role
        )
      `)
      .or(`raised_by.eq.${userId},bookings.worker_id.eq.${userId},bookings.business_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user disputes:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching user disputes:', error)
    return { data: null, error }
  }
}

/**
 * Get all disputes (admin view)
 */
export async function getAllDisputes(status?: DisputeRow['status']) {
  try {
    let query = supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings!inner(
          id,
          status,
          final_price,
          worker_id,
          business_id,
          job:jobs!inner(
            id,
            title
          )
        ),
        raised_by_user:users!inner(
          id,
          full_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching all disputes:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching all disputes:', error)
    return { data: null, error }
  }
}

/**
 * Get a single dispute by ID
 */
export async function getDisputeById(disputeId: string) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings!inner(
          id,
          status,
          final_price,
          worker_id,
          business_id,
          job:jobs!inner(
            id,
            title,
            budget_max
          )
        ),
        raised_by_user:users!inner(
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('id', disputeId)
      .single()

    if (error) {
      console.error('Error fetching dispute:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching dispute:', error)
    return { data: null, error }
  }
}

/**
 * Create a new dispute
 */
export async function createDispute(dispute: Omit<DisputeInsert, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .insert(dispute)
      .select()
      .single()

    if (error) {
      console.error('Error creating dispute:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error creating dispute:', error)
    return { data: null, error }
  }
}

/**
 * Update dispute status
 */
export async function updateDisputeStatus(
  disputeId: string,
  status: 'pending' | 'investigating' | 'resolved' | 'rejected',
  resolution?: string | null,
  adminNotes?: string | null
) {
  try {
    const updateData: DisputeUpdate = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution
    }

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes
    }

    // If resolving or rejecting, set resolved_at
    if (status === 'resolved' || status === 'rejected') {
      updateData.resolved_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('disputes')
      .update(updateData)
      .eq('id', disputeId)
      .select()
      .single()

    if (error) {
      console.error('Error updating dispute status:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error updating dispute status:', error)
    return { data: null, error }
  }
}

/**
 * Check if a booking has an active dispute
 */
export async function hasActiveDispute(bookingId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('id')
      .eq('booking_id', bookingId)
      .in('status', ['pending', 'investigating'])
      .limit(1)

    if (error) {
      console.error('Error checking for active disputes:', error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Unexpected error checking for active disputes:', error)
    return false
  }
}

/**
 * Get disputes by status
 */
export async function getDisputesByStatus(status: DisputeRow['status']) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings!inner(
          id,
          status,
          final_price,
          job:jobs!inner(
            id,
            title
          )
        ),
        raised_by_user:users!inner(
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching disputes by status:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching disputes by status:', error)
    return { data: null, error }
  }
}

/**
 * Delete a dispute (admin only)
 */
export async function deleteDispute(disputeId: string) {
  try {
    const { error } = await supabase
      .from('disputes')
      .delete()
      .eq('id', disputeId)

    if (error) {
      console.error('Error deleting dispute:', error)
      return { error }
    }

    return { error: null }
  } catch (error) {
    console.error('Unexpected error deleting dispute:', error)
    return { error }
  }
}
