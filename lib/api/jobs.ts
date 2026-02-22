import { supabase } from '../supabase/client'
import { Database } from '../supabase/types'
import { JobWithRelations, JobListParams, JobFilters, JobSortOption } from '../types/job'

type JobsRow = Database['public']['Tables']['jobs']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type SkillRow = Database['public']['Tables']['skills']['Row']

export async function getJobs(params?: JobListParams): Promise<{
  data: JobWithRelations[] | null
  error: Error | null
}> {
  try {
    const { filters, sort = 'newest', page = 1, limit = 20 } = params || {}

    let query = supabase
      .from('jobs')
      .select(`
        *,
        business:businesses!inner(
          id,
          user_id,
          name,
          description,
          phone,
          email,
          website,
          is_verified,
          address,
          lat,
          lng,
          created_at,
          updated_at
        ),
        category:categories!inner(
          id,
          name,
          slug,
          created_at
        )
      `)

    // Apply filters
    if (filters) {
      // Filter by status (only show open jobs by default)
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      if (filters.area) {
        query = query.ilike('address', `%${filters.area}%`)
      }

      if (filters.wageMin !== undefined) {
        query = query.gte('budget_min', filters.wageMin)
      }

      if (filters.wageMax !== undefined) {
        query = query.lte('budget_max', filters.wageMax)
      }

      if (filters.deadlineAfter) {
        query = query.gte('deadline', filters.deadlineAfter)
      }

      if (filters.deadlineBefore) {
        query = query.lte('deadline', filters.deadlineBefore)
      }
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'highest_wage':
        query = query.order('budget_max', { ascending: false })
        break
      case 'lowest_wage':
        query = query.order('budget_min', { ascending: true })
        break
      case 'nearest':
        // Note: Distance sorting requires client-side calculation with user location
        query = query.order('created_at', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      return { data: null, error }
    }

    // Transform data to match JobWithRelations type
    const jobsWithRelations: JobWithRelations[] = (data || []).map((job: any) => ({
      id: job.id,
      business_id: job.business_id,
      category_id: job.category_id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      budget_min: job.budget_min,
      budget_max: job.budget_max,
      status: job.status,
      deadline: job.deadline,
      address: job.address,
      lat: job.lat,
      lng: job.lng,
      created_at: job.created_at,
      updated_at: job.updated_at,
      category: job.category,
      business: job.business,
      skills: job.skills || [],
    }))

    return { data: jobsWithRelations, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function getJobById(id: string): Promise<{
  data: JobWithRelations | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        business:businesses!inner(
          id,
          user_id,
          name,
          description,
          phone,
          email,
          website,
          is_verified,
          address,
          lat,
          lng,
          created_at,
          updated_at
        ),
        category:categories!inner(
          id,
          name,
          slug,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error }
    }

    if (!data) {
      return { data: null, error: new Error('Job not found') }
    }

    const jobWithRelations: JobWithRelations = {
      id: data.id,
      business_id: data.business_id,
      category_id: data.category_id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      budget_min: data.budget_min,
      budget_max: data.budget_max,
      status: data.status,
      deadline: data.deadline,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      created_at: data.created_at,
      updated_at: data.updated_at,
      category: data.category,
      business: data.business,
      skills: data.skills || [],
    }

    return { data: jobWithRelations, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
