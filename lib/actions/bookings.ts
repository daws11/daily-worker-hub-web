"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import { checkComplianceBeforeAccept } from "./compliance";

// Re-export InterviewSession type from dedicated module for backward compatibility
export type { InterviewSession } from "./interview-sessions";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

// Types for bookings with joined data
type BookingWithJob = Booking & {
  jobs: {
    id: string;
    title: string;
    budget_min: number;
    budget_max: number;
  } | null;
};

type BookingWithJobAndBusiness = Booking & {
  jobs: {
    id: string;
    title: string;
    description: string | null;
    budget_min: number;
    budget_max: number;
    deadline: string | null;
    address: string | null;
  } | null;
  businesses: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

type BookingWithJobAndWorker = Booking & {
  jobs: {
    id: string;
    title: string;
    description: string | null;
    budget_min: number;
    budget_max: number;
    deadline: string | null;
    address: string | null;
  } | null;
  workers: {
    id: string;
    full_name: string;
    phone: string | null;
    bio: string | null;
    avatar_url: string | null;
  } | null;
};

// Type for updating a booking
type BookingUpdate = Partial<
  Database["public"]["Tables"]["bookings"]["Update"]
> & {
  check_out_at?: string;
};

export type CheckoutResult = {
  success: boolean;
  error?: string;
  data?: Booking;
};

export type CreateBookingResult = {
  success: boolean;
  error?: string;
  data?: Booking;
  complianceStatus?: {
    canAccept: boolean;
    daysWorked: number;
    message: string;
  };
};

/**
 * Create a new booking with PP 35/2021 compliance check
 * Checks if the worker can be booked for the business (21-day limit)
 *
 * @param jobId - The job ID
 * @param workerId - The worker ID
 * @param businessId - The business ID
 * @param startDate - Optional start date
 * @param endDate - Optional end date
 * @returns Booking result with compliance status
 */
export async function createBooking(
  jobId: string,
  workerId: string,
  businessId: string,
  startDate?: string,
  endDate?: string,
): Promise<CreateBookingResult> {
  try {
    const supabase = await createClient();

    // First, check PP 35/2021 compliance (21-day limit)
    const complianceCheck = await checkComplianceBeforeAccept(
      workerId,
      businessId,
    );

    if (!complianceCheck.success) {
      return {
        success: false,
        error: complianceCheck.error || "Gagal mengecek kepatuhan PP 35/2021",
      };
    }

    // If worker cannot be accepted due to compliance
    if (
      !complianceCheck.canAccept ||
      complianceCheck.data?.status === "blocked"
    ) {
      return {
        success: false,
        error:
          "Pekerja telah mencapai batas 21 hari bulan ini (PP 35/2021). Tidak dapat menerima booking baru.",
        complianceStatus: {
          canAccept: false,
          daysWorked: complianceCheck.data?.daysWorked || 21,
          message:
            complianceCheck.data?.message || "PP 35/2021 violation detected",
        },
      };
    }

    // Verify the job exists
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, business_id")
      .eq("id", jobId)
      .eq("business_id", businessId)
      .single();

    if (jobError || !job) {
      return { success: false, error: "Pekerjaan tidak ditemukan" };
    }

    // Create the booking with pending status
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        job_id: jobId,
        worker_id: workerId,
        business_id: businessId,
        status: "pending",
        start_date: startDate || new Date().toISOString(),
        end_date: endDate,
      })
      .select()
      .single();

    if (bookingError) {
      return {
        success: false,
        error: `Gagal membuat booking: ${bookingError.message}`,
      };
    }

    // If there's a warning (16-20 days), include compliance info
    const complianceStatus =
      complianceCheck.data?.status === "warning"
        ? {
            canAccept: true,
            daysWorked: complianceCheck.data?.daysWorked || 0,
            message: complianceCheck.data?.message || "",
          }
        : undefined;

    return { success: true, data: booking, complianceStatus };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat booking" };
  }
}

/**
 * Accept a booking with PP 35/2021 compliance check
 * This is called when a business accepts a worker's application
 *
 * @param bookingId - The booking ID
 * @param businessId - The business ID (for verification)
 * @returns Booking result
 */
export async function acceptBooking(
  bookingId: string,
  businessId: string,
): Promise<CheckoutResult> {
  try {
    const supabase = await createClient();

    // Get the booking to verify it belongs to the business
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
      .eq("business_id", businessId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    // Type assertion
    const typedBooking = booking as BookingWithJob;

    // Check compliance before accepting
    const complianceCheck = await checkComplianceBeforeAccept(
      typedBooking.worker_id,
      typedBooking.business_id,
    );

    if (!complianceCheck.success) {
      return {
        success: false,
        error: complianceCheck.error || "Gagal mengecek kepatuhan PP 35/2021",
      };
    }

    // If worker cannot be accepted due to compliance (blocked at 21 days)
    if (
      !complianceCheck.canAccept ||
      complianceCheck.data?.status === "blocked"
    ) {
      return {
        success: false,
        error:
          "Pekerja telah mencapai batas 21 hari bulan ini (PP 35/2021). Tidak dapat menerima pekerja ini.",
      };
    }

    // Update booking status to accepted
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "accepted",
        start_date: new Date().toISOString(), // Set start date when accepted
      })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal menerima booking: ${updateError.message}`,
      };
    }

    // Send notification to worker
    const { createNotification } = await import("./notifications");
    const jobTitle = typedBooking.jobs?.title || "pekerjaan";

    await createNotification(
      typedBooking.worker_id,
      "Booking Diterima",
      `Selamat! ${jobTitle} Anda telah diterima oleh bisnis.`,
      `/worker/jobs`,
    );

    return { success: true, data: updatedBooking };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menerima booking" };
  }
}

/**
 * Reject a booking
 *
 * @param bookingId - The booking ID
 * @param businessId - The business ID (for verification)
 * @returns Booking result
 */
export async function rejectBooking(
  bookingId: string,
  businessId: string,
): Promise<CheckoutResult> {
  try {
    const supabase = await createClient();

    // Get the booking to verify it belongs to the business
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        jobs (
          id,
          title
        )
      `,
      )
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" };
    }

    // Type assertion
    const typedBooking = booking as BookingWithJob;

    // Update booking status to rejected
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "rejected",
      })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Gagal menolak booking: ${updateError.message}`,
      };
    }

    // Send notification to worker
    const { createNotification } = await import("./notifications");
    const jobTitle = typedBooking.jobs?.title || "pekerjaan";

    await createNotification(
      typedBooking.worker_id,
      "Booking Ditolak",
      `Mohon maaf, ${jobTitle} Anda ditolak oleh bisnis.`,
      `/worker/jobs`,
    );

    return { success: true, data: updatedBooking };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menolak booking" };
  }
}

/**
 * Worker checks out from a job
 * - Marks booking as completed
 * - Sets checkout_time and review_deadline
 * - Initiates payment hold in worker's pending balance
 */
export async function checkoutBooking(
  bookingId: string,
  workerId: string,
): Promise<CheckoutResult> {
  try {
    const supabase = await createClient();

    // Verify the booking belongs to the worker and is in_progress
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

    // Type assertion for joined query result
    const typedBooking = booking as BookingWithJob;

    if (typedBooking.status !== "in_progress") {
      return {
        success: false,
        error: "Hanya pekerjaan yang sedang berjalan yang bisa di-checkout",
      };
    }

    // Calculate final price (use the budget_max as the agreed price)
    const finalPrice =
      typedBooking.jobs?.budget_max || typedBooking.final_price || 0;

    // Calculate review deadline (24 hours from now)
    const reviewDeadline = new Date();
    reviewDeadline.setHours(reviewDeadline.getHours() + 24);

    // Update the booking
    const bookingUpdate: BookingUpdate = {
      status: "completed",
      check_out_at: new Date().toISOString(),
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
    // Import dynamically to avoid circular dependency
    const { addPendingFundsAction } = await import("./wallets");
    const walletResult = await addPendingFundsAction(
      workerId,
      finalPrice,
      bookingId,
      `Pembayaran untuk ${typedBooking.jobs?.title || "pekerjaan"}`,
    );

    if (!walletResult.success) {
      // Log but don't fail - booking was updated successfully
      console.error(
        "Gagal menambahkan dana ke dompet worker:",
        walletResult.error,
      );
    }

    // Send notifications
    // Import dynamically to avoid circular dependency
    const { createNotification } = await import("./notifications");

    // Notify worker about successful checkout
    const jobTitle = typedBooking.jobs?.title || "pekerjaan";
    await createNotification(
      workerId,
      "Checkout Berhasil",
      `Anda telah menyelesaikan ${jobTitle}. Pembayaran sedang dalam proses review selama 24 jam.`,
      `/worker/jobs`,
    );

    // Notify business about worker checkout
    if (typedBooking.business_id) {
      await createNotification(
        typedBooking.business_id,
        "Pekerjaan Selesai",
        `Pekerja telah menyelesaikan ${jobTitle}. Silakan review pekerjaan dalam 24 jam.`,
        `/business/jobs`,
      );
    }

    return { success: true, data: updatedBooking };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat checkout pekerjaan",
    };
  }
}

/**
 * Get booking details for a worker
 */
export async function getWorkerBooking(bookingId: string, workerId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
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
      `,
      )
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single();

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    return {
      success: true,
      data: data as BookingWithJobAndBusiness | null,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: "Gagal mengambil data booking",
      data: null,
    };
  }
}

/**
 * Get booking details for a business
 */
export async function getBusinessBooking(
  bookingId: string,
  businessId: string,
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
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
      `,
      )
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single();

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    return {
      success: true,
      data: data as BookingWithJobAndWorker | null,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: "Gagal mengambil data booking",
      data: null,
    };
  }
}

/**
 * Get all bookings for a worker
 */
export async function getWorkerBookings(
  workerId: string,
  status?: Booking["status"],
) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("bookings")
      .select(
        `
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
      `,
      )
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    return {
      success: true,
      data: data as BookingWithJobAndBusiness[] | null,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: "Gagal mengambil data booking",
      data: null,
    };
  }
}

/**
 * Get all bookings for a business
 */
export async function getBusinessBookings(
  businessId: string,
  status?: Booking["status"],
) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("bookings")
      .select(
        `
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
      `,
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    return {
      success: true,
      data: data as BookingWithJobAndWorker[] | null,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: "Gagal mengambil data booking",
      data: null,
    };
  }
}

// ============================================================================
// BACKWARD-COMPATIBLE RE-EXPORTS
// All interview session functions are now in the dedicated interview-sessions.ts module.
// These re-exports ensure existing imports from bookings.ts continue to work.
// ============================================================================

export {
  createInterviewSession,
  startInterviewSession,
  startChatInterview,
  completeChatInterview,
  startVoiceCallInterview,
  completeVoiceCallInterview,
  completeInterviewSession,
  cancelInterviewSession,
  getInterviewSessionByBooking,
  incrementInterviewMessageCount,
  calculateBookingTimeToHire,
} from "./interview-sessions";
