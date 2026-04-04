"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import { createNotification } from "./notifications";
import {
  sendPushNotification,
  isNotificationTypeEnabled,
} from "./push-notifications";
import { checkComplianceBeforeAccept } from "./compliance";

// ============================================================================
// TYPES
// ============================================================================

type JobApplication = Database["public"]["Tables"]["job_applications"]["Row"];
type JobApplicationInsert = Omit<
  Database["public"]["Tables"]["job_applications"]["Insert"],
  "id" | "created_at" | "updated_at"
>;
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Job = Database["public"]["Tables"]["jobs"]["Row"];

export type ApplicationResult = {
  success: boolean;
  error?: string;
  data?: JobApplication;
};

export type ApplicationWithBooking = {
  application: JobApplication;
  booking: Booking;
};

export type DuplicateCheckResult = {
  hasApplied: boolean;
  application?: JobApplication;
};

// ============================================================================
// JOB APPLICATION ACTIONS
// ============================================================================

/**
 * Worker applies for a job with PP 35/2021 compliance check
 * Creates a new job application with status 'pending'
 * Checks if worker has already worked 21+ days for this business this month
 *
 * @param jobId - The job ID to apply for
 * @param workerId - The worker ID
 * @param options - Optional application details (cover letter, proposed wage, availability)
 * @returns Application result
 */
export async function createJobApplication(
  jobId: string,
  workerId: string,
  options?: {
    coverLetter?: string;
    proposedWage?: number;
    availability?: any[];
  },
): Promise<ApplicationResult> {
  try {
    const supabase = await createClient();

    // Verify the worker exists (lookup by user_id since workerId is the auth user's ID)
    // Also fetch tier, avatar, bio, and skills for profile completeness check
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id, user_id, full_name, tier, avatar_url, bio")
      .eq("user_id", workerId)
      .single();

    if (workerError || !worker) {
      return { success: false, error: "Data pekerja tidak ditemukan" };
    }

    // Check profile completeness for Classic tier workers
    // Classic workers must have: photo (avatar_url), bio, and at least 1 skill
    if (worker.tier === "classic") {
      // Check avatar (photo)
      if (!worker.avatar_url) {
        return {
          success: false,
          error: "Lengkapi profile Anda sebelum melamar. Tambahkan foto profile.",
        };
      }

      // Check bio
      if (!worker.bio || worker.bio.trim().length < 10) {
        return {
          success: false,
          error: "Lengkapi profile Anda sebelum melamar. Tambahkan bio profile.",
        };
      }

      // Check skills - fetch worker_skills
      const { data: workerSkills } = await supabase
        .from("worker_skills")
        .select("id")
        .eq("worker_id", worker.id)
        .limit(1);

      if (!workerSkills || workerSkills.length === 0) {
        return {
          success: false,
          error: "Lengkapi profile Anda sebelum melamar. Tambahkan minimal 1 skill.",
        };
      }
    }

    if (workerError || !worker) {
      return { success: false, error: "Data pekerja tidak ditemukan" };
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, business_id, title, status")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return { success: false, error: "Pekerjaan tidak ditemukan" };
    }

    // Check if job is still open
    if (job.status !== "open") {
      return { success: false, error: "Pekerjaan ini sudah tidak tersedia" };
    }

    // Check if worker has already applied for this job
    const { data: existingApplication } = await supabase
      .from("job_applications")
      .select("*")
      .eq("job_id", jobId)
      .eq("worker_id", worker.id)  // Use workers table ID, not auth user ID
      .single();

    if (existingApplication) {
      // Check if they can re-apply (only if previous application was withdrawn)
      if (existingApplication.status !== "withdrawn") {
        return {
          success: false,
          error: "Anda sudah melamar untuk pekerjaan ini",
        };
      }
    }

    // Check PP 35/2021 compliance (21-day limit) BEFORE allowing application
    // Note: If compliance check fails due to DB schema issues, allow the application to proceed
    let complianceCheck;
    try {
      complianceCheck = await checkComplianceBeforeAccept(
        worker.id,
        job.business_id,
      );

      // If compliance check itself failed (DB error), log warning and continue
      if (!complianceCheck.success) {
        console.warn("Compliance check failed, allowing application to proceed:", complianceCheck.error);
        // Continue with application - compliance check failure should not block applications
      }
      // If worker cannot apply due to compliance (blocked at 21 days)
      else if (
        !complianceCheck.canAccept ||
        complianceCheck.data?.status === "blocked"
      ) {
        const daysWorked = complianceCheck.data?.daysWorked || 21;
        return {
          success: false,
          error: `Anda telah bekerja ${daysWorked} hari bulan ini dengan bisnis ini. PP 35/2021 membatasi pekerja harian maksimal 21 hari/bulan. Silakan cari pekerjaan di bisnis lain.`,
        };
      }
    } catch (complianceError) {
      // If compliance check throws due to DB schema issues, allow the application to proceed
      console.warn("Compliance check threw error, allowing application:", complianceError);
      // Continue with application - compliance check failure should not block applications
    }

    // Get business owner's user_id for notification
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", job.business_id)
      .single();

    if (businessError || !business) {
      return { success: false, error: "Data bisnis tidak ditemukan" };
    }

    // Create the job application
    const newApplication: JobApplicationInsert = {
      job_id: jobId,
      worker_id: worker.id,
      business_id: job.business_id,
      status: "pending",
      cover_letter: options?.coverLetter || null,
      proposed_wage: options?.proposedWage || null,
      availability_json: options?.availability || null,
    };

    const { data, error } = await supabase
      .from("job_applications")
      .insert(newApplication)
      .select()
      .single();

    if (error) {
      console.error("Error creating application:", error);
      return { success: false, error: `Gagal melamar: ${error.message}` };
    }

    // Create notification for business owner
    await createNotification(
      business.user_id,
      "Pelamar Baru",
      `${worker.full_name} melamar untuk pekerjaan ${job.title}`,
      `/business/jobs/${jobId}/applicants`,
    );

    return { success: true, data };
  } catch (error) {
    console.error("Error in createJobApplication:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat melamar pekerjaan",
    };
  }
}

/**
 * Get all applications for a specific job (business view)
 * Includes worker profile information
 *
 * @param jobId - The job ID
 * @param businessId - The business ID (for verification)
 * @returns Applications list with worker details
 */
export async function getApplicationsByJob(
  jobId: string,
  businessId: string,
): Promise<{ success: boolean; error?: string; data?: any[] }> {
  try {
    const supabase = await createClient();

    // Verify the job belongs to the business
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .eq("business_id", businessId)
      .single();

    if (jobError || !job) {
      return {
        success: false,
        error: "Pekerjaan tidak ditemukan atau bukan milik Anda",
      };
    }

    // Get applications with worker details
    const { data, error } = await supabase
      .from("job_applications")
      .select(
        `
        *,
        workers (
          id,
          full_name,
          phone,
          bio,
          avatar_url,
          tier,
          rating,
          jobs_completed
        )
      `,
      )
      .eq("job_id", jobId)
      .order("applied_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Gagal mengambil data pelamar" };
  }
}

/**
 * Get all applications for a specific worker (worker view)
 * Includes job and business details
 *
 * @param workerId - The worker ID (can be auth.uid or workers.id - auto-detected)
 * @param status - Optional filter by status
 * @returns Applications list with job details
 */
export async function getApplicationsByWorker(
  workerId: string,
  status?: string,
): Promise<{ success: boolean; error?: string; data?: any[] }> {
  try {
    const supabase = await createClient();

    // If workerId looks like a user ID (not a worker record ID), lookup worker first
    // This handles both auth.uid and workers.id inputs
    let actualWorkerId = workerId;

    // Check if this is a user_id (auth.uid) by checking if it exists in workers table
    const { data: workerRecord } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", workerId)
      .single();

    if (workerRecord) {
      actualWorkerId = workerRecord.id;
    }

    let query = supabase
      .from("job_applications")
      .select(
        `
        *,
        jobs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          hours_needed,
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
      .eq("worker_id", actualWorkerId)
      .order("applied_at", { ascending: false });

    if (status) {
      query = query.eq(
        "status",
        status as Database["public"]["Tables"]["job_applications"]["Row"]["status"],
      );
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Gagal mengambil data lamaran" };
  }
}

/**
 * Update application status (review, accept, reject)
 * This is the main function for business actions on applications
 *
 * @param applicationId - The application ID
 * @param status - New status: shortlisted, accepted, rejected
 * @param businessId - The business ID (for verification)
 * @returns Updated application
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: "shortlisted" | "accepted" | "rejected",
  businessId: string,
): Promise<ApplicationResult> {
  try {
    const supabase = await createClient();

    // Verify the application belongs to the business
    const { data: application, error: fetchError } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", applicationId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !application) {
      return { success: false, error: "Lamaran tidak ditemukan" };
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ["shortlisted", "accepted", "rejected"],
      shortlisted: ["accepted", "rejected"],
    };

    if (!validTransitions[application.status]?.includes(status)) {
      return {
        success: false,
        error: `Tidak dapat mengubah status dari ${application.status} ke ${status}`,
      };
    }

    // Update the application
    const { data, error } = await supabase
      .from("job_applications")
      .update({ status })
      .eq("id", applicationId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal mengupdate status: ${error.message}`,
      };
    }

    // Send notification to worker
    const { data: worker } = await supabase
      .from("workers")
      .select("user_id")
      .eq("id", application.worker_id)
      .single();

    const { data: job } = await supabase
      .from("jobs")
      .select("title")
      .eq("id", application.job_id)
      .single();

    if (worker && job) {
      const statusMessages: Record<string, { title: string; body: string }> = {
        shortlisted: {
          title: "Lamaran Ditinjau",
          body: `Lamaran Anda untuk ${job.title} sedang ditinjau`,
        },
        accepted: {
          title: "Lamaran Diterima",
          body: `Selamat! Lamaran Anda untuk ${job.title} telah diterima`,
        },
        rejected: {
          title: "Lamaran Ditolak",
          body: `Maaf, lamaran Anda untuk ${job.title} belum dapat diterima`,
        },
      };

      const msg = statusMessages[status];
      await createNotification(
        worker.user_id,
        msg.title,
        msg.body,
        status === "accepted" ? `/worker/bookings` : `/worker/applications`,
      );

      // Send push notification if enabled
      const { enabled } = await isNotificationTypeEnabled(
        worker.user_id,
        "booking_status",
      );
      if (enabled) {
        await sendPushNotification(
          worker.user_id,
          msg.title,
          msg.body,
          `/worker/applications`,
        );
      }
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengupdate status lamaran",
    };
  }
}

/**
 * Accept application and create booking
 * This is a special action that:
 * 1. Updates application status to 'accepted'
 * 2. Creates a booking linked to the application
 * 3. Creates interview session based on worker tier
 *
 * @param applicationId - The application ID
 * @param businessId - The business ID (for verification)
 * @returns Application and booking
 */
export async function acceptApplicationAndCreateBooking(
  applicationId: string,
  businessId: string,
): Promise<{
  success: boolean;
  error?: string;
  data?: ApplicationWithBooking;
}> {
  try {
    const supabase = await createClient();

    // Get the application with worker and job details
    const { data: application, error: appError } = await supabase
      .from("job_applications")
      .select(
        `
        *,
        workers (
          id,
          user_id,
          full_name,
          tier
        ),
        jobs (
          id,
          title,
          budget_min,
          budget_max
        )
      `,
      )
      .eq("id", applicationId)
      .eq("business_id", businessId)
      .single();

    if (appError || !application) {
      return { success: false, error: "Lamaran tidak ditemukan" };
    }

    // Check PP 35/2021 compliance (21-day limit) BEFORE accepting
    const complianceCheck = await checkComplianceBeforeAccept(
      application.worker_id,
      businessId,
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
      const daysWorked = complianceCheck.data?.daysWorked || 21;
      return {
        success: false,
        error: `Pekerja telah bekerja ${daysWorked} hari bulan ini dengan bisnis Anda. PP 35/2021 membatasi pekerja harian maksimal 21 hari/bulan. Tidak dapat menerima pekerja ini bulan ini.`,
      };
    }

    // Update application status to accepted using SECURITY DEFINER function
    const { data: acceptResult, error: acceptError } = await supabase
      .rpc("accept_application", {
        p_application_id: applicationId,
        p_business_id: businessId,
      });

    if (acceptError || !acceptResult) {
      return {
        success: false,
        error: `Gagal menerima lamaran: ${acceptError?.message || "Unknown error"}`,
      };
    }

    // Create the booking using SECURITY DEFINER function to bypass RLS
    const { data: bookingId, error: bookingError } = await supabase
      .rpc("create_booking_for_application", {
        p_job_id: application.job_id,
        p_worker_id: application.worker_id,
        p_business_id: businessId,
        p_application_id: applicationId,
        p_start_date: new Date().toISOString().split("T")[0],
        p_final_price: application.jobs?.budget_max || 0,
      });

    if (bookingError || !bookingId) {
      // Rollback application status update
      await supabase
        .from("job_applications")
        .update({ status: "pending" })
        .eq("id", applicationId);

      return {
        success: false,
        error: `Gagal membuat booking: ${bookingError?.message || "Unknown error"}`,
      };
    }

    // Fetch the created booking
    const { data: booking, error: bookingFetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingFetchError || !booking) {
      return {
        success: false,
        error: `Booking dibuat tapi gagal mengambil data: ${bookingFetchError?.message || "Unknown error"}`,
      };
    }

    // Send notification to worker
    if (application.workers) {
      await createNotification(
        (application.workers as any).user_id,
        "Lamaran Diterima",
        `Selamat! Lamaran Anda untuk ${application.jobs?.title} telah diterima. Booking sedang diproses.`,
        `/worker/bookings`,
      );

      // Send push notification if enabled
      const { enabled } = await isNotificationTypeEnabled(
        (application.workers as any).user_id,
        "booking_status",
      );
      if (enabled) {
        await sendPushNotification(
          (application.workers as any).user_id,
          "Lamaran Diterima",
          `Selamat! Lamaran Anda untuk ${application.jobs?.title} telah diterima.`,
          `/worker/bookings`,
        );
      }
    }

    return {
      success: true,
      data: {
        application: application as JobApplication,
        booking: booking as Booking,
      },
    };
  } catch (error) {
    console.error("Error in acceptApplicationAndCreateBooking:", error);
    return { success: false, error: "Terjadi kesalahan saat menerima lamaran" };
  }
}

/**
 * Worker withdraws their pending application
 * Only allows withdrawal of pending applications
 *
 * @param applicationId - The application ID
 * @param workerId - The worker ID (for verification)
 * @returns Withdrawn application
 */
export async function withdrawApplication(
  applicationId: string,
  workerId: string,
): Promise<ApplicationResult> {
  try {
    const supabase = await createClient();

    // Verify the application belongs to the worker and is pending
    const { data: application, error: fetchError } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", applicationId)
      .eq("worker_id", workerId)
      .single();

    if (fetchError || !application) {
      return { success: false, error: "Lamaran tidak ditemukan" };
    }

    if (application.status !== "pending") {
      return {
        success: false,
        error: "Hanya lamaran yang masih pending yang bisa ditarik",
      };
    }

    // Update the application status to withdrawn
    const { data, error } = await supabase
      .from("job_applications")
      .update({ status: "withdrawn" })
      .eq("id", applicationId)
      .eq("worker_id", workerId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal menarik lamaran: ${error.message}`,
      };
    }

    // Get business owner's user_id for notification
    const { data: business } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", application.business_id)
      .single();

    if (business) {
      await createNotification(
        business.user_id,
        "Lamaran Ditarik",
        "Seorang pekerja telah menarik lamarannya",
        `/business/jobs/${application.job_id}/applicants`,
      );
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menarik lamaran" };
  }
}

/**
 * Check if worker has already applied for a specific job
 *
 * @param jobId - The job ID
 * @param workerId - The worker ID
 * @returns Duplicate check result
 */
export async function checkDuplicateApplication(
  jobId: string,
  workerId: string,
): Promise<DuplicateCheckResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("job_id", jobId)
      .eq("worker_id", workerId)
      .single();

    if (error || !data) {
      return { hasApplied: false };
    }

    return { hasApplied: true, application: data };
  } catch (error) {
    return { hasApplied: false };
  }
}

// ============================================================================
// LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use createJobApplication instead
 * This function is kept for backward compatibility
 */
export async function applyForJob(
  jobId: string,
  workerId: string,
): Promise<ApplicationResult> {
  return createJobApplication(jobId, workerId);
}

/**
 * @deprecated Use getApplicationsByWorker instead
 * This function is kept for backward compatibility
 */
export async function getWorkerApplications(workerId: string) {
  return getApplicationsByWorker(workerId);
}

/**
 * @deprecated Use getApplicationsByJob instead
 * This function is kept for backward compatibility
 */
export async function getJobApplicants(jobId: string, businessId: string) {
  return getApplicationsByJob(jobId, businessId);
}

/**
 * @deprecated Use updateApplicationStatus or acceptApplicationAndCreateBooking instead
 * This function is kept for backward compatibility
 */
export async function acceptApplication(
  bookingId: string,
  businessId: string,
): Promise<ApplicationResult> {
  // Legacy function - this now requires refactoring as bookings no longer store applications
  // Recommend using acceptApplicationAndCreateBooking with applicationId instead
  return {
    success: false,
    error: "Gunakan acceptApplicationAndCreateBooking dengan applicationId",
  };
}

/**
 * @deprecated Use updateApplicationStatus instead
 * This function is kept for backward compatibility
 */
export async function rejectApplication(
  bookingId: string,
  businessId: string,
): Promise<ApplicationResult> {
  // Legacy function - this now requires refactoring as bookings no longer store applications
  // Recommend using updateApplicationStatus with applicationId instead
  return {
    success: false,
    error: "Gunakan updateApplicationStatus dengan applicationId",
  };
}

/**
 * @deprecated Use withdrawApplication instead
 * This function is kept for backward compatibility
 */
export async function cancelApplication(
  bookingId: string,
  workerId: string,
): Promise<ApplicationResult> {
  // Legacy function - this now requires refactoring as bookings no longer store applications
  // Recommend using withdrawApplication with applicationId instead
  return {
    success: false,
    error: "Gunakan withdrawApplication dengan applicationId",
  };
}
