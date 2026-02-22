import { Database } from '../supabase/types'

type JobRow = Database['public']['Tables']['jobs']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type SkillRow = Database['public']['Tables']['skills']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export type JobSortOption = 'newest' | 'oldest' | 'highest_wage' | 'lowest_wage' | 'nearest'

export type PositionType = 'full_time' | 'part_time' | 'contract' | 'temporary'

export interface JobFilters {
  search?: string
  categoryId?: string
  positionType?: PositionType
  area?: string
  lat?: number
  lng?: number
  radius?: number
  wageMin?: number
  wageMax?: number
  deadlineAfter?: string
  deadlineBefore?: string
  skills?: string[]
}

export interface Job {
  id: string
  business_id: string
  category_id: string
  title: string
  description: string
  requirements: string
  budget_min: number
  budget_max: number
  status: JobStatus
  deadline: string
  address: string
  lat: number
  lng: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Skill {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Business {
  id: string
  user_id: string
  name: string
  description: string
  phone: string
  email: string
  website: string
  is_verified: boolean
  address: string
  lat: number
  lng: number
  created_at: string
  updated_at: string
}

export interface JobWithRelations extends Job {
  category: Category
  business: Business
  skills: Skill[]
  distance?: number
}

export interface CreateJobInput {
  category_id: string
  title: string
  description: string
  requirements: string
  budget_min: number
  budget_max: number
  deadline: string
  address: string
  lat: number
  lng: number
  skill_ids?: string[]
}

export interface UpdateJobInput {
  title?: string
  description?: string
  requirements?: string
  budget_min?: number
  budget_max?: number
  deadline?: string
  address?: string
  lat?: number
  lng?: number
  status?: JobStatus
}

export interface JobListParams {
  filters?: JobFilters
  sort?: JobSortOption
  page?: number
  limit?: number
}

export interface JobListResponse {
  jobs: JobWithRelations[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface JobApplicationInput {
  job_id: string
  worker_id: string
  message?: string
}

export interface JobApplication {
  id: string
  job_id: string
  worker_id: string
  business_id: string
  status: 'pending' | 'accepted' | 'rejected'
  message: string
  created_at: string
  updated_at: string
}
