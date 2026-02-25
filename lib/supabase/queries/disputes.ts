import { supabase } from '../client'
import type { Database } from '../types'

type DisputeRow = Database['public']['Tables']['disputes']['Row']
type DisputeInsert = Database['public']['Tables']['disputes']['Insert']
type DisputeUpdate = Database['public']['Tables']['disputes']['Update']

export type DisputeWithDetails = DisputeRow & {
  booking?: {
    id: string
    status: string
    final_price: number
    job?: {
      id: string
      title: string
    }
    worker?: {
      id: string
      full_name: string
      phone: string
      email: string
    }
    business?: {
      id: string
      name: string
      phone: string
      email: string
    }
  }
}

/**
 * Get a single dispute by ID with related booking details
 */
export async function getDisputeById(disputeId: string) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        bookings (
          id,
          status,
          final_price,
          jobs (
            id,
            title
          ),
          workers (
            id,
            full_name,
            phone,
            email
          ),
          businesses (
            id,
            name,
            phone,
            email
          )
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
 * Get all disputes for a specific booking
 */
export async function getDisputesByBookingId(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching disputes by booking:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching disputes by booking:', error)
    return { data: null, error }
  }
}

/**
 * Get all disputes for a business
 */
export async function getBusinessDisputes(businessId: string) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        bookings (
          id,
          status,
          final_price,
          jobs (
            id,
            title
          ),
          workers (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('bookings.business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching business disputes:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching business disputes:', error)
    return { data: null, error }
  }
}

/**
 * Get all disputes for a worker
 */
export async function getWorkerDisputes(workerId: string) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        bookings (
          id,
          status,
          final_price,
          jobs (
            id,
            title
          ),
          businesses (
            id,
            name,
            phone,
            email
          )
        )
      `)
      .eq('bookings.worker_id', workerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching worker disputes:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker disputes:', error)
    return { data: null, error }
  }
}

/**
 * Get all pending or investigating disputes (admin view)
 */
export async function getPendingDisputes() {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        bookings (
          id,
          status,
          final_price,
          jobs (
            id,
            title,
            budget_max
          ),
          workers (
            id,
            full_name,
            phone,
            email
          ),
          businesses (
            id,
            name,
            phone,
            email
          )
        )
      `)
      .in('status', ['pending', 'investigating'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching pending disputes:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching pending disputes:', error)
    return { data: null, error }
  }
}

/**
 * Create a new dispute
 */
export async function createDispute(
  disputeData: Omit<DisputeInsert, 'id' | 'created_at' | 'updated_at'>
) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .insert(disputeData)
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
  status: 'pending' | 'investigating' | 'resolved' | 'rejected'
) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
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
 * Update dispute resolution
 * - Sets status, resolution text, and resolved_at timestamp
 */
export async function updateDisputeResolution(
  disputeId: string,
  resolution: {
    status: 'resolved' | 'rejected'
    resolution: string
    admin_notes?: string
  }
) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: resolution.status,
        resolution: resolution.resolution,
        admin_notes: resolution.admin_notes || null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single()

    if (error) {
      console.error('Error updating dispute resolution:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error updating dispute resolution:', error)
    return { data: null, error }
  }
}

/**
 * Check if a booking has an active dispute (pending or investigating)
 */
export async function checkActiveDispute(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('booking_id', bookingId)
      .in('status', ['pending', 'investigating'])
      .maybeSingle()

    if (error) {
      console.error('Error checking active dispute:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error checking active dispute:', error)
    return { data: null, error }
  }
}
