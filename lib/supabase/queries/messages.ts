import { supabase } from "../client"
import type { Database } from "../types"
import type { MessageWithRelations, UnreadCountResponse, MarkAsReadInput } from "../../types/message"

type MessageRow = Database["public"]["Tables"]["messages"]["Row"]
type MessageUpdate = Database["public"]["Tables"]["messages"]["Update"]

/**
 * Get all messages for a specific booking
 */
export async function getBookingMessages(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        receiver:users!messages_receiver_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        booking:bookings!messages_booking_id_fkey(
          id,
          job_id,
          status
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching booking messages:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching booking messages:', error)
    return { data: null, error }
  }
}

/**
 * Get all messages for a specific user (as sender or receiver)
 */
export async function getUserMessages(userId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        receiver:users!messages_receiver_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        booking:bookings!messages_booking_id_fkey(
          id,
          job_id,
          status
        )
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user messages:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching user messages:', error)
    return { data: null, error }
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId: string): Promise<{ data: UnreadCountResponse | null; error: any }> {
  try {
    // Get total unread count
    const { count: totalCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false)

    if (countError) {
      console.error('Error fetching unread count:', countError)
      return { data: null, error: countError }
    }

    // Get unread count grouped by booking
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('booking_id')
      .eq('receiver_id', userId)
      .eq('is_read', false)

    if (messagesError) {
      console.error('Error fetching unread messages by booking:', messagesError)
      return { data: null, error: messagesError }
    }

    // Group by booking_id
    const byBooking: { booking_id: string; count: number }[] = []
    const bookingCounts = new Map<string, number>()

    for (const msg of messagesData || []) {
      if (msg.booking_id) {
        bookingCounts.set(msg.booking_id, (bookingCounts.get(msg.booking_id) || 0) + 1)
      }
    }

    // Convert Map entries to array to avoid downlevel iteration issues
    const bookingEntries = Array.from(bookingCounts.entries())
    for (const [bookingId, count] of bookingEntries) {
      byBooking.push({ booking_id: bookingId, count })
    }

    const result: UnreadCountResponse = {
      total_unread: totalCount || 0,
      by_booking: byBooking
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error fetching unread count:', error)
    return { data: null, error }
  }
}

/**
 * Get unread message count for a specific booking
 */
export async function getBookingUnreadCount(bookingId: string, userId: string) {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('booking_id', bookingId)
      .eq('receiver_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error fetching booking unread count:', error)
      return { data: null, error }
    }

    return { data: count || 0, error: null }
  } catch (error) {
    console.error('Unexpected error fetching booking unread count:', error)
    return { data: null, error }
  }
}

/**
 * Mark a single message as read
 */
export async function markMessageAsRead(messageId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      console.error('Error marking message as read:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error marking message as read:', error)
    return { data: null, error }
  }
}

/**
 * Mark all messages for a booking as read for a specific receiver
 */
export async function markBookingMessagesAsRead(bookingId: string, receiverId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('booking_id', bookingId)
      .eq('receiver_id', receiverId)
      .eq('is_read', false)
      .select()

    if (error) {
      console.error('Error marking booking messages as read:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error marking booking messages as read:', error)
    return { data: null, error }
  }
}

/**
 * Mark all messages from a sender as read for a specific receiver
 */
export async function markSenderMessagesAsRead(senderId: string, receiverId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('is_read', false)
      .select()

    if (error) {
      console.error('Error marking sender messages as read:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error marking sender messages as read:', error)
    return { data: null, error }
  }
}

/**
 * Mark messages as read based on input parameters
 * Supports marking by message_id, booking_id, or sender_id
 */
export async function markAsRead(input: MarkAsReadInput) {
  try {
    let query = supabase
      .from('messages')
      .update({ is_read: true })

    if (input.message_id) {
      query = query.eq('id', input.message_id)
    } else if (input.booking_id) {
      query = query.eq('booking_id', input.booking_id)
      // If marking by booking, we also need receiver_id to avoid marking sender's own messages
      if (input.sender_id) {
        query = query.eq('sender_id', input.sender_id)
      }
    } else if (input.sender_id) {
      query = query.eq('sender_id', input.sender_id)
      // If marking by sender, we also need receiver_id
      // This is handled by the caller typically
    }

    const { data, error } = await query.select()

    if (error) {
      console.error('Error marking messages as read:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error marking messages as read:', error)
    return { data: null, error }
  }
}

/**
 * Get a single message by ID
 */
export async function getMessageById(messageId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        receiver:users!messages_receiver_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        booking:bookings!messages_booking_id_fkey(
          id,
          job_id,
          status
        )
      `)
      .eq('id', messageId)
      .single()

    if (error) {
      console.error('Error fetching message:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching message:', error)
    return { data: null, error }
  }
}

/**
 * Get conversation between two users for a specific booking
 */
export async function getConversation(bookingId: string, userId1: string, userId2: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        receiver:users!messages_receiver_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('booking_id', bookingId)
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching conversation:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching conversation:', error)
    return { data: null, error }
  }
}

/**
 * Get all conversations (message threads) for a user
 * Returns the last message for each booking they have messages in
 */
export async function getUserConversations(userId: string) {
  try {
    // Get all unique booking_ids where user has messages
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('messages')
      .select('booking_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .not('booking_id', 'is', null)

    if (bookingsError) {
      console.error('Error fetching user conversation bookings:', bookingsError)
      return { data: null, error: bookingsError }
    }

    // Get unique booking IDs
    const uniqueBookingIds = Array.from(new Set(bookingsData?.map(m => m.booking_id).filter(Boolean) as string[]))

    if (uniqueBookingIds.length === 0) {
      return { data: [], error: null }
    }

    // For each booking, get the most recent message
    const conversations = await Promise.all(
      uniqueBookingIds.map(async (bookingId) => {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey(
              id,
              full_name,
              avatar_url,
              role
            ),
            receiver:users!messages_receiver_id_fkey(
              id,
              full_name,
              avatar_url,
              role
            ),
            booking:bookings!messages_booking_id_fkey(
              id,
              job_id,
              status
            )
          `)
          .eq('booking_id', bookingId)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return data
      })
    )

    // Filter out nulls and sort by most recent
    const validConversations = conversations.filter((c): c is NonNullable<typeof c> => c !== null)
    validConversations.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return { data: validConversations, error: null }
  } catch (error) {
    console.error('Unexpected error fetching user conversations:', error)
    return { data: null, error }
  }
}
