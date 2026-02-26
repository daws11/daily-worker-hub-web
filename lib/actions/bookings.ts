"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type Job = Database["public"]["Tables"]["jobs"]["Row"]

// Types for bookings with joined data
type BookingWithJob = Booking & {
  jobs: {
    id: string
    title: string
    budget_min: number
    budget_max: number
  } | null
}

type BookingWithJobAndBusiness = Booking & {
  jobs: {
    id: string
    title: string
    description: string | null
    budget_min: number
    budget_max: number
    deadline: string | null
    address: string | null
  } | null
  businesses: {
    id: string
    name: string
    phone: string | null
    email: string | null
  } | null
}

type BookingWithJobAndWorker = Booking & {
  jobs: {
    id: string
    title: string
    description: string | null
    budget_min: number
    budget_max: number
    deadline: string | null
    address: string | null
  } | null
  workers: {
    id: string
    full_name: string
    phone: string | null
    bio: string | null
    avatar_url: string | null
  } | null
}

// Type for updating a booking
type BookingUpdate = Partial<Pick<Booking, 'status' | 'start_date' | 'end_date' | 'final_price' | 'cancellation_note' | 'cancelled_at' | 'cancellation_reason_id'>> & {
  checkout_time?: string
  payment_status?: string
  review_deadline?: string
}

export type CheckoutResult = {
  success: boolean
  error?: string
  data?: Booking
}

/**
 * Worker checks out from a job
 * - Marks booking as completed
 * - Sets checkout_time and review_deadline
 * - Initiates payment hold in worker's pending balance
 */
export async function checkoutBooking(bookingId: string, workerId: string): Promise<CheckoutResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the worker and is in_progress
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          budget_min,
          budget_max
        )
      `)
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Pekerjaan tidak ditemukan" }
    }

    // Type assertion for joined query result
    const typedBooking = booking as BookingWithJob

    if (typedBooking.status !== "in_progress") {
      return { success: false, error: "Hanya pekerjaan yang sedang berjalan yang bisa di-checkout" }
    }

    // Calculate final price (use the budget_max as the agreed price)
    const finalPrice = typedBooking.jobs?.budget_max || typedBooking.final_price || 0

    // Calculate review deadline (24 hours from now)
    const reviewDeadline = new Date()
    reviewDeadline.setHours(reviewDeadline.getHours() + 24)

    // Update the booking
    const bookingUpdate: BookingUpdate = {
      status: "completed",
      checkout_time: new Date().toISOString(),
      payment_status: "pending_review",
      review_deadline: reviewDeadline.toISOString(),
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(bookingUpdate)
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal checkout: ${updateError.message}` }
    }

    // Add pending funds to worker's wallet
    // Import dynamically to avoid circular dependency
    const { addPendingFundsAction } = await import("./wallets")
    const walletResult = await addPendingFundsAction(
      workerId,
      finalPrice,
      bookingId,
      `Pembayaran untuk ${typedBooking.jobs?.title || "pekerjaan"}`
    )

    if (!walletResult.success) {
      // Log but don't fail - booking was updated successfully
      console.error("Gagal menambahkan dana ke dompet worker:", walletResult.error)
    }

    // Send notifications
    // Import dynamically to avoid circular dependency
    const { createNotification } = await import("./notifications")

    // Notify worker about successful checkout
    const jobTitle = typedBooking.jobs?.title || "pekerjaan"
    await createNotification(
      workerId,
      "Checkout Berhasil",
      `Anda telah menyelesaikan ${jobTitle}. Pembayaran sedang dalam proses review selama 24 jam.`,
      `/dashboard/worker/jobs`
    )

    // Notify business about worker checkout
    if (typedBooking.business_id) {
      await createNotification(
        typedBooking.business_id,
        "Pekerjaan Selesai",
        `Pekerja telah menyelesaikan ${jobTitle}. Silakan review pekerjaan dalam 24 jam.`,
        `/dashboard/business/jobs`
      )
    }

    return { success: true, data: updatedBooking }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat checkout pekerjaan" }
  }
}

/**
 * Get booking details for a worker
 */
export async function getWorkerBooking(bookingId: string, workerId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          deadline,
          address
        ),
        businesses (
          id,
          name,
          phone,
          email
        )
      `)
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single()

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data: data as BookingWithJobAndBusiness | null, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data booking", data: null }
  }
}

/**
 * Get booking details for a business
 */
export async function getBusinessBooking(bookingId: string, businessId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          deadline,
          address
        ),
        workers (
          id,
          full_name,
          phone,
          bio,
          avatar_url
        )
      `)
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single()

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data: data as BookingWithJobAndWorker | null, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data booking", data: null }
  }
}

/**
 * Get all bookings for a worker
 */
export async function getWorkerBookings(workerId: string, status?: Booking["status"]) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          deadline,
          address
        ),
        businesses (
          id,
          name,
          phone,
          email
        )
      `)
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data: data as BookingWithJobAndBusiness[] | null, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data booking", data: null }
  }
}

/**
 * Get all bookings for a business
 */
export async function getBusinessBookings(businessId: string, status?: Booking["status"]) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          deadline,
          address
        ),
        workers (
          id,
          full_name,
          phone,
          bio,
          avatar_url
        )
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data: data as BookingWithJobAndWorker[] | null, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data booking", data: null }
  }
}
