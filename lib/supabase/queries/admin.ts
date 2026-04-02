// @ts-nocheck
import { supabase } from "../client";
import type { Database } from "../../supabase/types";
import type {
  UserManagementFilters,
  UserManagementItem,
  WorkerManagementFilters,
  WorkerManagementItem,
  BusinessVerificationFilters,
  BusinessVerificationItem,
  KYCVerificationFilters,
  KYCVerificationItem,
  JobModerationFilters,
  JobModerationItem,
  DisputeFilters,
  DisputeItem,
  PaginatedAdminResponse,
} from "../../types/admin";

// ============================================================================
// SHARED TYPES
// ============================================================================

/** Supabase query builder for chained filter calls */
type QueryBuilder = ReturnType<typeof supabase.from>;

// ============================================================================
// BUSINESS VERIFICATION
// ============================================================================

export async function getBusinessesForVerification(
  filters: BusinessVerificationFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedAdminResponse<BusinessVerificationItem>> {
  const offset = (page - 1) * limit;

  let query = supabase.from("businesses").select(`
      *,
      user:users!businesses_user_id_fkey (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `) as QueryBuilder;

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    );
  }

  // Apply verification status filter
  if (filters.verificationStatus) {
    query = query.eq(
      "verification_status",
      filters.verificationStatus as Database["public"]["Tables"]["businesses"]["Row"]["verification_status"],
    );
  }

  // Apply business type filter
  if (filters.businessType) {
    query = query.eq("business_type", filters.businessType);
  }

  // Apply area filter
  if (filters.area) {
    query = query.eq("area", filters.area);
  }

  // Apply date range filters
  if (filters.submittedAfter) {
    query = query.gte("created_at", filters.submittedAfter);
  }

  if (filters.submittedBefore) {
    query = query.lte("created_at", filters.submittedBefore);
  }

  // Apply sorting
  const sortBy = filters.sortBy || "submitted_at";
  const sortOrder = filters.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" }) as QueryBuilder;

  // Get total count
  const { count } = await query;

  // Get paginated results
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching businesses for verification:", error);
    throw error;
  }

  // Transform data to include submittedAt and pendingDays
  const items: BusinessVerificationItem[] = (data || []).map(
    (business) => {
      const submittedAt = business.created_at;
      const pendingDays = Math.floor(
        (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        ...business,
        submittedAt,
        pendingDays,
      };
    },
  );

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function approveBusiness(
  businessId: string,
  adminId: string,
): Promise<void> {
  const { error } = await supabase
    .from("businesses")
    .update({
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    console.error("Error approving business:", error);
    throw error;
  }

  // Log audit action
  await logAuditAction({
    admin_id: adminId,
    action: "approve_business",
    entity_type: "business",
    entity_id: businessId,
    details: { status: "verified" },
  });
}

export async function rejectBusiness(
  businessId: string,
  reason: string,
  adminId: string,
): Promise<void> {
  const { error } = await supabase
    .from("businesses")
    .update({
      verification_status: "rejected",
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    console.error("Error rejecting business:", error);
    throw error;
  }

  // Log audit action
  await logAuditAction({
    admin_id: adminId,
    action: "reject_business",
    entity_type: "business",
    entity_id: businessId,
    details: { reason },
  });
}

// ============================================================================
// KYC VERIFICATION
// ============================================================================

export async function getKYCVerifications(
  filters: KYCVerificationFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedAdminResponse<KYCVerificationItem>> {
  const offset = (page - 1) * limit;

  let query = supabase.from("kyc_verifications").select(`
      *,
      worker:workers!kyc_verifications_worker_id_fkey (
        *,
        user:users!workers_user_id_fkey (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      )
    `) as QueryBuilder;

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `worker.user.full_name.ilike.%${filters.search}%,worker.user.email.ilike.%${filters.search}%`,
    );
  }

  // Apply status filter
  if (filters.status) {
    query = query.eq(
      "status",
      filters.status as Database["public"]["Tables"]["kyc_verifications"]["Row"]["status"],
    );
  }

  // Apply area filter
  if (filters.area) {
    query = query.eq("worker.area", filters.area);
  }

  // Apply date range filters
  if (filters.submittedAfter) {
    query = query.gte("submitted_at", filters.submittedAfter);
  }

  if (filters.submittedBefore) {
    query = query.lte("submitted_at", filters.submittedBefore);
  }

  // Apply sorting
  const sortBy = filters.sortBy || "submitted_at";
  const sortOrder = filters.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" }) as QueryBuilder;

  // Get total count
  const { count } = await query;

  // Get paginated results
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching KYC verifications:", error);
    throw error;
  }

  // Transform data
  const items: KYCVerificationItem[] = (data || []).map((kyc) => {
    const worker = kyc.worker || {};
    const user = worker.user || {};
    const submittedAt = kyc.submitted_at;
    const pendingDays = Math.floor(
      (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      ...kyc,
      worker,
      user,
      submittedAt,
      pendingDays,
    };
  });

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function approveKYC(
  kycId: string,
  adminId: string,
): Promise<void> {
  const { data: kyc } = await supabase
    .from("kyc_verifications")
    .select("worker_id")
    .eq("id", kycId)
    .single();

  if (!kyc) {
    throw new Error("KYC verification not found");
  }

  // Update KYC status
  const { error: kycError } = await supabase
    .from("kyc_verifications")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", kycId);

  if (kycError) {
    console.error("Error approving KYC:", kycError);
    throw kycError;
  }

  // Update worker status
  const { error: workerError } = await supabase
    .from("workers")
    .update({
      kyc_status: "verified",
      updated_at: new Date().toISOString(),
    })
    .eq("id", kyc.worker_id);

  if (workerError) {
    console.error("Error updating worker KYC status:", workerError);
    throw workerError;
  }

  // Log audit action
  await logAuditAction({
    admin_id: adminId,
    action: "approve_kyc",
    entity_type: "worker",
    entity_id: kyc.worker_id,
    details: { kycId },
  });
}

export async function rejectKYC(
  kycId: string,
  rejectionReason: string,
  adminId: string,
): Promise<void> {
  const { data: kyc } = await supabase
    .from("kyc_verifications")
    .select("worker_id")
    .eq("id", kycId)
    .single();

  if (!kyc) {
    throw new Error("KYC verification not found");
  }

  // Update KYC status
  const { error: kycError } = await supabase
    .from("kyc_verifications")
    .update({
      status: "rejected",
      rejection_reason: rejectionReason,
      rejected_at: new Date().toISOString(),
      rejected_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", kycId);

  if (kycError) {
    console.error("Error rejecting KYC:", kycError);
    throw kycError;
  }

  // Update worker status
  const { error: workerError } = await supabase
    .from("workers")
    .update({
      kyc_status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", kyc.worker_id);

  if (workerError) {
    console.error("Error updating worker KYC status:", workerError);
    throw workerError;
  }

  // Log audit action
  await logAuditAction({
    admin_id: adminId,
    action: "reject_kyc",
    entity_type: "worker",
    entity_id: kyc.worker_id,
    details: { kycId, reason: rejectionReason },
  });
}

// ============================================================================
// JOB MODERATION
// ============================================================================

export async function getJobsForModeration(
  filters: JobModerationFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedAdminResponse<JobModerationItem>> {
  const offset = (page - 1) * limit;

  let query = supabase.from("jobs").select(`
      *,
      business:businesses!jobs_business_id_fkey (
        *,
        user:users!businesses_user_id_fkey (
          id,
          full_name,
          email
        )
      ),
      user:users!jobs_user_id_fkey (
        id,
        full_name,
        email
      ),
      category:categories(id, name, slug)
    `) as QueryBuilder;

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    );
  }

  // Apply status filter
  if (filters.status) {
    query = query.eq(
      "status",
      filters.status as Database["public"]["Tables"]["jobs"]["Row"]["status"],
    );
  }

  // Apply category filter
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  // Apply area filter
  if (filters.area) {
    query = query.eq("area", filters.area);
  }

  // Apply reported only filter
  if (filters.reportedOnly) {
    query = query.not("report_count", "is", null);
    query = query.gt("report_count", 0);
  }

  // Apply date range filters
  if (filters.createdAfter) {
    query = query.gte("created_at", filters.createdAfter);
  }

  if (filters.createdBefore) {
    query = query.lte("created_at", filters.createdBefore);
  }

  // Apply sorting
  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" }) as QueryBuilder;

  // Get total count
  const { count } = await query;

  // Get paginated results
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching jobs for moderation:", error);
    throw error;
  }

  const items: JobModerationItem[] = (data || []).map((job) => ({
    ...job,
    business: job.business,
    user: job.user,
    category: job.category,
    bookingCount: job.booking_count || 0,
    reportCount: job.report_count || 0,
  }));

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function moderateJob(
  jobId: string,
  action: "delete" | "suspend" | "restore",
  reason?: string,
  adminId?: string,
): Promise<void> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (action === "delete") {
      // @ts-expect-error - legacy status not in type
      // @ts-expect-error - legacy field not in type
      // @ts-expect-error - legacy field not in type
      // @ts-expect-error - legacy field not in type
      // @ts-expect-error - legacy field not in type
      // @ts-expect-error - legacy field not in type
      // @ts-expect-error - legacy field not in type
      // @ts-expect-error - legacy field not in type
      // @ts-expect-error - legacy field not in type
  } else if (action === "restore") {
    updateData.status = "open";
    updateData.suspended_at = null;
    updateData.suspended_by = null;
    updateData.suspension_reason = null;
    updateData.deleted_at = null;
    updateData.deleted_by = null;
    updateData.deletion_reason = null;
  }

  const { error } = await supabase
    .from("jobs")
    .update(updateData)
    .eq("id", jobId);

  if (error) {
    console.error(`Error ${action}ing job:`, error);
    throw error;
  }

  // Log audit action if adminId is provided
  if (adminId) {
    await logAuditAction({
      admin_id: adminId,
      action: action === "delete" ? "delete_job" : "suspend_user",
      entity_type: "job",
      entity_id: jobId,
      details: { action, reason },
    });
  }
}

// ============================================================================
// DISPUTES
// ============================================================================

export async function getDisputes(
  filters: DisputeFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedAdminResponse<DisputeItem>> {
  const offset = (page - 1) * limit;

  let query = supabase.from("disputes").select(`
      *,
      booking:bookings!disputes_booking_id_fkey (
        *,
        job:jobs!bookings_job_id_fkey (
          id,
          title
        )
      ),
      reporter:users!disputes_reporter_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      ),
      reported:users!disputes_reported_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `) as QueryBuilder;

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,reporter.full_name.ilike.%${filters.search}%,reported.full_name.ilike.%${filters.search}%`,
    );
  }

  // Apply status filter
  if (filters.status) {
    query = query.eq(
      "status",
      filters.status as Database["public"]["Tables"]["disputes"]["Row"]["status"],
    );
  }

  // Apply type filter
  if (filters.type) {
    query = query.eq("dispute_type", filters.type);
  }

  // Apply priority filter
  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  // Apply date range filters
  if (filters.createdAfter) {
    query = query.gte("created_at", filters.createdAfter);
  }

  if (filters.createdBefore) {
    query = query.lte("created_at", filters.createdBefore);
  }

  // Apply sorting
  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" }) as QueryBuilder;

  // Get total count
  const { count } = await query;

  // Get paginated results
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching disputes:", error);
    throw error;
  }

  const items: DisputeItem[] = (data || []).map((dispute) => ({
    id: dispute.id,
    booking_id: dispute.booking_id,
    booking: dispute.booking,
    reporter: dispute.reporter,
    reported: dispute.reported,
    type: dispute.dispute_type,
    description: dispute.description,
    status: dispute.status,
    priority: dispute.priority,
    resolution: dispute.resolution,
    resolution_notes: dispute.resolution_notes,
    admin_notes: dispute.admin_notes,
    created_at: dispute.created_at,
    updated_at: dispute.updated_at,
    resolved_at: dispute.resolved_at,
    resolved_by: dispute.resolved_by,
  }));

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function resolveDispute(
  disputeId: string,
  resolution:
    | "refund_full"
    | "refund_partial"
    | "no_refund"
    | "worker_favor"
    | "business_favor"
    | "custom",
  resolutionNotes?: string,
  refundAmount?: number,
  adminId?: string,
): Promise<void> {
  const { error } = await supabase
    .from("disputes")
    .update({
      status: "resolved",
      resolution,
      resolution_notes: resolutionNotes,
      refund_amount: refundAmount,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) {
    console.error("Error resolving dispute:", error);
    throw error;
  }

  // Log audit action if adminId is provided
  if (adminId) {
    await logAuditAction({
      admin_id: adminId,
      action: "resolve_dispute",
      entity_type: "booking",
      entity_id: disputeId,
      details: { resolution, notes: resolutionNotes, refundAmount },
    });
  }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditActionInput {
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
}

async function logAuditAction(input: AuditActionInput): Promise<void> {
  const { error } = await (supabase as any).from("admin_audit_logs").insert({
    admin_id: input.admin_id,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    details: input.details,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error logging audit action:", error);
  }
}

// ============================================================================
// WORKER MANAGEMENT
// ============================================================================

export async function getWorkersForManagement(
  filters: WorkerManagementFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedAdminResponse<WorkerManagementItem>> {
  const offset = (page - 1) * limit;

  let query = supabase.from("workers").select(`
      *,
      user:users!workers_user_id_fkey (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `) as QueryBuilder;

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `user.full_name.ilike.%${filters.search}%,user.email.ilike.%${filters.search}%`,
    );
  }

  // Apply KYC status filter
  if (filters.kycStatus) {
    query = query.eq(
      "kyc_status",
      filters.kycStatus as Database["public"]["Tables"]["workers"]["Row"]["kyc_status"],
    );
  }

  // Apply area filter
  if (filters.area) {
    query = query.eq("area", filters.area);
  }

  // Apply date range filters
  if (filters.createdAfter) {
    query = query.gte("created_at", filters.createdAfter);
  }

  if (filters.createdBefore) {
    query = query.lte("created_at", filters.createdBefore);
  }

  // Apply sorting
  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" }) as QueryBuilder;

  // Get total count
  const { count } = await query;

  // Get paginated results
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching workers:", error);
    throw error;
  }

  const items: WorkerManagementItem[] = (data || []).map((worker) => ({
    worker,
    user: worker.user,
  })) as WorkerManagementItem[];

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function getUsers(
  filters: UserManagementFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedAdminResponse<UserManagementItem>> {
  const offset = (page - 1) * limit;

  let query = supabase.from("users").select(`
      *,
      business:businesses!users_id_fkey (*),
      worker:workers!users_id_fkey (*)
    `) as QueryBuilder;

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
    );
  }

  // Apply role filter
  if (filters.role) {
    if (filters.role === "business") {
      query = query.not("business", "is", null);
    } else if (filters.role === "worker") {
      query = query.not("worker", "is", null);
    } else if (filters.role === "admin") {
      const adminUserIds = await supabase.from("admin_users").select("user_id");
      if (adminUserIds.data) {
        const adminRows = adminUserIds.data as { user_id: string }[];
        query = query.in("id", adminRows.map((u) => u.user_id));
      }
    }
  }

  // Apply status filter
  if (filters.status) {
    if (filters.status === "suspended" || filters.status === "banned") {
      // Would need a ban/suspension table - for now just return active users
      query = query.eq("is_active", true);
    }
  }

  // Apply area filter
  if (filters.area) {
    query = query.or(
      `worker.area.ilike.%${filters.area}%,business.area.ilike.%${filters.area}%`,
    );
  }

  // Apply date range filters
  if (filters.createdAfter) {
    query = query.gte("created_at", filters.createdAfter);
  }

  if (filters.createdBefore) {
    query = query.lte("created_at", filters.createdBefore);
  }

  // Apply sorting
  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" }) as QueryBuilder;

  // Get total count
  const { count } = await query;

  // Get paginated results
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }

  const items: UserManagementItem[] = (data || []).map((user) => ({
    user,
    business: user.business,
    worker: user.worker,
  })) as UserManagementItem[];

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

// ============================================================================
// PROCESS VERIFICATION FUNCTIONS (convenience wrappers)
// ============================================================================

export async function processBusinessVerification(
  businessId: string,
  action: "approve" | "reject",
  reason?: string,
  adminId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (action === "approve") {
      if (adminId) {
        await approveBusiness(businessId, adminId);
      } else {
        // For demo purposes without admin auth
        await supabase
          .from("businesses")
          .update({
            verification_status: "verified",
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", businessId);
      }
    } else if (action === "reject") {
      if (adminId) {
        await rejectBusiness(businessId, reason || "", adminId);
      } else {
        // For demo purposes
        await supabase
          .from("businesses")
          .update({
            verification_status: "rejected",
            rejection_reason: reason || "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", businessId);
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error processing business verification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function processKYCVerification(
  kycId: string,
  action: "approve" | "reject",
  rejectionReason?: string,
  adminId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (action === "approve") {
      if (adminId) {
        await approveKYC(kycId, adminId);
      } else {
        // For demo purposes without admin auth
        const { data: kyc } = await supabase
          .from("kyc_verifications")
          .select("worker_id")
          .eq("id", kycId)
          .single();

        if (kyc) {
          await supabase
            .from("kyc_verifications")
            .update({
              status: "verified",
              verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", kycId);

          await supabase
            .from("workers")
            .update({
              kyc_status: "verified",
              updated_at: new Date().toISOString(),
            })
            .eq("id", kyc.worker_id);
        }
      }
    } else if (action === "reject") {
      if (adminId) {
        await rejectKYC(kycId, rejectionReason || "", adminId);
      } else {
        // For demo purposes
        const { data: kyc } = await supabase
          .from("kyc_verifications")
          .select("worker_id")
          .eq("id", kycId)
          .single();

        if (kyc) {
          await supabase
            .from("kyc_verifications")
            .update({
              status: "rejected",
              rejection_reason: rejectionReason || "",
              rejected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", kycId);

          await supabase
            .from("workers")
            .update({
              kyc_status: "rejected",
              updated_at: new Date().toISOString(),
            })
            .eq("id", kyc.worker_id);
        }
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error processing KYC verification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// ADMIN DASHBOARD COUNTS
// ============================================================================

export interface AdminPendingCounts {
  pendingBusinessVerifications: number;
  pendingKYCVerifications: number;
  pendingJobsForModeration: number;
  openDisputes: number;
  activeComplianceWarnings: number;
}

export async function getAdminPendingCounts(): Promise<AdminPendingCounts> {
  const [
    { count: pendingBusinessVerifications },
    { count: pendingKYCVerifications },
    { count: pendingJobsForModeration },
    { count: openDisputes },
    { count: activeComplianceWarnings },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("kyc_verifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "draft"] as any),
    supabase
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "resolved"] as any),
    supabase
      .from("compliance_warnings")
      .select("*", { count: "exact", head: true })
      .eq("acknowledged", false)
      .in("warning_level", ["warning", "blocked"] as any),
  ]);

  return {
    pendingBusinessVerifications: pendingBusinessVerifications || 0,
    pendingKYCVerifications: pendingKYCVerifications || 0,
    pendingJobsForModeration: pendingJobsForModeration || 0,
    openDisputes: openDisputes || 0,
    activeComplianceWarnings: activeComplianceWarnings || 0,
  };
}

// ============================================================================
// PLATFORM METRICS
// ============================================================================

export async function getPlatformMetrics(): Promise<{
  users: {
    total: number;
    workers: number;
    businesses: number;
  };
  jobs: {
    total: number;
    active: number;
  };
  bookings: {
    total: number;
    pending: number;
    completed: number;
  };
  verifications: {
    pendingKYC: number;
  };
  disputes: {
    open: number;
  };
}> {
  const [
    { count: totalUsers },
    { count: totalWorkers },
    { count: totalBusinesses },
    { count: totalJobs },
    { count: activeJobs },
    { count: totalBookings },
    { count: pendingBookings },
    { count: completedBookings },
    { count: pendingKYC },
    { count: openDisputes },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("workers").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("kyc_verifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .in("status", [
        "open",
        "resolved",
      ] as Database["public"]["Tables"]["disputes"]["Row"]["status"][]),
  ]);

  return {
    users: {
      total: totalUsers || 0,
      workers: totalWorkers || 0,
      businesses: totalBusinesses || 0,
    },
    jobs: {
      total: totalJobs || 0,
      active: activeJobs || 0,
    },
    bookings: {
      total: totalBookings || 0,
      pending: pendingBookings || 0,
      completed: completedBookings || 0,
    },
    verifications: {
      pendingKYC: pendingKYC || 0,
    },
    disputes: {
      open: openDisputes || 0,
    },
  };
}
