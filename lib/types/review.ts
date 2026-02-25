import { Database } from '../supabase/types'

type ReviewRow = Database['public']['Tables']['reviews']['Row']
type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
type ReviewUpdate = Database['public']['Tables']['reviews']['Update']
type WorkerRow = Database['public']['Tables']['workers']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

export type ReviewerType = 'business' | 'worker'

export interface Review {
  id: string
  booking_id: string
  worker_id: string
  business_id: string | null
  reviewer: ReviewerType
  rating: number
  comment: string | null
  would_rehire: boolean | null
  created_at: string
}

export interface ReviewWithRelations extends Review {
  booking: BookingRow
  worker: WorkerRow & { user: UserRow }
  business?: (BusinessRow & { user: UserRow }) | null
}

export interface CreateReviewInput {
  booking_id: string
  worker_id: string
  business_id?: string | null
  reviewer: ReviewerType
  rating: number
  comment?: string | null
  would_rehire?: boolean | null
}

export interface UpdateReviewInput {
  rating?: number
  comment?: string | null
  would_rehire?: boolean | null
}

export interface RatingBreakdown {
  rating: number
  count: number
  percentage: number
}

export interface ReviewSummary {
  averageRating: number
  totalReviews: number
  breakdown: RatingBreakdown[]
  rehireRate?: number
}

export interface ReviewListParams {
  reviewerId?: string
  reviewerType?: 'worker' | 'business'
  page?: number
  limit?: number
}
