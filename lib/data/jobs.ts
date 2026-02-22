import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"

type Job = Database["public"]["Tables"]["jobs"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

export type JobWithDetails = Job & {
  businesses: {
    id: string
    name: string
    phone: string
    email: string
    address: string
    is_verified: boolean
  }
  categories: {
    id: string
    name: string
    slug: string
  }
  jobs_skills?: Array<{
    skills: {
      id: string
      name: string
      slug: string
    }
  }>
}

export type JobsResult = {
  success: boolean
  error?: string
  data?: JobWithDetails[]
}

export type JobResult = {
  success: boolean
  error?: string
  data?: JobWithDetails
}

export type ApplicationWithDetails = Booking & {
  jobs: {
    id: string
    title: string
    description: string
    budget_min: number
    budget_max: number
    deadline: string
    address: string
  }
  businesses: {
    id: string
    name: string
    phone: string
    email: string
  }
}

export type ApplicationsResult = {
  success: boolean
  error?: string
  data?: ApplicationWithDetails[]
}

export type ApplicantWithDetails = Booking & {
  workers: {
    id: string
    full_name: string
    phone: string
    bio: string
    avatar_url: string
    reliability_score: number | null
  }
}

export type ApplicantsResult = {
  success: boolean
  error?: string
  data?: ApplicantWithDetails[]
}

/**
 * Get all jobs with optional status filter
 */
export async function getJobs(filters?: {
  status?: Job["status"]
  category_id?: string
  business_id?: string
  limit?: number
}): Promise<JobsResult> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("jobs")
      .select(`
        *,
        businesses (
          id,
          name,
          phone,
          email,
          address,
          is_verified
        ),
        categories (
          id,
          name,
          slug
        ),
        jobs_skills (
          skills (
            id,
            name,
            slug
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    if (filters?.category_id) {
      query = query.eq("category_id", filters.category_id)
    }

    if (filters?.business_id) {
      query = query.eq("business_id", filters.business_id)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as JobWithDetails[] }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data pekerjaan" }
  }
}

/**
 * Get a single job by ID with full details
 */
export async function getJobById(jobId: string): Promise<JobResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        *,
        businesses (
          id,
          name,
          phone,
          email,
          address,
          is_verified
        ),
        categories (
          id,
          name,
          slug
        ),
        jobs_skills (
          skills (
            id,
            name,
            slug
          )
        )
      `)
      .eq("id", jobId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as JobWithDetails }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data pekerjaan" }
  }
}

/**
 * Get all applications for a specific worker
 */
export async function getApplications(workerId: string): Promise<ApplicationsResult> {
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
      return { success: false, error: error.message }
    }

    return { success: true, data: data as ApplicationWithDetails[] }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data lamaran" }
  }
}

/**
 * Get all applications for a specific job (business view)
 */
export async function getApplicants(jobId: string, businessId: string): Promise<ApplicantsResult> {
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
          avatar_url,
          reliability_score
        )
      `)
      .eq("job_id", jobId)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as ApplicantWithDetails[] }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data pelamar" }
  }
}

/**
 * Get jobs posted by a specific business
 */
export async function getJobsByBusiness(businessId: string, filters?: {
  status?: Job["status"]
}): Promise<JobsResult> {
  return getJobs({ ...filters, business_id: businessId })
}

/**
 * Check if a worker should show 'New' badge (fewer than 5 completed jobs)
 */
export async function shouldShowNewBadge(workerId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("worker_id", workerId)
      .eq("status", "completed")

    if (error) {
      return false
    }

    return (count || 0) < 5
  } catch (error) {
    return false
  }
}
