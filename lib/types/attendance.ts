import { Database } from '../supabase/types'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type JobRow = Database['public']['Tables']['jobs']['Row']
type WorkerRow = Database['public']['Tables']['workers']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']

export type AttendanceStatus = 'not_checked_in' | 'checked_in' | 'checked_out'

export type LocationVerificationStatus = 'verified' | 'unverified' | 'out_of_range'

export interface LocationCoordinates {
  lat: number
  lng: number
}

export interface AttendanceRecord {
  id: string
  job_id: string
  worker_id: string
  business_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
  start_date: string
  end_date: string
  check_in_at: string | null
  check_out_at: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  check_out_lat: number | null
  check_out_lng: number | null
  created_at: string
  updated_at: string
}

export interface AttendanceWithRelations extends AttendanceRecord {
  job: {
    id: string
    title: string
    address: string
    lat: number
    lng: number
  }
  worker: {
    id: string
    full_name: string
    avatar_url: string
  }
  check_in_location_verified: LocationVerificationStatus
  check_out_location_verified: LocationVerificationStatus
}

export interface CheckInData {
  booking_id: string
  lat?: number
  lng?: number
}

export interface CheckOutData {
  booking_id: string
  lat?: number
  lng?: number
}

export interface QRCodeData {
  job_id: string
  qr_code: string
  generated_at: string
  expires_at?: string
}

export interface AttendanceStats {
  total_bookings: number
  checked_in_bookings: number
  checked_out_bookings: number
  attendance_rate: number
  on_time_arrivals: number
  average_check_in_time?: string
}

export interface WorkerAttendanceHistory {
  worker_id: string
  records: AttendanceWithRelations[]
  stats: AttendanceStats
}

export interface JobAttendanceHistory {
  job_id: string
  job_title: string
  records: AttendanceWithRelations[]
  stats: AttendanceStats
}

export interface AttendanceListParams {
  worker_id?: string
  job_id?: string
  business_id?: string
  start_date?: string
  end_date?: string
  status?: AttendanceStatus
  page?: number
  limit?: number
}

export interface AttendanceListResponse {
  records: AttendanceWithRelations[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LocationVerificationResult {
  is_verified: boolean
  distance: number
  status: LocationVerificationStatus
}

export interface QRCodeValidationResult {
  is_valid: boolean
  job_id?: string
  is_expired?: boolean
  error?: string
}
