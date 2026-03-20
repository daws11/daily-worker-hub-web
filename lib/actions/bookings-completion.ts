"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import { createNotification } from "./notifications";
import {
  sendPushNotification,
  isNotificationTypeEnabled,
} from "./push-notifications";
import { addPendingFundsAction } from "./wallets";

// ============================================================================
// TYPES
// ============================================================================

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingUpdate = Partial<
  Database["public"]["Tables"]["bookings"]["Update"]
>;

export type BookingResult = {
  success: boolean;
  error?: string;
  data?: Booking;
};

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
  workerId: string,
): Promise<BookingResult> {
  try {
    const supabase = await createClient();

    // Verify the booking belongs to the worker and is in accepted status
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        jobs (
          id,
          title,
          business_id
        )
      `,
      )
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    if (booking.status !== "accepted") {
      return {
        success: false,
        error: "Hanya booking yang sudah diterima yang bisa di-check in",
      };
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
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal check in: ${updateError.message}`,
      };
    }

    // Send notification to business
    if (booking.business_id) {
      await createNotification(
        booking.business_id,
        "Pekerja Telah Tiba",
        `Pekerja telah check-in untuk ${booking.jobs?.title || "pekerjaan"}`,
        `/business/bookings/${bookingId}`,
      );

      // Get business owner's user_id for push notification
      const { data: business } = await supabase
        .from("businesses")
        .select("user_id")
        .eq("id", booking.business_id)
        .single();

      if (business) {
        const { enabled } = await isNotificationTypeEnabled(
          business.user_id,
          "booking_status",
        );
        if (enabled) {
          await sendPushNotification(
            business.user_id,
            "Pekerja Telah Tiba",
            `Pekerja telah check-in untuk ${booking.jobs?.title}`,
            `/business/bookings/${bookingId}`,
          );
        }
      }
    }

    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error("Error in checkInBooking:", error);
    return { success: false, error: "Terjadi kesalahan saat check in" };
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
  notes?: string,
): Promise<BookingResult> {
  try {
    const supabase = await createClient();

    // Verify the booking belongs to the worker and is in in_progress status
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        jobs (
          id,
          title,
          budget_min,
          budget_max
        )
      `,
      )
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Pekerjaan tidak ditemukan" };
    }

    if (booking.status !== "in_progress") {
      return {
        success: false,
        error: "Hanya pekerjaan yang sedang berjalan yang bisa di-checkout",
      };
    }

    if (!booking.check_in_at) {
      return { success: false, error: "Anda belum check-in ke pekerjaan ini" };
    }

    // Calculate actual hours if not provided
    let hours = actualHours;
    if (!hours) {
      const checkInTime = new Date(booking.check_in_at).getTime();
      const checkOutTime = Date.now();
      hours =
        Math.round(((checkOutTime - checkInTime) / (1000 * 60 * 60)) * 100) /
        100;
    }

    // Calculate final price based on job budget
    const finalPrice = booking.jobs?.budget_max || booking.final_price || 0;

    // Calculate review deadline (24 hours from now)
    const reviewDeadline = new Date();
    reviewDeadline.setHours(reviewDeadline.getHours() + 24);

    // Update the booking
    const bookingUpdate: BookingUpdate = {
      status: "completed",
      check_out_at: new Date().toISOString(),
      actual_hours: hours,
      payment_status: "pending_review",
      review_deadline: reviewDeadline.toISOString(),
    };

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(bookingUpdate)
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal checkout: ${updateError.message}`,
      };
    }

    // Add pending funds to worker's wallet
    const walletResult = await addPendingFundsAction(
      workerId,
      finalPrice,
      bookingId,
      notes || `Pembayaran untuk ${booking.jobs?.title || "pekerjaan"}`,
    );

    if (!walletResult.success) {
      // Log but don't fail - booking was updated successfully
      console.error(
        "Gagal menambahkan dana ke dompet worker:",
        walletResult.error,
      );
    }

    // Send notifications
    const jobTitle = booking.jobs?.title || "pekerjaan";

    // Notify worker about successful checkout
    await createNotification(
      workerId,
      "Checkout Berhasil",
      `Anda telah menyelesaikan ${jobTitle}. Pembayaran sedang dalam proses review selama 24 jam.`,
      `/worker/bookings`,
    );

    // Notify business about worker checkout
    if (booking.business_id) {
      await createNotification(
        booking.business_id,
        "Pekerjaan Selesai",
        `Pekerja telah menyelesaikan ${jobTitle}. Silakan review pekerjaan dalam 24 jam.`,
        `/business/bookings/${bookingId}`,
      );

      // Get business owner's user_id for push notification
      const { data: business } = await supabase
        .from("businesses")
        .select("user_id")
        .eq("id", booking.business_id)
        .single();

      if (business) {
        const { enabled } = await isNotificationTypeEnabled(
          business.user_id,
          "booking_status",
        );
        if (enabled) {
          await sendPushNotification(
            business.user_id,
            "Pekerjaan Selesai",
            `Pekerja telah menyelesaikan ${jobTitle}. Review diperlukan dalam 24 jam.`,
            `/business/bookings/${bookingId}`,
          );
        }
      }
    }

    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error("Error in checkOutBooking:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat checkout pekerjaan",
    };
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
  businessId: string,
): Promise<BookingResult> {
  try {
    const supabase = await createClient();

    // Verify the booking belongs to the business and is completed
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        workers (
          id,
          user_id
        )
      `,
      )
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    if (booking.status !== "completed") {
      return { success: false, error: "Booking belum selesai" };
    }

    // Update payment status to paid
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
      })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal mengkonfirmasi penyelesaian: ${updateError.message}`,
      };
    }

    // Release funds from pending to available
    const { releaseFundsAction } = await import("./wallets");

    // Get the worker's user_id for wallet operations
    const { data: worker } = await supabase
      .from("workers")
      .select("user_id")
      .eq("id", booking.worker_id)
      .single();

    let releaseResult: { success: boolean; error?: string } = {
      success: false,
      error: "Worker not found",
    };
    if (worker && booking.final_price) {
      releaseResult = await releaseFundsAction(
        worker.user_id,
        booking.final_price,
        bookingId,
        "Pembayaran dikonfirmasi oleh bisnis",
      );
    }

    if (!releaseResult.success) {
      console.error("Gagal melepas dana dari pending:", releaseResult.error);
    }

    // Notify worker that payment is available
    if (booking.workers) {
      await createNotification(
        (booking.workers as any).user_id,
        "Pembayaran Tersedia",
        "Pembayaran Anda telah tersedia dan siap untuk ditarik",
        "/worker/wallet",
      );

      const { enabled } = await isNotificationTypeEnabled(
        (booking.workers as any).user_id,
        "payment_confirmation",
      );
      if (enabled) {
        await sendPushNotification(
          (booking.workers as any).user_id,
          "Pembayaran Tersedia",
          "Pembayaran Anda telah tersedia untuk ditarik",
          "/worker/wallet",
        );
      }
    }

    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error("Error in confirmBookingCompletion:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat mengkonfirmasi penyelesaian",
    };
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
  paymentId: string,
): Promise<BookingResult> {
  try {
    const supabase = await createClient();

    // Verify the booking exists and is in completed status
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    if (booking.status !== "completed") {
      return { success: false, error: "Booking belum selesai" };
    }

    // Update the booking with payment ID
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_id: paymentId,
        payment_status: "paid",
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal memproses pembayaran: ${updateError.message}`,
      };
    }

    // TODO: Integrate with actual payment gateway (Stripe/Midtrans)
    // For now, we're just storing the payment ID

    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error("Error in processBookingPayment:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat memproses pembayaran",
    };
  }
}

/**
 * Add booking review
 * - Creates a review in the reviews table (business reviews worker)
 * - Only allowed for completed bookings
 * - Updates worker's reliability score after review
 *
 * @param bookingId - The booking ID
 * @param rating - Rating (1-5)
 * @param review - Review text
 * @param businessId - The business ID (for verification)
 * @returns Created review
 */
export async function addBookingReview(
  bookingId: string,
  rating: number,
  review: string,
  businessId: string,
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient();

    // Verify the booking exists and is completed
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    if (booking.status !== "completed") {
      return {
        success: false,
        error: "Hanya booking yang sudah selesai yang bisa direview",
      };
    }

    // Verify the business owns this booking
    if (booking.business_id !== businessId) {
      return {
        success: false,
        error: "Anda tidak berhak mereview booking ini",
      };
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (existingReview) {
      return { success: false, error: "Anda sudah mereview booking ini" };
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating harus antara 1-5" };
    }

    // Create the review
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        booking_id: bookingId,
        worker_id: booking.worker_id,
        rating,
        comment: review || "",
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal membuat review: ${error.message}`,
      };
    }

    // Update worker's reliability score
    const { triggerScoreUpdate } = await import("./reliability-score");
    const scoreResult = await triggerScoreUpdate(booking.worker_id);

    if (!scoreResult.success) {
      console.error("Failed to update reliability score:", scoreResult.error);
    }

    // Send notification to worker
    const { data: worker } = await supabase
      .from("workers")
      .select("user_id")
      .eq("id", booking.worker_id)
      .single();

    if (worker) {
      await createNotification(
        worker.user_id,
        "Review Baru dari Bisnis",
        "Bisnis telah memberikan review untuk pekerjaan yang selesai",
        `/worker/bookings/${bookingId}`,
      );

      // Send push notification if enabled
      const { enabled } = await isNotificationTypeEnabled(
        worker.user_id,
        "booking_status",
      );
      if (enabled) {
        await sendPushNotification(
          worker.user_id,
          "Review Baru",
          `Anda mendapat rating ${rating}/5 untuk pekerjaan terakhir`,
          `/worker/bookings/${bookingId}`,
        );
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in addBookingReview:", error);
    return { success: false, error: "Terjadi kesalahan saat membuat review" };
  }
}

/**
 * Worker reviews a business
 * - Creates a review from worker to business
 * - Only allowed for completed bookings
 * - Updates business average rating
 *
 * @param bookingId - The booking ID
 * @param rating - Rating (1-5)
 * @param review - Review text
 * @param workerId - The worker ID (for verification)
 * @returns Created review
 */
export async function addWorkerReview(
  bookingId: string,
  rating: number,
  review: string,
  workerId: string,
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient();

    // Verify the booking exists and is completed
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        businesses (
          id,
          user_id,
          name
        )
      `,
      )
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    if (booking.status !== "completed") {
      return {
        success: false,
        error: "Hanya booking yang sudah selesai yang bisa direview",
      };
    }

    // Verify the worker owns this booking
    if (booking.worker_id !== workerId) {
      return {
        success: false,
        error: "Anda tidak berhak mereview booking ini",
      };
    }

    // Check if worker already reviewed this booking
    const reviewsTable = supabase.from("reviews") as any;
    const { data: existingReview } = await reviewsTable
      .select("*")
      .eq("booking_id", bookingId)
      .eq("reviewer_type", "worker")
      .single();

    if (existingReview) {
      return { success: false, error: "Anda sudah mereview booking ini" };
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating harus antara 1-5" };
    }

    // Create the review (worker reviewing business)
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        booking_id: bookingId,
        worker_id: workerId,
        business_id: booking.business_id,
        rating,
        comment: review || "",
        reviewer_type: "worker",
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal membuat review: ${error.message}`,
      };
    }

    // Update business average rating
    const reviewsTable2 = supabase.from("reviews") as any;
    const { data: businessReviews } = await reviewsTable2
      .select("rating")
      .eq("business_id", booking.business_id)
      .eq("reviewer_type", "worker");

    if (businessReviews && businessReviews.length > 0) {
      const avgRating =
        businessReviews.reduce((sum, r) => sum + r.rating, 0) /
        businessReviews.length;

      // Note: rating and total_reviews would need to be added to businesses table schema
      // For now, we just calculate but don't store
      console.log(
        `Business ${booking.business_id} average rating: ${Math.round(avgRating * 10) / 10} from ${businessReviews.length} reviews`,
      );
    }

    // Send notification to business
    if (booking.businesses) {
      await createNotification(
        (booking.businesses as any).user_id,
        "Review Baru dari Pekerja",
        `Pekerja memberikan rating ${rating}/5 untuk pekerjaan Anda`,
        `/business/bookings/${bookingId}`,
      );

      // Send push notification if enabled
      const { enabled } = await isNotificationTypeEnabled(
        (booking.businesses as any).user_id,
        "booking_status",
      );
      if (enabled) {
        await sendPushNotification(
          (booking.businesses as any).user_id,
          "Review Baru",
          `Pekerja memberikan rating ${rating}/5`,
          `/business/bookings/${bookingId}`,
        );
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in addWorkerReview:", error);
    return { success: false, error: "Terjadi kesalahan saat membuat review" };
  }
}

/**
 * Get booking review status
 * - Checks if a review exists for the booking
 * - Returns the review if it exists
 *
 * @param bookingId - The booking ID
 * @returns Review status
 */
export async function getBookingReviewStatus(
  bookingId: string,
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (error && error.code !== "PGRST116") {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        hasReview: !!data,
        review: data || null,
      },
    };
  } catch (error) {
    return { success: false, error: "Gagal mengambil status review" };
  }
}

// ============================================================================
// LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use checkOutBooking instead
 * This function is kept for backward compatibility
 */
export async function checkoutBooking(
  bookingId: string,
  workerId: string,
): Promise<BookingResult> {
  return checkOutBooking(bookingId, workerId);
}

/**
 * Complete a booking (Business finalizes the booking)
 * - Updates booking status to 'completed'
 * - Calculates final payment based on actual hours worked
 * - Triggers payment processing
 * - Sets review deadline to 24 hours from now
 *
 * This is called by the business after work is done to finalize everything.
 *
 * @param bookingId - The booking ID
 * @param businessId - The business ID (for verification)
 * @param options - Optional parameters (finalPrice, actualHours, notes)
 * @returns Updated booking
 */
export async function completeBooking(
  bookingId: string,
  businessId: string,
  options?: {
    finalPrice?: number;
    actualHours?: number;
    notes?: string;
  },
): Promise<BookingResult> {
  try {
    const supabase = await createClient();

    // Verify the booking belongs to the business and is in in_progress status
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        jobs (
          id,
          title,
          budget_min,
          budget_max,
          overtime_multiplier
        ),
        workers (
          id,
          user_id,
          full_name
        )
      `,
      )
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    // Allow completion from 'in_progress' or 'accepted' status
    if (!["in_progress", "accepted"].includes(booking.status)) {
      return {
        success: false,
        error: "Hanya booking yang sedang berjalan yang bisa diselesaikan",
      };
    }

    // Calculate final price if not provided
    let finalPrice = options?.finalPrice;
    if (!finalPrice) {
      const hours = options?.actualHours || booking.actual_hours || 8;
      const hourlyRate = booking.jobs?.budget_max || booking.final_price || 0;
      finalPrice = Math.round(hours * hourlyRate * 100) / 100;
    }

    // Calculate actual hours if not provided
    let actualHours = options?.actualHours;
    if (!actualHours && booking.check_in_at) {
      const checkInTime = new Date(booking.check_in_at).getTime();
      const now = Date.now();
      actualHours =
        Math.round(((now - checkInTime) / (1000 * 60 * 60)) * 100) / 100;
    }

    // Calculate review deadline (24 hours from now)
    const reviewDeadline = new Date();
    reviewDeadline.setHours(reviewDeadline.getHours() + 24);

    // Update the booking
    const updateData: any = {
      status: "completed",
      final_price: finalPrice,
      payment_status: "pending_review",
    };

    if (actualHours) {
      updateData.actual_hours = actualHours;
    }

    if (!booking.check_in_at) {
      // If never checked in, set check_in_at to now (for direct completion)
      updateData.check_in_at = new Date().toISOString();
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal menyelesaikan booking: ${updateError.message}`,
      };
    }

    // Add pending funds to worker's wallet
    const { data: workerUser } = await supabase
      .from("workers")
      .select("user_id")
      .eq("id", booking.worker_id)
      .single();

    if (workerUser && finalPrice) {
      const walletResult = await addPendingFundsAction(
        workerUser.user_id,
        finalPrice,
        bookingId,
        options?.notes ||
          `Pembayaran untuk ${booking.jobs?.title || "pekerjaan"}`,
      );

      if (!walletResult.success) {
        console.error(
          "Gagal menambahkan dana ke dompet worker:",
          walletResult.error,
        );
      }
    }

    // Send notifications
    const jobTitle = booking.jobs?.title || "pekerjaan";

    // Notify worker about completion
    if (booking.workers) {
      await createNotification(
        (booking.workers as any).user_id,
        "Pekerjaan Selesai",
        `${jobTitle} telah diselesaikan. Pembayaran akan diproses dalam 24 jam.`,
        `/worker/bookings/${bookingId}`,
      );

      const { enabled } = await isNotificationTypeEnabled(
        (booking.workers as any).user_id,
        "payment_confirmation",
      );
      if (enabled) {
        await sendPushNotification(
          (booking.workers as any).user_id,
          "Pekerjaan Selesai",
          `Pembayaran Rp ${finalPrice?.toLocaleString("id-ID")} sedang diproses`,
          `/worker/bookings/${bookingId}`,
        );
      }
    }

    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error("Error in completeBooking:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat menyelesaikan booking",
    };
  }
}
