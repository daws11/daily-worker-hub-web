"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type CancellationReason = Database["public"]["Tables"]["cancellation_reasons"]["Row"]

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
