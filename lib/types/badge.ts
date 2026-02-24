import { Database } from '../supabase/types'

type BadgeRow = Database['public']['Tables']['badges']['Row']
type WorkerBadgeRow = Database['public']['Tables']['worker_badges']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']
type WorkerRow = Database['public']['Tables']['workers']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

export type BadgeCategory = 'skill' | 'training' | 'certification' | 'specialization'

export type BadgeVerificationStatus = 'pending' | 'verified' | 'rejected'

export type BadgeSortOption = 'name' | 'newest' | 'oldest' | 'category'

export interface BadgeFilters {
  search?: string
  category?: BadgeCategory
  is_certified?: boolean
  provider_id?: string
}

export interface Badge {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  category: BadgeCategory
  is_certified: boolean
  provider_id: string | null
  created_at: string
}

export interface WorkerBadge {
  worker_id: string
  badge_id: string
  verification_status: BadgeVerificationStatus
  verified_by: string | null
  verified_at: string | null
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

export interface Worker {
  id: string
  user_id: string
  full_name: string
  bio: string
  phone: string
  address: string
  location_name: string
  lat: number
  lng: number
  avatar_url: string
  dob: string
  created_at: string
  updated_at: string
}

export interface BadgeWithProvider extends Badge {
  provider: Business | null
}

export interface WorkerBadgeWithRelations extends WorkerBadge {
  badge: BadgeWithProvider
  worker: Worker
  verified_by_business?: Business | null
}

export interface CreateBadgeInput {
  name: string
  slug: string
  description?: string
  icon?: string
  category: BadgeCategory
  is_certified?: boolean
  provider_id?: string
}

export interface UpdateBadgeInput {
  name?: string
  slug?: string
  description?: string
  icon?: string
  category?: BadgeCategory
  is_certified?: boolean
  provider_id?: string
}

export interface CreateWorkerBadgeInput {
  worker_id: string
  badge_id: string
  verification_status?: BadgeVerificationStatus
}

export interface UpdateWorkerBadgeInput {
  verification_status?: BadgeVerificationStatus
  verified_by?: string
  verified_at?: string
}

export interface BadgeListParams {
  filters?: BadgeFilters
  sort?: BadgeSortOption
  page?: number
  limit?: number
}

export interface BadgeListResponse {
  badges: BadgeWithProvider[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface WorkerBadgeListParams {
  worker_id?: string
  badge_id?: string
  verification_status?: BadgeVerificationStatus
  page?: number
  limit?: number
}

export interface WorkerBadgeListResponse {
  worker_badges: WorkerBadgeWithRelations[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BadgeVerificationInput {
  worker_id: string
  badge_id: string
  verification_status: BadgeVerificationStatus
}
