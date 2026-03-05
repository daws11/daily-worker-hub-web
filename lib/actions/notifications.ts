"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { sendEmail } from "../notifications/email"
import { ApplicationReceivedEmail } from "../notifications/templates/application-received"
import { ApplicationStatusUpdateEmail } from "../notifications/templates/application-status-update"
import { BookingConfirmedEmail } from "../notifications/templates/booking-confirmed"
import { PaymentReceiptEmail } from "../notifications/templates/payment-receipt"
import { JobReminderEmail } from "../notifications/templates/job-reminder"

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

// ============================================
// EMAIL NOTIFICATION TRIGGERS
// ============================================

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dailyworkerhub.id"

/**
 * Send notification when a worker applies to a job
 * Notifies the business owner
 */
export async function notifyApplicationReceived(data: {
  businessUserId: string
  businessName: string
  businessEmail: string
  workerName: string
  workerEmail: string
  jobTitle: string
  applicationId: string
  workerSkills?: string[]
  workerExperience?: string
}): Promise<NotificationResult> {
  try {
    const supabase = await createClient()

    // Create in-app notification
    const notificationResult = await createNotification(
      data.businessUserId,
      "Lamaran Baru Diterima",
      `${data.workerName} telah melamar untuk posisi ${data.jobTitle}`,
      `/applications/${data.applicationId}`
    )

    // Send email notification
    await sendEmail({
      to: data.businessEmail,
      subject: `Lamaran Baru: ${data.workerName} melamar untuk ${data.jobTitle}`,
      react: ApplicationReceivedEmail({
        businessName: data.businessName,
        workerName: data.workerName,
        jobTitle: data.jobTitle,
        applicationId: data.applicationId,
        workerSkills: data.workerSkills,
        workerExperience: data.workerExperience,
        applicationDate: new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        dashboardUrl: DASHBOARD_URL,
      }),
    })

    return notificationResult
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengirim notifikasi lamaran" }
  }
}

/**
 * Send notification when application status changes
 * Notifies the worker
 */
export async function notifyApplicationStatusUpdate(data: {
  workerUserId: string
  workerName: string
  workerEmail: string
  jobTitle: string
  businessName: string
  status: "accepted" | "rejected" | "pending" | "reviewing"
  statusMessage?: string
  applicationId: string
  nextSteps?: string
}): Promise<NotificationResult> {
  try {
    const statusText = {
      accepted: "Diterima",
      rejected: "Ditolak",
      pending: "Menunggu",
      reviewing: "Sedang Ditinjau",
    }

    // Create in-app notification
    const notificationResult = await createNotification(
      data.workerUserId,
      `Status Lamaran ${statusText[data.status]}`,
      `Lamaran Anda untuk ${data.jobTitle} di ${data.businessName} telah ${statusText[data.status].toLowerCase()}`,
      `/applications/${data.applicationId}`
    )

    // Send email notification
    await sendEmail({
      to: data.workerEmail,
      subject: `Update Lamaran: ${data.jobTitle} - ${statusText[data.status]}`,
      react: ApplicationStatusUpdateEmail({
        workerName: data.workerName,
        jobTitle: data.jobTitle,
        businessName: data.businessName,
        status: data.status,
        statusMessage: data.statusMessage,
        applicationId: data.applicationId,
        nextSteps: data.nextSteps,
        dashboardUrl: DASHBOARD_URL,
      }),
    })

    return notificationResult
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengirim notifikasi status" }
  }
}

/**
 * Send notification when booking is confirmed
 * Notifies both worker and business
 */
export async function notifyBookingConfirmed(data: {
  workerUserId: string
  workerName: string
  workerEmail: string
  businessUserId: string
  businessName: string
  businessEmail: string
  jobTitle: string
  startDate: string
  endDate?: string
  location: string
  dailyWage: number
  totalDays?: number
  bookingId: string
  specialInstructions?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Create notification for worker
    await createNotification(
      data.workerUserId,
      "Booking Dikonfirmasi!",
      `Booking Anda dengan ${data.businessName} untuk ${data.jobTitle} telah dikonfirmasi`,
      `/bookings/${data.bookingId}`
    )

    // Create notification for business
    await createNotification(
      data.businessUserId,
      "Booking Dikonfirmasi!",
      `Booking dengan ${data.workerName} untuk ${data.jobTitle} telah dikonfirmasi`,
      `/bookings/${data.bookingId}`
    )

    // Send email to worker
    await sendEmail({
      to: data.workerEmail,
      subject: `Booking Dikonfirmasi: ${data.jobTitle} di ${data.businessName}`,
      react: BookingConfirmedEmail({
        recipientName: data.workerName,
        recipientType: "worker",
        jobTitle: data.jobTitle,
        workerName: data.workerName,
        businessName: data.businessName,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        dailyWage: data.dailyWage,
        totalDays: data.totalDays,
        bookingId: data.bookingId,
        specialInstructions: data.specialInstructions,
        dashboardUrl: DASHBOARD_URL,
      }),
    })

    // Send email to business
    await sendEmail({
      to: data.businessEmail,
      subject: `Booking Dikonfirmasi: ${data.workerName} untuk ${data.jobTitle}`,
      react: BookingConfirmedEmail({
        recipientName: data.businessName,
        recipientType: "business",
        jobTitle: data.jobTitle,
        workerName: data.workerName,
        businessName: data.businessName,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        dailyWage: data.dailyWage,
        totalDays: data.totalDays,
        bookingId: data.bookingId,
        specialInstructions: data.specialInstructions,
        dashboardUrl: DASHBOARD_URL,
      }),
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengirim notifikasi booking" }
  }
}

/**
 * Send notification when payment is completed
 * Notifies the worker with receipt
 */
export async function notifyPaymentCompleted(data: {
  workerUserId: string
  workerName: string
  workerEmail: string
  businessName: string
  jobTitle: string
  paymentId: string
  paymentDate: string
  amount: number
  paymentMethod?: string
  workPeriod: string
  totalDays: number
  dailyRate: number
  deductions?: { description: string; amount: number }[]
  bonuses?: { description: string; amount: number }[]
}): Promise<NotificationResult> {
  try {
    const formattedAmount = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(data.amount)

    // Create in-app notification
    const notificationResult = await createNotification(
      data.workerUserId,
      "Pembayaran Diterima",
      `Pembayaran sebesar ${formattedAmount} dari ${data.businessName} telah berhasil`,
      `/payments/${data.paymentId}`
    )

    // Send email receipt
    await sendEmail({
      to: data.workerEmail,
      subject: `Bukti Pembayaran: ${formattedAmount} dari ${data.businessName}`,
      react: PaymentReceiptEmail({
        workerName: data.workerName,
        businessName: data.businessName,
        jobTitle: data.jobTitle,
        paymentId: data.paymentId,
        paymentDate: data.paymentDate,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        workPeriod: data.workPeriod,
        totalDays: data.totalDays,
        dailyRate: data.dailyRate,
        deductions: data.deductions,
        bonuses: data.bonuses,
        dashboardUrl: DASHBOARD_URL,
      }),
    })

    return notificationResult
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengirim notifikasi pembayaran" }
  }
}

/**
 * Send job reminder notification
 * Notifies worker about upcoming job
 */
export async function notifyJobReminder(data: {
  workerUserId: string
  workerName: string
  workerEmail: string
  jobTitle: string
  businessName: string
  startTime: string
  endTime: string
  location: string
  locationUrl?: string
  contactPerson?: string
  contactPhone?: string
  specialNotes?: string
  dressCode?: string
  items?: string[]
  bookingId: string
}): Promise<NotificationResult> {
  try {
    // Create in-app notification
    const notificationResult = await createNotification(
      data.workerUserId,
      "Pengingat Pekerjaan Besok",
      `Jangan lupa! Anda bekerja di ${data.businessName} besok (${data.startTime})`,
      `/bookings/${data.bookingId}`
    )

    // Send email reminder
    await sendEmail({
      to: data.workerEmail,
      subject: `⏰ Pengingat: Pekerjaan di ${data.businessName} Besok!`,
      react: JobReminderEmail({
        workerName: data.workerName,
        jobTitle: data.jobTitle,
        businessName: data.businessName,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        locationUrl: data.locationUrl,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        specialNotes: data.specialNotes,
        dressCode: data.dressCode,
        items: data.items,
        bookingId: data.bookingId,
        dashboardUrl: DASHBOARD_URL,
      }),
    })

    return notificationResult
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengirim pengingat pekerjaan" }
  }
}
