"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { createNotification } from "./notifications"
import { sendPushNotification, isNotificationTypeEnabled } from "./push-notifications"
import { addPendingFundsAction } from "./wallets"

// ============================================================================
// TYPES
// ============================================================================

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type BookingUpdate = Partial<Pick<Booking, 'status' | 'check_in_at' | 'checkout_time' | 'actual_hours' | 'final_price' | 'payment_status' | 'payment_id'>>

export type BookingResult = {
  success: boolean
  error?: string
  data?: Booking
}

// ============================================================================
// BOOKING COMPLETION ACTIONS
// ============================================================================

/**
 * Worker checks in to a booking
 * - Updates booking status from 'accepted' to 'in_progress'
 * - Sets check_in_at timestamp
 *
 * @param bookingId - The booking ID
 * @param workerId - The worker ID (for verification)
 * @returns Updated booking
 */
export async function checkInBooking(
  bookingId: string,
  workerId: string
): Promise<BookingResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the worker and is in accepted status
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          business_id
        )
      `)
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    if (booking.status !== "accepted") {
      return { success: false, error: "Hanya booking yang sudah diterima yang bisa di-check in" }
    }

    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "in_progress",
        check_in_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal check in: ${updateError.message}` }
    }

    // Send notification to business
    if (booking.business_id) {
      await createNotification(
        booking.business_id,
        "Pekerja Telah Tiba",
        `Pekerja telah check-in untuk ${booking.jobs?.title || "pekerjaan"}`,
        `/business/bookings/${bookingId}`
      )

      // Get business owner's user_id for push notification
      const { data: business } = await supabase
        .from("businesses")
        .select("user_id")
        .eq("id", booking.business_id)
        .single()

      if (business) {
        const { enabled } = await isNotificationTypeEnabled(business.user_id, "booking_status")
        if (enabled) {
          await sendPushNotification(
            business.user_id,
            "Pekerja Telah Tiba",
            `Pekerja telah check-in untuk ${booking.jobs?.title}`,
            `/business/bookings/${bookingId}`
          )
        }
      }
    }

    return { success: true, data: updatedBooking }
  } catch (error) {
    console.error("Error in checkInBooking:", error)
    return { success: false, error: "Terjadi kesalahan saat check in" }
  }
}

/**
 * Worker checks out from a booking
 * - Updates booking status from 'in_progress' to 'completed'
 * - Sets checkout_time and actual_hours
 * - Initiates payment hold in worker's pending balance
 * - Sets payment_status to 'pending_review'
 * - Sets review_deadline to 24 hours from now
 *
 * @param bookingId - The booking ID
 * @param workerId - The worker ID (for verification)
 * @param actualHours - Actual hours worked (optional, will be auto-calculated if not provided)
 * @param notes - Optional notes about the work
 * @returns Updated booking
 */
export async function checkOutBooking(
  bookingId: string,
  workerId: string,
  actualHours?: number,
  notes?: string
): Promise<BookingResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the worker and is in in_progress status
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

    if (booking.status !== "in_progress") {
      return { success: false, error: "Hanya pekerjaan yang sedang berjalan yang bisa di-checkout" }
    }

    if (!booking.check_in_at) {
      return { success: false, error: "Anda belum check-in ke pekerjaan ini" }
    }

    // Calculate actual hours if not provided
    let hours = actualHours
    if (!hours) {
      const checkInTime = new Date(booking.check_in_at).getTime()
      const checkOutTime = Date.now()
      hours = Math.round(((checkOutTime - checkInTime) / (1000 * 60 * 60)) * 100) / 100
    }

    // Calculate final price based on job budget
    const finalPrice = booking.jobs?.budget_max || booking.final_price || 0

    // Calculate review deadline (24 hours from now)
    const reviewDeadline = new Date()
    reviewDeadline.setHours(reviewDeadline.getHours() + 24)

    // Update the booking
    const bookingUpdate: BookingUpdate = {
      status: "completed",
      checkout_time: new Date().toISOString(),
      actual_hours: hours,
      payment_status: "pending_review",
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        ...bookingUpdate,
        review_deadline: reviewDeadline.toISOString(),
      })
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal checkout: ${updateError.message}` }
    }

    // Add pending funds to worker's wallet
    const walletResult = await addPendingFundsAction(
      workerId,
      finalPrice,
      bookingId,
      notes || `Pembayaran untuk ${booking.jobs?.title || "pekerjaan"}`
    )

    if (!walletResult.success) {
      // Log but don't fail - booking was updated successfully
      console.error("Gagal menambahkan dana ke dompet worker:", walletResult.error)
    }

    // Send notifications
    const jobTitle = booking.jobs?.title || "pekerjaan"

    // Notify worker about successful checkout
    await createNotification(
      workerId,
      "Checkout Berhasil",
      `Anda telah menyelesaikan ${jobTitle}. Pembayaran sedang dalam proses review selama 24 jam.`,
      `/worker/bookings`
    )

    // Notify business about worker checkout
    if (booking.business_id) {
      await createNotification(
        booking.business_id,
        "Pekerjaan Selesai",
        `Pekerja telah menyelesaikan ${jobTitle}. Silakan review pekerjaan dalam 24 jam.`,
        `/business/bookings/${bookingId}`
      )

      // Get business owner's user_id for push notification
      const { data: business } = await supabase
        .from("businesses")
        .select("user_id")
        .eq("id", booking.business_id)
        .single()

      if (business) {
        const { enabled } = await isNotificationTypeEnabled(business.user_id, "booking_status")
        if (enabled) {
          await sendPushNotification(
            business.user_id,
            "Pekerjaan Selesai",
            `Pekerja telah menyelesaikan ${jobTitle}. Review diperlukan dalam 24 jam.`,
            `/business/bookings/${bookingId}`
          )
        }
      }
    }

    return { success: true, data: updatedBooking }
  } catch (error) {
    console.error("Error in checkOutBooking:", error)
    return { success: false, error: "Terjadi kesalahan saat checkout pekerjaan" }
  }
}

/**
 * Business confirms job completion
 * - Can only be called when booking is already 'completed' (after worker checkout)
 * - Moves payment from 'pending_review' to 'available'
 * - Updates payment status
 *
 * @param bookingId - The booking ID
 * @param businessId - The business ID (for verification)
 * @returns Updated booking
 */
export async function confirmBookingCompletion(
  bookingId: string,
  businessId: string
): Promise<BookingResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the business and is completed
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        workers (
          id,
          user_id
        )
      `)
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    if (booking.status !== "completed") {
      return { success: false, error: "Booking belum selesai" }
    }

    // Update payment status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: "available",
      })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal mengkonfirmasi penyelesaian: ${updateError.message}` }
    }

    // Release funds from pending to available
    const { releaseFundsAction } = await import("./wallets")
    const releaseResult = await releaseFundsAction(bookingId)

    if (!releaseResult.success) {
      console.error("Gagal melepas dana dari pending:", releaseResult.error)
    }

    // Notify worker that payment is available
    if (booking.workers) {
      await createNotification(
        (booking.workers as any).user_id,
        "Pembayaran Tersedia",
        "Pembayaran Anda telah tersedia dan siap untuk ditarik",
        "/worker/wallet"
      )

      const { enabled } = await isNotificationTypeEnabled((booking.workers as any).user_id, "payment")
      if (enabled) {
        await sendPushNotification(
          (booking.workers as any).user_id,
          "Pembayaran Tersedia",
          "Pembayaran Anda telah tersedia untuk ditarik",
          "/worker/wallet"
        )
      }
    }

    return { success: true, data: updatedBooking }
  } catch (error) {
    console.error("Error in confirmBookingCompletion:", error)
    return { success: false, error: "Terjadi kesalahan saat mengkonfirmasi penyelesaian" }
  }
}

/**
 * Process booking payment
 * - This is a stub for future payment gateway integration
 * - For now, it just updates payment_status and sets payment_id
 *
 * @param bookingId - The booking ID
 * @param paymentId - External payment provider transaction ID
 * @returns Updated booking
 */
export async function processBookingPayment(
  bookingId: string,
  paymentId: string
): Promise<BookingResult> {
  try {
    const supabase = await createClient()

    // Verify the booking exists and is in completed status
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    if (booking.status !== "completed") {
      return { success: false, error: "Booking belum selesai" }
    }

    // Update the booking with payment ID
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_id: paymentId,
        payment_status: "released",
      })
      .eq("id", bookingId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal memproses pembayaran: ${updateError.message}` }
    }

    // TODO: Integrate with actual payment gateway (Stripe/Midtrans)
    // For now, we're just storing the payment ID

    return { success: true, data: updatedBooking }
  } catch (error) {
    console.error("Error in processBookingPayment:", error)
    return { success: false, error: "Terjadi kesalahan saat memproses pembayaran" }
  }
}

/**
 * Add booking review
 * - Creates a review in the reviews table
 * - Supports two-way reviews (business reviews worker, worker reviews business)
 * - Only allowed for completed bookings
 *
 * @param bookingId - The booking ID
 * @param rating - Rating (1-5)
 * @param review - Review text
 * @param reviewer - Who is reviewing: 'business' or 'worker'
 * @param reviewerId - The ID of the reviewer (business_id or worker_id)
 * @param wouldRehire - Optional would rehire flag (only for business reviews)
 * @returns Created review
 */
export async function addBookingReview(
  bookingId: string,
  rating: number,
  review: string,
  reviewer: 'business' | 'worker',
  reviewerId: string,
  wouldRehire?: boolean
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient()

    // Verify the booking exists and is completed
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    if (booking.status !== "completed") {
      return { success: false, error: "Hanya booking yang sudah selesai yang bisa direview" }
    }

    // Verify the reviewer is authorized
    if (reviewer === "business") {
      if (booking.business_id !== reviewerId) {
        return { success: false, error: "Anda tidak berhak mereview booking ini" }
      }
    } else if (reviewer === "worker") {
      if (booking.worker_id !== reviewerId) {
        return { success: false, error: "Anda tidak berhak mereview booking ini" }
      }
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("reviewer", reviewer)
      .single()

    if (existingReview) {
      return { success: false, error: "Anda sudah mereview booking ini" }
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating harus antara 1-5" }
    }

    // Prepare review data
    const reviewData: any = {
      booking_id: bookingId,
      worker_id: booking.worker_id,
      business_id: booking.business_id,
      rating,
      comment: review,
      reviewer,
    }

    // Add would_rehire for business reviews
    if (reviewer === "business" && wouldRehire !== undefined) {
      reviewData.would_rehire = wouldRehire
    }

    // Create the review
    const { data, error } = await supabase
      .from("reviews")
      .insert(reviewData)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membuat review: ${error.message}` }
    }

    // Send notification to the other party
    if (reviewer === "business") {
      // Notify worker
      await createNotification(
        booking.worker_id,
        "Review Baru dari Bisnis",
        "Bisnis telah memberikan review untuk pekerjaan yang selesai",
        `/worker/bookings/${bookingId}`
      )
    } else {
      // Notify business
      await createNotification(
        booking.business_id,
        "Review Baru dari Pekerja",
        "Pekerja telah memberikan review untuk pekerjaan yang selesai",
        `/business/bookings/${bookingId}`
      )
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in addBookingReview:", error)
    return { success: false, error: "Terjadi kesalahan saat membuat review" }
  }
}

/**
 * Get booking review status
 * - Checks if both parties have reviewed
 * - Returns the reviews if they exist
 *
 * @param bookingId - The booking ID
 * @returns Review status
 */
export async function getBookingReviewStatus(
  bookingId: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("booking_id", bookingId)

    if (error) {
      return { success: false, error: error.message }
    }

    const businessReview = data?.find((r: any) => r.reviewer === "business")
    const workerReview = data?.find((r: any) => r.reviewer === "worker")

    return {
      success: true,
      data: {
        businessReviewed: !!businessReview,
        workerReviewed: !!workerReview,
        businessReview,
        workerReview,
        bothReviewed: !!businessReview && !!workerReview,
      }
    }
  } catch (error) {
    return { success: false, error: "Gagal mengambil status review" }
  }
}

// ============================================================================
// LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use checkOutBooking instead
 * This function is kept for backward compatibility
 */
export async function checkoutBooking(bookingId: string, workerId: string): Promise<BookingResult> {
  return checkOutBooking(bookingId, workerId)
}
