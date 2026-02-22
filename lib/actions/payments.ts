"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type Wallet = Database["public"]["Tables"]["wallets"]["Row"]

// Type for updating a booking's payment status
type BookingPaymentUpdate = Pick<Booking, 'payment_status'>

export type PaymentReleaseResult = {
  success: boolean
  error?: string
  data?: Booking
}

export type BatchPaymentReleaseResult = {
  success: boolean
  error?: string
  released_count?: number
  failed_count?: number
}

/**
 * Release payment for a single booking
 * Checks if review deadline has passed and payment is not disputed
 * Moves funds from pending to available balance
 */
export async function releasePaymentAction(
  bookingId: string,
  workerId: string
): Promise<PaymentReleaseResult> {
  try {
    const supabase = await createClient()

    // Get the booking with job details
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          budget_max
        )
      `)
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    // Check if payment is still in review
    if (booking.payment_status !== "pending_review") {
      return { success: false, error: `Pembayaran tidak dalam status review: ${booking.payment_status}` }
    }

    // Check if review deadline has passed
    if (!booking.review_deadline) {
      return { success: false, error: "Batas waktu review tidak ditemukan" }
    }

    const now = new Date()
    const reviewDeadline = new Date(booking.review_deadline)

    if (now < reviewDeadline) {
      return { success: false, error: "Batas waktu review belum tercapai" }
    }

    // Get the payment amount
    const paymentAmount = booking.jobs?.budget_max || booking.final_price || 0

    // Import dynamically to avoid circular dependency
    const { releaseFundsAction } = await import("./wallets")
    const walletResult = await releaseFundsAction(
      workerId,
      paymentAmount,
      bookingId,
      `Pembayaran tersedia untuk ${booking.jobs?.title || "pekerjaan"}`
    )

    if (!walletResult.success) {
      return { success: false, error: walletResult.error || "Gagal melepaskan dana" }
    }

    // Update booking payment status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({ payment_status: "available" })
      .eq("id", bookingId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal memperbarui status pembayaran: ${updateError.message}` }
    }

    // Send notification to worker
    // Import dynamically to avoid circular dependency
    const { createNotification } = await import("./notifications")
    const jobTitle = booking.jobs?.title || "pekerjaan"
    await createNotification(
      workerId,
      "Pembayaran Tersedia",
      `Pembayaran sebesar Rp ${paymentAmount.toLocaleString("id-ID")} untuk ${jobTitle} kini tersedia di dompet Anda.`,
      `/dashboard/worker/wallet`
    )

    return { success: true, data: updatedBooking }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat melepaskan pembayaran" }
  }
}

/**
 * Release all payments that have passed their review deadline
 * This function should be called periodically (e.g., via cron job)
 * Processes all bookings with payment_status 'pending_review' where review_deadline < now
 */
export async function releaseDuePaymentsAction(): Promise<BatchPaymentReleaseResult> {
  try {
    const supabase = await createClient()

    const now = new Date().toISOString()

    // Get all bookings that are ready for release
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        id,
        worker_id,
        payment_status,
        review_deadline,
        final_price,
        jobs (
          id,
          title,
          budget_max
        )
      `)
      .eq("payment_status", "pending_review")
      .lt("review_deadline", now)
      .order("review_deadline", { ascending: true })

    if (fetchError) {
      return { success: false, error: `Gagal mengambil booking: ${fetchError.message}` }
    }

    if (!bookings || bookings.length === 0) {
      return { success: true, released_count: 0, failed_count: 0 }
    }

    let releasedCount = 0
    let failedCount = 0

    // Import notification function once for batch processing
    const { createNotification } = await import("./notifications")

    // Process each booking
    for (const booking of bookings) {
      try {
        const paymentAmount = booking.jobs?.budget_max || booking.final_price || 0

        // Import dynamically to avoid circular dependency
        const { releaseFundsAction } = await import("./wallets")
        const walletResult = await releaseFundsAction(
          booking.worker_id,
          paymentAmount,
          booking.id,
          `Pembayaran tersedia untuk ${booking.jobs?.title || "pekerjaan"}`
        )

        if (!walletResult.success) {
          failedCount++
          continue
        }

        // Update booking payment status
        const { error: updateError } = await supabase
          .from("bookings")
          .update({ payment_status: "available" })
          .eq("id", booking.id)

        if (updateError) {
          failedCount++
        } else {
          releasedCount++

          // Send notification to worker
          const jobTitle = booking.jobs?.title || "pekerjaan"
          await createNotification(
            booking.worker_id,
            "Pembayaran Tersedia",
            `Pembayaran sebesar Rp ${paymentAmount.toLocaleString("id-ID")} untuk ${jobTitle} kini tersedia di dompet Anda.`,
            `/dashboard/worker/wallet`
          )
        }
      } catch {
        failedCount++
      }
    }

    return {
      success: true,
      released_count: releasedCount,
      failed_count: failedCount,
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memproses pembayaran jatuh tempo" }
  }
}

/**
 * Get payments that are pending release for a worker
 * Returns bookings where payment_status is 'pending_review'
 */
export async function getPendingReleasePaymentsAction(
  workerId: string
): Promise<{
  success: boolean
  error?: string
  data?: Array<{
    booking_id: string
    job_title: string
    amount: number
    review_deadline: string
    hours_until_release: number
  }>
}> {
  try {
    const supabase = await createClient()

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id,
        review_deadline,
        final_price,
        jobs (
          title,
          budget_max
        )
      `)
      .eq("worker_id", workerId)
      .eq("payment_status", "pending_review")
      .order("review_deadline", { ascending: true })

    if (error) {
      return { success: false, error: `Gagal mengambil pembayaran: ${error.message}` }
    }

    const now = new Date()

    const payments = (bookings || []).map((booking) => {
      const reviewDeadline = new Date(booking.review_deadline || "")
      const hoursUntilRelease = Math.max(0, (reviewDeadline.getTime() - now.getTime()) / (1000 * 60 * 60))

      return {
        booking_id: booking.id,
        job_title: booking.jobs?.title || "Pekerjaan",
        amount: booking.jobs?.budget_max || booking.final_price || 0,
        review_deadline: booking.review_deadline || "",
        hours_until_release: Math.round(hoursUntilRelease),
      }
    })

    return { success: true, data: payments }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pembayaran yang akan dilepas" }
  }
}
