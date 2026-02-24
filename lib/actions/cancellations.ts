"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { createNotification } from "../actions/notifications"

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type CancellationReason = Database["public"]["Tables"]["cancellation_reasons"]["Row"]
type Worker = Database["public"]["Tables"]["workers"]["Row"]
type Business = Database["public"]["Tables"]["businesses"]["Row"]
type Job = Database["public"]["Tables"]["jobs"]["Row"]

export type CancellationResult = {
  success: boolean
  error?: string
  data?: Booking
}

export type CancellationReasonsListResult = {
  success: boolean
  error?: string
  data?: CancellationReason[]
}

/**
 * Get all active cancellation reasons, ordered by sort_order
 */
export async function getActiveCancellationReasons(): Promise<CancellationReasonsListResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("cancellation_reasons")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) {
      return { success: false, error: `Gagal mengambil alasan pembatalan: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil alasan pembatalan" }
  }
}

/**
 * Cancel a booking with a reason and notify the affected party
 * Can be called by either workers or businesses
 */
export async function cancelBookingWithReason(
  bookingId: string,
  cancellationReasonId: string,
  cancellationNote?: string,
  options?: {
    workerId?: string
    businessId?: string
  }
): Promise<CancellationResult> {
  try {
    const supabase = await createClient()

    // Determine which role is cancelling and build the query accordingly
    if (!options?.workerId && !options?.businessId) {
      return { success: false, error: "Worker ID atau Business ID harus diberikan" }
    }

    // Fetch the booking with job, worker, and business details
    let bookingQuery = supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title
        ),
        workers (
          id,
          user_id,
          full_name
        ),
        businesses (
          id,
          user_id,
          name
        )
      `)
      .eq("id", bookingId)

    if (options?.workerId) {
      bookingQuery = bookingQuery.eq("worker_id", options.workerId)
    } else if (options?.businessId) {
      bookingQuery = bookingQuery.eq("business_id", options.businessId)
    }

    const { data: bookingResult, error: fetchError } = await bookingQuery.single()

    if (fetchError || !bookingResult) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    const booking = bookingResult as Booking & {
      jobs: Job
      workers: Worker
      businesses: Business
    }

    const bookingData = booking as Booking

    // Validate booking status - only allow cancellation of accepted or in_progress bookings
    if (bookingData.status !== "accepted" && bookingData.status !== "in_progress") {
      return { success: false, error: "Hanya booking yang diterima atau sedang berlangsung yang bisa dibatalkan" }
    }

    // Get cancellation reason details
    const { data: reason, error: reasonError } = await supabase
      .from("cancellation_reasons")
      .select("*")
      .eq("id", cancellationReasonId)
      .single()

    if (reasonError || !reason) {
      return { success: false, error: "Alasan pembatalan tidak valid" }
    }

    // Update the booking status to cancelled with cancellation details
    const { data: updatedBooking, error: updateError } = await (supabase
      .from("bookings") as any)
      .update({
        status: "cancelled",
        cancellation_reason_id: cancellationReasonId,
        cancellation_note: cancellationNote || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal membatalkan booking: ${updateError.message}` }
    }

    // Determine who to notify and create appropriate notification
    const cancellingParty = options?.workerId ? "worker" : "business"
    const notifierName = cancellingParty === "worker" ? booking.workers.full_name : booking.businesses.name
    const jobTitle = booking.jobs.title

    let notifyUserId: string
    let notificationTitle: string
    let notificationBody: string

    if (cancellingParty === "worker") {
      // Worker cancelled - notify business
      notifyUserId = booking.businesses.user_id
      notificationTitle = "Pekerja Membatalkan Booking"
      notificationBody = `${notifierName} telah membatalkan booking untuk pekerjaan "${jobTitle}". Alasan: ${reason.name}${cancellationNote ? `. Catatan: ${cancellationNote}` : ""}`
    } else {
      // Business cancelled - notify worker
      notifyUserId = booking.workers.user_id
      notificationTitle = "Booking Dibatalkan"
      notificationBody = `Booking untuk pekerjaan "${jobTitle}" telah dibatalkan oleh ${notifierName}. Alasan: ${reason.name}${cancellationNote ? `. Catatan: ${cancellationNote}` : ""}`
    }

    // Create notification for the affected party
    const notificationResult = await createNotification(
      notifyUserId,
      notificationTitle,
      notificationBody,
      `/bookings/${bookingId}`
    )

    // Don't fail the cancellation if notification fails, but continue with the operation

    return { success: true, data: updatedBooking }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membatalkan booking" }
  }
}

/**
 * Worker cancels an accepted booking with a reason
 * Only allows cancellation of accepted bookings (in progress)
 */
export async function workerCancelBooking(
  bookingId: string,
  workerId: string,
  cancellationReasonId: string,
  cancellationNote?: string
): Promise<CancellationResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the worker
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    const bookingData = booking as Booking

    if (bookingData.status !== "accepted" && bookingData.status !== "in_progress") {
      return { success: false, error: "Hanya booking yang diterima atau sedang berlangsung yang bisa dibatalkan" }
    }

    // Get cancellation reason to check penalty
    const { data: reason, error: reasonError } = await supabase
      .from("cancellation_reasons")
      .select("*")
      .eq("id", cancellationReasonId)
      .single()

    if (reasonError || !reason) {
      return { success: false, error: "Alasan pembatalan tidak valid" }
    }

    // Update the booking status to cancelled with cancellation details
    const { data, error } = await (supabase
      .from("bookings") as any)
      .update({
        status: "cancelled",
        cancellation_reason_id: cancellationReasonId,
        cancellation_note: cancellationNote || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membatalkan booking: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membatalkan booking" }
  }
}

/**
 * Business cancels an accepted booking with a reason
 * Only allows cancellation of accepted bookings (in progress)
 */
export async function businessCancelBooking(
  bookingId: string,
  businessId: string,
  cancellationReasonId: string,
  cancellationNote?: string
): Promise<CancellationResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the business
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    const bookingData = booking as Booking

    if (bookingData.status !== "accepted" && bookingData.status !== "in_progress") {
      return { success: false, error: "Hanya booking yang diterima atau sedang berlangsung yang bisa dibatalkan" }
    }

    // Get cancellation reason to check penalty
    const { data: reason, error: reasonError } = await supabase
      .from("cancellation_reasons")
      .select("*")
      .eq("id", cancellationReasonId)
      .single()

    if (reasonError || !reason) {
      return { success: false, error: "Alasan pembatalan tidak valid" }
    }

    // Update the booking status to cancelled with cancellation details
    const { data, error } = await (supabase
      .from("bookings") as any)
      .update({
        status: "cancelled",
        cancellation_reason_id: cancellationReasonId,
        cancellation_note: cancellationNote || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membatalkan booking: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membatalkan booking" }
  }
}

/**
 * Get cancellation reason by ID
 */
export async function getCancellationReason(
  reasonId: string
): Promise<{ success: boolean; data?: CancellationReason; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("cancellation_reasons")
      .select("*")
      .eq("id", reasonId)
      .single()

    if (error) {
      return { success: false, error: `Gagal mengambil alasan pembatalan: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil alasan pembatalan" }
  }
}

/**
 * Get cancellation history for a worker
 */
export async function getWorkerCancellationHistory(workerId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          address
        ),
        businesses (
          id,
          name
        ),
        cancellation_reasons (
          id,
          name,
          category,
          penalty_percentage
        )
      `)
      .eq("worker_id", workerId)
      .eq("status", "cancelled")
      .not("cancellation_reason_id", "is", null)
      .order("cancelled_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil riwayat pembatalan", data: null }
  }
}

/**
 * Get cancellation history for a business
 */
export async function getBusinessCancellationHistory(businessId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          address
        ),
        workers (
          id,
          full_name,
          phone
        ),
        cancellation_reasons (
          id,
          name,
          category,
          penalty_percentage
        )
      `)
      .eq("business_id", businessId)
      .eq("status", "cancelled")
      .not("cancellation_reason_id", "is", null)
      .order("cancelled_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil riwayat pembatalan", data: null }
  }
}
