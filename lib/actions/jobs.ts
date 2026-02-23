"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"

type JobsRow = Database["public"]["Tables"]["jobs"]["Row"]
type JobsInsert = Database["public"]["Tables"]["jobs"]["Insert"]

export type CreateJobResult = {
  success: boolean
  error?: string
  data?: JobsRow
}

export interface CreateJobInput {
  businessId: string
  title: string
  positionType: string
  deadline: string
  address: string
  budgetMin: number
  budgetMax: number
  wageMin: number
  wageMax: number
  workersNeeded: number
  description: string
  requirements: string[]
  area: string
  platformSettings?: Record<string, { enabled: boolean; connectionId: string }>
}

/**
 * Create a new job posting
 * Supports social platform distribution through platform_settings
 *
 * Note: Extra form fields (wageMin, wageMax, workersNeeded, area, positionType)
 * are stored in platform_settings for future use since they're not in the current
 * database schema.
 */
export async function createJob(input: CreateJobInput): Promise<CreateJobResult> {
  try {
    const supabase = await createClient()

    // Get the user's business ID to verify they own it
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, user_id")
      .eq("user_id", input.businessId)
      .single()

    if (businessError || !business) {
      return { success: false, error: "Bisnis tidak ditemukan" }
    }

    // Get the first category ID as default (since category is required but not in form)
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .limit(1)
      .single()

    if (!category) {
      return { success: false, error: "Kategori tidak tersedia" }
    }

    // Prepare platform_settings with all form data
    const platformSettings = {
      ...(input.platformSettings || {}),
      _formData: {
        wageMin: input.wageMin,
        wageMax: input.wageMax,
        workersNeeded: input.workersNeeded,
        area: input.area,
        positionType: input.positionType,
      },
    }

    // Prepare job data - only using fields that exist in database
    const jobData: JobsInsert = {
      business_id: business.id,
      category_id: category.id,
      title: input.title,
      description: input.description,
      requirements: JSON.stringify(input.requirements),
      budget_min: input.budgetMin,
      budget_max: input.budgetMax,
      deadline: input.deadline,
      address: input.address,
      status: "open",
      platform_settings: platformSettings as any,
    }

    // Create the job
    const { data, error } = await supabase
      .from("jobs")
      .insert(jobData as any)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Gagal membuat lowongan: ${error.message}` }
    }

    return { success: true, data: data as JobsRow }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat lowongan" }
  }
}
