"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { createNotification } from "./notifications"

type Message = Database["public"]["Tables"]["messages"]["Row"]

// Type for inserting a new message
type MessageInsert = Pick<Message, 'sender_id' | 'receiver_id' | 'content' | 'booking_id' | 'is_read'>

export type MessageResult = {
  success: boolean
  error?: string
  data?: Message
}

export type MessagesListResult = {
  success: boolean
  error?: string
  data?: Message[]
  count?: number
}

/**
 * Send a new message from one user to another
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  bookingId?: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient()

    const newMessage: MessageInsert = {
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      booking_id: bookingId || null,
      is_read: false,
    }

    const { data, error } = await supabase
      .from("messages")
      .insert(newMessage)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal mengirim pesan: ${error.message}` }
    }

    // Create notification for the receiver
    try {
      // Fetch sender's user profile to get their name
      const { data: senderProfile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", senderId)
        .single()

      const senderName = senderProfile?.full_name || "Seseorang"
      const messagePreview = content.length > 50 ? content.substring(0, 50) + "..." : content

      await createNotification(
        receiverId,
        `Pesan Baru dari ${senderName}`,
        messagePreview,
        "/messages"
      )
    } catch (notificationError) {
      // Don't fail the message send if notification creation fails
      // The message was already sent successfully
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengirim pesan" }
  }
}

/**
 * Mark a specific message as read
 */
export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient()

    // Verify the message is sent to the user
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("receiver_id", userId)
      .single()

    if (fetchError || !message) {
      return { success: false, error: "Pesan tidak ditemukan" }
    }

    // Update the message as read
    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId)
      .eq("receiver_id", userId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal menandai pesan: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menandai pesan" }
  }
}

/**
 * Mark all messages as read for a specific user (messages received by the user)
 */
export async function markAllMessagesAsRead(userId: string): Promise<MessageResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .select()

    if (error) {
      return { success: false, error: `Gagal menandai semua pesan: ${error.message}` }
    }

    return { success: true, data: data?.[0] }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menandai semua pesan" }
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false)

    if (error) {
      return { success: false, error: `Gagal mengambil jumlah pesan: ${error.message}` }
    }

    return { success: true, count: count || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil jumlah pesan" }
  }
}

/**
 * Get messages between two users, ordered by created_at (newest first)
 */
export async function getMessages(
  userId: string,
  otherUserId: string,
  limit: number = 50
): Promise<MessagesListResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: `Gagal mengambil pesan: ${error.message}` }
    }

    return { success: true, data, count: data?.length || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pesan" }
  }
}

/**
 * Get all messages for a user (both sent and received), ordered by created_at (newest first)
 */
export async function getUserMessages(
  userId: string,
  limit: number = 50
): Promise<MessagesListResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: `Gagal mengambil pesan: ${error.message}` }
    }

    return { success: true, data, count: data?.length || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pesan" }
  }
}

/**
 * Get unread messages for a user
 */
export async function getUnreadMessages(userId: string): Promise<MessagesListResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: `Gagal mengambil pesan: ${error.message}` }
    }

    return { success: true, data, count: data?.length || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pesan" }
  }
}

/**
 * Get messages for a specific booking
 */
export async function getBookingMessages(
  bookingId: string,
  limit: number = 50
): Promise<MessagesListResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .limit(limit)

    if (error) {
      return { success: false, error: `Gagal mengambil pesan: ${error.message}` }
    }

    return { success: true, data, count: data?.length || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pesan" }
  }
}

/**
 * Delete a specific message
 */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient()

    // Verify the message belongs to the user (either sender or receiver)
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .single()

    if (fetchError || !message) {
      return { success: false, error: "Pesan tidak ditemukan" }
    }

    // Delete the message
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

    if (error) {
      return { success: false, error: `Gagal menghapus pesan: ${error.message}` }
    }

    return { success: true, data: message }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menghapus pesan" }
  }
}
