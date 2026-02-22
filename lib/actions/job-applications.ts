"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { checkComplianceBeforeAccept } from "./compliance"

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type Job = Database["public"]["Tables"]["jobs"]["Row"]

// Type for inserting a new booking (application)
type BookingInsert = Pick<Booking, 'job_id' | 'worker_id' | 'business_id' | 'status' | 'start_date' | 'end_date' | 'final_price'>

export type ApplicationResult = {
  success: boolean
  error?: string
  data?: Booking
}

export type DuplicateCheckResult = {
  hasApplied: boolean
  application?: Booking
}

/**
 * Worker applies for a job
 * Creates a new booking with status 'pending'
 */
export async function applyForJob(jobId: string, workerId: string): Promise<ApplicationResult> {
  try {
    const supabase = await createClient()

    // First, check if worker has already applied for this job
    const { data: existingApplication, error: checkError } = await supabase
      .from("bookings")
      .select("*")
      .eq("job_id", jobId)
      .eq("worker_id", workerId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = not found, which is expected for new applications
      return { success: false, error: "Gagal mengecek status lamaran" }
    }

    if (existingApplication) {
      return { success: false, error: "Anda sudah melamar untuk pekerjaan ini" }
    }

    // Get job details to fetch business_id
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("business_id")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      return { success: false, error: "Pekerjaan tidak ditemukan" }
    }

    // Create the booking (application)
    const newBooking: BookingInsert = {
      job_id: jobId,
      worker_id: workerId,
      business_id: job.business_id,
      status: "pending",
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      final_price: 0,
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert(newBooking)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal melamar: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat melamar pekerjaan" }
  }
}

/**
 * Worker cancels their pending application
 * Only allows cancellation of pending applications
 */
export async function cancelApplication(bookingId: string, workerId: string): Promise<ApplicationResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the worker and is pending
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Lamaran tidak ditemukan" }
    }

    if (booking.status !== "pending") {
      return { success: false, error: "Hanya lamaran yang masih pending yang bisa dibatalkan" }
    }

    // Update the booking status to cancelled
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membatalkan lamaran: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membatalkan lamaran" }
  }
}

/**
 * Check if worker has already applied for a specific job
 */
export async function checkDuplicateApplication(
  jobId: string,
  workerId: string
): Promise<DuplicateCheckResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("job_id", jobId)
      .eq("worker_id", workerId)
      .single()

    if (error || !data) {
      return { hasApplied: false }
    }

    return { hasApplied: true, application: data }
  } catch (error) {
    return { hasApplied: false }
  }
}

/**
 * Get all applications for a specific worker
 */
export async function getWorkerApplications(workerId: string) {
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
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data lamaran", data: null }
  }
}

/**
 * Get all applicants for a specific job (business view)
 */
export async function getJobApplicants(jobId: string, businessId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        workers (
          id,
          full_name,
          phone,
          bio,
          avatar_url
        )
      `)
      .eq("job_id", jobId)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data pelamar", data: null }
  }
}

/**
 * Business accepts an applicant
 * Checks PP 35/2021 compliance before accepting (21-day limit for daily workers)
 */
export async function acceptApplication(bookingId: string, businessId: string): Promise<ApplicationResult> {
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
      return { success: false, error: "Lamaran tidak ditemukan" }
    }

    if (booking.status !== "pending") {
      return { success: false, error: "Hanya lamaran dengan status pending yang bisa diterima" }
    }

    // Check PP 35/2021 compliance before accepting
    const complianceCheck = await checkComplianceBeforeAccept(booking.worker_id, businessId)

    if (!complianceCheck.success) {
      return { success: false, error: complianceCheck.error || "Gagal mengecek kepatuhan PP 35/2021" }
    }

    if (!complianceCheck.canAccept) {
      const daysWorked = complianceCheck.data?.days_worked || 0
      return {
        success: false,
        error: `Pekerja telah mencapai batas 21 hari kerja dalam sebulan sesuai PP 35/2021 (${daysWorked} hari). Tidak dapat menerima lamaran.`
      }
    }

    // Update the booking status to accepted
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "accepted" })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal menerima lamaran: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menerima lamaran" }
  }
}

/**
 * Business rejects an applicant
 */
export async function rejectApplication(bookingId: string, businessId: string): Promise<ApplicationResult> {
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
      return { success: false, error: "Lamaran tidak ditemukan" }
    }

    if (booking.status !== "pending") {
      return { success: false, error: "Hanya lamaran dengan status pending yang bisa ditolak" }
    }

    // Update the booking status to rejected
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "rejected" })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal menolak lamaran: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menolak lamaran" }
  }
}
