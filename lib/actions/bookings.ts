"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { checkComplianceBeforeAccept } from "./compliance"
import { createInterviewSession as createInterviewSessionUtil } from "../algorithms/interview-flow"

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type Job = Database["public"]["Tables"]["jobs"]["Row"]

/**
 * Interview session type (stored in a separate table or as JSON in booking)
 */
export type InterviewSession = {
  id: string
  bookingId: string
  businessId: string
  workerId: string
  workerTier: Database["public"]["Enums"]["worker_tier"]
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  type: 'none' | 'chat' | 'chat_and_voice'
  startedAt: string | null
  completedAt: string | null
  chatStartedAt: string | null
  chatCompletedAt: string | null
  voiceStartedAt: string | null
  voiceCompletedAt: string | null
  chatDuration: number | null
  voiceDuration: number | null
  totalDuration: number | null
  messagesSent: number
  voiceCallInitiated: boolean
  timeToHire: number | null
  createdAt: string
}

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

export type CreateBookingResult = {
  success: boolean
  error?: string
  data?: Booking
  complianceStatus?: {
    canAccept: boolean
    daysWorked: number
    message: string
  }
}

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
  endDate?: string
): Promise<CreateBookingResult> {
  try {
    const supabase = await createClient()

    // First, check PP 35/2021 compliance (21-day limit)
    const complianceCheck = await checkComplianceBeforeAccept(workerId, businessId)

    if (!complianceCheck.success) {
      return {
        success: false,
        error: complianceCheck.error || "Gagal mengecek kepatuhan PP 35/2021"
      }
    }

    // If worker cannot be accepted due to compliance
    if (!complianceCheck.canAccept || complianceCheck.data?.status === "blocked") {
      return {
        success: false,
        error: "Pekerja telah mencapai batas 21 hari bulan ini (PP 35/2021). Tidak dapat menerima booking baru.",
        complianceStatus: {
          canAccept: false,
          daysWorked: complianceCheck.data?.daysWorked || 21,
          message: complianceCheck.data?.message || "PP 35/2021 violation detected"
        }
      }
    }

    // Verify the job exists
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, business_id")
      .eq("id", jobId)
      .eq("business_id", businessId)
      .single()

    if (jobError || !job) {
      return { success: false, error: "Pekerjaan tidak ditemukan" }
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
      .single()

    if (bookingError) {
      return { success: false, error: `Gagal membuat booking: ${bookingError.message}` }
    }

    // If there's a warning (16-20 days), include compliance info
    const complianceStatus = complianceCheck.data?.status === "warning"
      ? {
          canAccept: true,
          daysWorked: complianceCheck.data?.daysWorked || 0,
          message: complianceCheck.data?.message || ""
        }
      : undefined

    return { success: true, data: booking, complianceStatus }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat booking" }
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
export async function acceptBooking(bookingId: string, businessId: string): Promise<CheckoutResult> {
  try {
    const supabase = await createClient()

    // Get the booking to verify it belongs to the business
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
      .eq("business_id", businessId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    // Type assertion
    const typedBooking = booking as BookingWithJob

    // Check compliance before accepting
    const complianceCheck = await checkComplianceBeforeAccept(
      typedBooking.worker_id,
      typedBooking.business_id
    )

    if (!complianceCheck.success) {
      return { success: false, error: complianceCheck.error || "Gagal mengecek kepatuhan PP 35/2021" }
    }

    // If worker cannot be accepted due to compliance (blocked at 21 days)
    if (!complianceCheck.canAccept || complianceCheck.data?.status === "blocked") {
      return {
        success: false,
        error: "Pekerja telah mencapai batas 21 hari bulan ini (PP 35/2021). Tidak dapat menerima pekerja ini."
      }
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
      .single()

    if (updateError) {
      return { success: false, error: `Gagal menerima booking: ${updateError.message}` }
    }

    // Send notification to worker
    const { createNotification } = await import("./notifications")
    const jobTitle = typedBooking.jobs?.title || "pekerjaan"

    await createNotification(
      typedBooking.worker_id,
      "Booking Diterima",
      `Selamat! ${jobTitle} Anda telah diterima oleh bisnis.`,
      `/worker/jobs`
    )

    return { success: true, data: updatedBooking }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menerima booking" }
  }
}

/**
 * Reject a booking
 *
 * @param bookingId - The booking ID
 * @param businessId - The business ID (for verification)
 * @returns Booking result
 */
export async function rejectBooking(bookingId: string, businessId: string): Promise<CheckoutResult> {
  try {
    const supabase = await createClient()

    // Get the booking to verify it belongs to the business
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title
        )
      `)
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    // Type assertion
    const typedBooking = booking as BookingWithJob

    // Update booking status to rejected
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "rejected"
      })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal menolak booking: ${updateError.message}` }
    }

    // Send notification to worker
    const { createNotification } = await import("./notifications")
    const jobTitle = typedBooking.jobs?.title || "pekerjaan"

    await createNotification(
      typedBooking.worker_id,
      "Booking Ditolak",
      `Mohon maaf, ${jobTitle} Anda ditolak oleh bisnis.`,
      `/worker/jobs`
    )

    return { success: true, data: updatedBooking }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menolak booking" }
  }
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
      `/worker/jobs`
    )

    // Notify business about worker checkout
    if (typedBooking.business_id) {
      await createNotification(
        typedBooking.business_id,
        "Pekerjaan Selesai",
        `Pekerja telah menyelesaikan ${jobTitle}. Silakan review pekerjaan dalam 24 jam.`,
        `/business/jobs`
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

/**
 * Interview-related functions
 */

/**
 * Create an interview session for a booking
 */
export async function createInterviewSession(
  bookingId: string,
  businessId: string,
  workerId: string,
  workerTier: Database["public"]["Enums"]["worker_tier"]
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    // Verify the booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (bookingError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    // Create interview session
    const session = createInterviewSessionUtil(
      bookingId,
      businessId,
      workerId,
      workerTier
    )

    const { data, error } = await supabase
      .from("interview_sessions")
      .insert({
        booking_id: bookingId,
        business_id: businessId,
        worker_id: workerId,
        worker_tier: workerTier,
        status: session.status,
        type: session.type,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        chat_started_at: session.chatStartedAt,
        chat_completed_at: session.chatCompletedAt,
        voice_started_at: session.voiceStartedAt,
        voice_completed_at: session.voiceCompletedAt,
        chat_duration: session.chatDuration,
        voice_duration: session.voiceDuration,
        total_duration: session.totalDuration,
        messages_sent: session.messagesSent,
        voice_call_initiated: session.voiceCallInitiated,
        time_to_hire: session.timeToHire,
        created_at: session.createdAt,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membuat interview session: ${error.message}` }
    }

    return { success: true, data: data as InterviewSession }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat interview session" }
  }
}

/**
 * Start an interview session
 */
export async function startInterviewSession(
  interviewSessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    // Verify the interview session exists and belongs to the user
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single()

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" }
    }

    if (session.status !== 'pending') {
      return { success: false, error: "Interview session sudah dimulai atau selesai" }
    }

    // Update session to in_progress
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq("id", interviewSessionId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal memulai interview: ${error.message}` }
    }

    return { success: true, data: data as InterviewSession }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memulai interview" }
  }
}

/**
 * Start chat phase of interview
 */
export async function startChatInterview(
  interviewSessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single()

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" }
    }

    if (session.chat_started_at) {
      return { success: false, error: "Chat interview sudah dimulai" }
    }

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        chat_started_at: new Date().toISOString(),
      })
      .eq("id", interviewSessionId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal memulai chat: ${error.message}` }
    }

    return { success: true, data: data as InterviewSession }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memulai chat" }
  }
}

/**
 * Complete chat phase of interview
 */
export async function completeChatInterview(
  interviewSessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single()

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" }
    }

    if (!session.chat_started_at) {
      return { success: false, error: "Chat interview belum dimulai" }
    }

    if (session.chat_completed_at) {
      return { success: false, error: "Chat interview sudah selesai" }
    }

    const chatStartedAt = new Date(session.chat_started_at).getTime()
    const chatCompletedAt = Date.now()
    const chatDuration = Math.floor((chatCompletedAt - chatStartedAt) / 1000)

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        chat_completed_at: new Date().toISOString(),
        chat_duration: chatDuration,
      })
      .eq("id", interviewSessionId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal menyelesaikan chat: ${error.message}` }
    }

    return { success: true, data: data as InterviewSession }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menyelesaikan chat" }
  }
}

/**
 * Start voice call phase of interview
 */
export async function startVoiceCallInterview(
  interviewSessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single()

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" }
    }

    if (session.voice_started_at) {
      return { success: false, error: "Voice call sudah dimulai" }
    }

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        voice_started_at: new Date().toISOString(),
        voice_call_initiated: true,
      })
      .eq("id", interviewSessionId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal memulai voice call: ${error.message}` }
    }

    return { success: true, data: data as InterviewSession }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memulai voice call" }
  }
}

/**
 * Complete voice call phase of interview
 */
export async function completeVoiceCallInterview(
  interviewSessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single()

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" }
    }

    if (!session.voice_started_at) {
      return { success: false, error: "Voice call belum dimulai" }
    }

    if (session.voice_completed_at) {
      return { success: false, error: "Voice call sudah selesai" }
    }

    const voiceStartedAt = new Date(session.voice_started_at).getTime()
    const voiceCompletedAt = Date.now()
    const voiceDuration = Math.floor((voiceCompletedAt - voiceStartedAt) / 1000)

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        voice_completed_at: new Date().toISOString(),
        voice_duration: voiceDuration,
      })
      .eq("id", interviewSessionId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal menyelesaikan voice call: ${error.message}` }
    }

    return { success: true, data: data as InterviewSession }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menyelesaikan voice call" }
  }
}

/**
 * Complete an interview session
 */
export async function completeInterviewSession(
  interviewSessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single()

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" }
    }

    if (session.status === 'completed' || session.status === 'skipped') {
      return { success: false, error: "Interview session sudah selesai" }
    }

    // Calculate total duration
    let totalDuration = 0
    if (session.started_at) {
      totalDuration = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    }

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_duration: totalDuration,
      })
      .eq("id", interviewSessionId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal menyelesaikan interview: ${error.message}` }
    }

    // Update booking status to accepted
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({ status: 'accepted' })
      .eq("id", session.booking_id)

    if (bookingError) {
      console.error("Gagal mengupdate status booking:", bookingError)
    }

    return { success: true, data: data as InterviewSession }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menyelesaikan interview" }
  }
}

/**
 * Cancel an interview session
 */
export async function cancelInterviewSession(
  interviewSessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    // Verify the interview session
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", interviewSessionId)
      .or(`business_id.eq.${userId},worker_id.eq.${userId}`)
      .single()

    if (fetchError || !session) {
      return { success: false, error: "Interview session tidak ditemukan" }
    }

    if (session.status === 'completed' || session.status === 'skipped') {
      return { success: false, error: "Interview session sudah selesai" }
    }

    // Update session
    const { data, error } = await supabase
      .from("interview_sessions")
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq("id", interviewSessionId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membatalkan interview: ${error.message}` }
    }

    // Update booking status to rejected
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({ status: 'rejected' })
      .eq("id", session.booking_id)

    if (bookingError) {
      console.error("Gagal mengupdate status booking:", bookingError)
    }

    return { success: true, data: data as InterviewSession }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membatalkan interview" }
  }
}

/**
 * Get interview session by booking ID
 */
export async function getInterviewSessionByBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string; data?: InterviewSession }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("booking_id", bookingId)
      .single()

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data: data as InterviewSession, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil interview session", data: null }
  }
}

/**
 * Increment message count in interview session
 */
export async function incrementInterviewMessageCount(
  interviewSessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('increment_interview_messages', {
      session_id: interviewSessionId
    })

    if (error) {
      // Fallback: fetch, increment, update
      const { data: session } = await supabase
        .from("interview_sessions")
        .select("messages_sent")
        .eq("id", interviewSessionId)
        .single()

      if (session) {
        await supabase
          .from("interview_sessions")
          .update({ messages_sent: (session.messages_sent || 0) + 1 })
          .eq("id", interviewSessionId)
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: "Gagal mengupdate message count" }
  }
}

/**
 * Calculate time-to-hire for a booking
 */
export async function calculateBookingTimeToHire(
  bookingId: string
): Promise<{ success: boolean; timeToHire?: number; error?: string }> {
  try {
    const supabase = await createClient()

    // Get booking with job
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          created_at
        )
      `)
      .eq("id", bookingId)
      .single()

    if (bookingError || !booking || !booking.jobs) {
      return { success: false, error: "Booking atau job tidak ditemukan" }
    }

    if (!booking.updated_at) {
      return { success: false, error: "Booking belum diupdate" }
    }

    const jobPostedAt = new Date(booking.jobs.created_at).getTime()
    const bookingAcceptedAt = new Date(booking.updated_at).getTime()
    const timeToHireMinutes = Math.round(((bookingAcceptedAt - jobPostedAt) / (1000 * 60)) * 10) / 10

    return { success: true, timeToHire: timeToHireMinutes }
  } catch (error) {
    return { success: false, error: "Gagal menghitung time-to-hire" }
  }
}

