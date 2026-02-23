"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"

type Notification = Database["public"]["Tables"]["notifications"]["Row"]

// Type for inserting a new notification
type NotificationInsert = Pick<Notification, 'user_id' | 'title' | 'body' | 'link' | 'is_read'>

export type NotificationResult = {
  success: boolean
  error?: string
  data?: Notification
}

export type NotificationsListResult = {
  success: boolean
  error?: string
  data?: Notification[]
  count?: number
}

/**
 * Create a new notification for a user
 */
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  link?: string
): Promise<NotificationResult> {
  try {
    const supabase = await createClient()

    const newNotification: NotificationInsert = {
      user_id: userId,
      title,
      body,
      link: link || null,
      is_read: false,
    }

    const { data, error } = await (supabase
      .from("notifications") as any)
      .insert(newNotification)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membuat notifikasi: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat notifikasi" }
  }
}

/**
 * Mark a specific notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<NotificationResult> {
  try {
    const supabase = await createClient()

    // Verify the notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("user_id", userId)
      .single()

    if (fetchError || !notification) {
      return { success: false, error: "Notifikasi tidak ditemukan" }
    }

    // Update the notification as read
    const { data, error } = await (supabase
      .from("notifications") as any)
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal menandai notifikasi: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menandai notifikasi" }
  }
}

/**
 * Mark all notifications as read for a specific user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<NotificationResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await (supabase
      .from("notifications") as any)
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select()

    if (error) {
      return { success: false, error: `Gagal menandai semua notifikasi: ${error.message}` }
    }

    return { success: true, data: data?.[0] }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menandai semua notifikasi" }
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    if (error) {
      return { success: false, error: `Gagal mengambil jumlah notifikasi: ${error.message}` }
    }

    return { success: true, count: count || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil jumlah notifikasi" }
  }
}

/**
 * Get all notifications for a user, ordered by created_at (newest first)
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50
): Promise<NotificationsListResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: `Gagal mengambil notifikasi: ${error.message}` }
    }

    return { success: true, data, count: data?.length || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil notifikasi" }
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string): Promise<NotificationsListResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: `Gagal mengambil notifikasi: ${error.message}` }
    }

    return { success: true, data, count: data?.length || 0 }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil notifikasi" }
  }
}

/**
 * Delete a specific notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<NotificationResult> {
  try {
    const supabase = await createClient()

    // Verify the notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("user_id", userId)
      .single()

    if (fetchError || !notification) {
      return { success: false, error: "Notifikasi tidak ditemukan" }
    }

    // Delete the notification
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId)

    if (error) {
      return { success: false, error: `Gagal menghapus notifikasi: ${error.message}` }
    }

    return { success: true, data: notification }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menghapus notifikasi" }
  }
}
