import { supabase } from '../client'
import type { Database } from '../types'

type JobsRow = Database['public']['Tables']['jobs']['Row']
type JobsInsert = Database['public']['Tables']['jobs']['Insert']
type JobsUpdate = Database['public']['Tables']['jobs']['Update']
type JobStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'

type JobWithRelations = JobsRow & {
  category?: {
    name: string
    slug: string
  }
  business?: {
    id: string
    name: string
  }
}

/**
 * Create a new job posting
 */
export async function createJob(
  jobData: Omit<JobsInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<JobsRow> {
  const { data, error } = await supabase
    .from('jobs')
    .insert(jobData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`)
  }

  return data
}

/**
 * Update an existing job
 */
export async function updateJob(
  jobId: string,
  updates: JobsUpdate
): Promise<JobsRow> {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update job: ${error.message}`)
  }

  return data
}

/**
 * Get a single job by ID
 */
export async function getJobById(jobId: string): Promise<JobWithRelations | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      category:categories(name, slug),
      business:businesses(id, name)
    `)
    .eq('id', jobId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch job: ${error.message}`)
  }

  return data
}

/**
 * Get all jobs for a specific business
 */
export async function getBusinessJobs(
  businessId: string,
  status?: JobStatus
): Promise<JobsRow[]> {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch business jobs: ${error.message}`)
  }

  return data || []
}

/**
 * Save a job as draft (creates new or updates existing)
 */
export async function saveDraft(
  businessId: string,
  jobData: Omit<JobsInsert, 'id' | 'created_at' | 'updated_at'> & {
    id?: string
  }
): Promise<JobsRow> {
  const draftData = {
    ...jobData,
    status: 'draft' as JobStatus,
  }

  if (jobData.id) {
    return updateJob(jobData.id, draftData)
  }

  return createJob({
    ...draftData,
    business_id: businessId,
  })
}

/**
 * Publish a draft job (change status from 'draft' to 'open')
 */
export async function publishJob(jobId: string): Promise<JobsRow> {
  return updateJob(jobId, { status: 'open' })
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to delete job: ${error.message}`)
  }
}

/**
 * Get open jobs (for worker marketplace)
 */
export async function getOpenJobs(limit?: number): Promise<JobWithRelations[]> {
  let query = supabase
    .from('jobs')
    .select(`
      *,
      category:categories(name, slug),
      business:businesses(id, name)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch open jobs: ${error.message}`)
  }

  return data || []
}

/**
 * Search jobs by title, description, or location
 */
export async function searchJobs(
  searchTerm: string,
  limit: number = 20
): Promise<JobWithRelations[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      category:categories(name, slug),
      business:businesses(id, name)
    `)
    .eq('status', 'open')
    .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to search jobs: ${error.message}`)
  }

  return data || []
}
