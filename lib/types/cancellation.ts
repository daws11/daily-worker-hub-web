import { Database } from '../supabase/types'

type CancellationReasonRow = Database['public']['Tables']['cancellation_reasons']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type JobRow = Database['public']['Tables']['jobs']['Row']
type WorkerRow = Database['public']['Tables']['workers']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']

export type CancellationReasonCategory = Database['public']['Enums']['cancellation_reason_category']

export type CancellationInitiator = 'worker' | 'business'

export interface CancellationReason {
  id: string
  category: CancellationReasonCategory
  name: string
  description: string
  requires_verification: boolean
  penalty_percentage: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CancellationRecord {
  id: string
  job_id: string
  worker_id: string
  business_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  cancellation_reason_id: string | null
  cancellation_note: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface CancellationWithRelations extends CancellationRecord {
  job: {
    id: string
    title: string
    address: string
  }
  worker?: {
    id: string
    full_name: string
    avatar_url: string
    phone: string
  }
  business?: {
    id: string
    name: string
    avatar_url: string
  }
  cancellation_reason: CancellationReason | null
}

export interface CancelBookingData {
  booking_id: string
  cancellation_reason_id: string
  cancellation_note?: string
}

export interface WorkerCancelBookingData extends CancelBookingData {
  worker_id: string
}

export interface BusinessCancelBookingData extends CancelBookingData {
  business_id: string
}

export interface CancellationStats {
  total_cancellations: number
  emergency_cancellations: number // 0% penalty (illness, family_emergency, personal_emergency, weather)
  partial_penalty_cancellations: number // 10-25% penalty (transportation, schedule_conflict, other)
  cancellation_rate: number
  average_penalty_score: number
  recent_cancellations: number // cancellations in last 30 days
}

export interface WorkerCancellationHistory {
  worker_id: string
  records: CancellationWithRelations[]
  stats: CancellationStats
}

export interface BusinessCancellationHistory {
  business_id: string
  records: CancellationWithRelations[]
  stats: CancellationStats
}

export interface CancellationListParams {
  worker_id?: string
  business_id?: string
  job_id?: string
  category?: CancellationReasonCategory
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export interface CancellationListResponse {
  records: CancellationWithRelations[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CancellationRequestData {
  booking_id: string
  reason_id: string
  note?: string
}

export interface CancellationResult {
  success: boolean
  error?: string
  data?: BookingRow
}

export interface CancellationReasonsListResult {
  success: boolean
  error?: string
  data?: CancellationReason[]
}

export interface EmergencyCancellationRequest {
  booking_id: string
  reason: CancellationReason
  note?: string
  penalty_info: {
    percentage: number
    is_emergency: boolean
  }
}

export interface CancellationNotificationData {
  recipient_user_id: string
  title: string
  body: string
  booking_id: string
  job_title: string
  cancellation_reason: string
  cancellation_note?: string
  initiator: CancellationInitiator
  initiator_name: string
}
