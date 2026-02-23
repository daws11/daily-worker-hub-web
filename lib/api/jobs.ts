import { supabase } from '../supabase/client'
import { Database } from '../supabase/types'
import { JobWithRelations, JobListParams, JobFilters, JobSortOption } from '../types/job'

type JobsRow = Database['public']['Tables']['jobs']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type SkillRow = Database['public']['Tables']['skills']['Row']

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function getJobs(params?: JobListParams): Promise<{
  data: JobWithRelations[] | null
  error: Error | null
}> {
  try {
    const { filters, sort = 'newest', page = 1, limit = 20 } = params || {}

    // Check if radius filter is applied (requires client-side filtering)
    const hasRadiusFilter = filters?.radius !== undefined && filters?.lat !== undefined && filters?.lng !== undefined

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

      // Filter by urgent jobs
      if (filters.isUrgent !== undefined) {
        query = query.eq('is_urgent', filters.isUrgent)
      }

      // Filter by verified businesses only
      if (filters.verifiedOnly !== undefined) {
        query = query.eq('business.is_verified', true)
      }
    }

    // Apply sorting (for nearest sort with user location, we'll do client-side sorting)
    if (sort === 'nearest' && !hasRadiusFilter) {
      // Just default sort if no location provided
      query = query.order('created_at', { ascending: false })
    } else if (sort !== 'nearest') {
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
        default:
          query = query.order('created_at', { ascending: false })
      }
    }

    // When radius filter is active, fetch all matching records first
    // Then apply radius filter and pagination client-side
    const { data, error } = await (hasRadiusFilter ? query : query.range((page - 1) * limit, (page - 1) * limit + limit - 1))

    if (error) {
      return { data: null, error }
    }

    // Transform data to match JobWithRelations type
    let jobsWithRelations: JobWithRelations[] = (data || []).map((job: any) => {
      const jobWithRelations: JobWithRelations = {
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
        is_urgent: job.is_urgent || false,
        created_at: job.created_at,
        updated_at: job.updated_at,
        category: job.category,
        business: job.business,
        skills: [], // Skills would need to be fetched separately via jobs_skills junction table
      }

      // Calculate distance if user location is provided
      if (filters?.lat !== undefined && filters?.lng !== undefined && job.lat !== null && job.lng !== null) {
        jobWithRelations.distance = calculateDistance(filters.lat, filters.lng, job.lat, job.lng)
      }

      return jobWithRelations
    })

    // Apply radius filter client-side
    if (hasRadiusFilter && filters.radius !== undefined) {
      jobsWithRelations = jobsWithRelations.filter((job) => {
        return job.distance !== undefined && job.distance <= filters.radius!
      })
    }

    // Apply nearest sorting client-side if needed
    if (sort === 'nearest' && filters?.lat !== undefined && filters?.lng !== undefined) {
      jobsWithRelations.sort((a, b) => {
        const aDist = a.distance ?? Number.MAX_VALUE
        const bDist = b.distance ?? Number.MAX_VALUE
        return aDist - bDist
      })
    }

    // Apply pagination client-side if radius filter was used
    if (hasRadiusFilter) {
      const from = (page - 1) * limit
      const to = from + limit
      jobsWithRelations = jobsWithRelations.slice(from, to)
    }

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
      is_urgent: data.is_urgent || false,
      created_at: data.created_at,
      updated_at: data.updated_at,
      category: data.category,
      business: data.business,
      skills: [], // Skills would need to be fetched separately via jobs_skills junction table
    }

    return { data: jobWithRelations, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
