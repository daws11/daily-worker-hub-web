import { Database } from '../supabase/types'

// Database row types for convenience
type UserRow = Database['public']['Tables']['users']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']
type WorkerRow = Database['public']['Tables']['workers']['Row']
type KYCVerificationRow = Database['public']['Tables']['kyc_verifications']['Row']
type JobRow = Database['public']['Tables']['jobs']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type ReportRow = Database['public']['Tables']['reports']['Row']
type TransactionRow = Database['public']['Tables']['transactions']['Row']
type ReviewRow = Database['public']['Tables']['reviews']['Row']

// ============================================================================
// ADMIN USER & PERMISSION TYPES
// ============================================================================

export type AdminRole = 'super_admin' | 'admin' | 'moderator'

export type AdminPermission =
  | 'view_users'
  | 'manage_users'
  | 'verify_businesses'
  | 'verify_kyc'
  | 'moderate_jobs'
  | 'moderate_reviews'
  | 'resolve_disputes'
  | 'view_analytics'
  | 'view_system_health'
  | 'manage_admins'
  | 'view_audit_logs'
  | 'ban_users'
  | 'suspend_jobs'
  | 'delete_content'

export interface AdminUser {
  id: string
  user_id: string
  role: AdminRole
  permissions: AdminPermission[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AdminUserWithProfile extends AdminUser {
  user: UserRow
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type AuditAction =
  | 'login'
  | 'logout'
  | 'approve_business'
  | 'reject_business'
  | 'approve_kyc'
  | 'reject_kyc'
  | 'suspend_user'
  | 'ban_user'
  | 'unsuspend_user'
  | 'unban_user'
  | 'delete_job'
  | 'delete_review'
  | 'resolve_dispute'
  | 'dismiss_report'
  | 'update_permissions'
  | 'create_admin'
  | 'delete_admin'
  | 'view_sensitive_data'

export interface AuditLog {
  id: string
  admin_id: string
  action: AuditAction
  entity_type: 'user' | 'business' | 'worker' | 'job' | 'booking' | 'review' | 'report' | 'admin'
  entity_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogWithAdmin extends AuditLog {
  admin: AdminUserWithProfile
}

// ============================================================================
// ADMIN DASHBOARD FILTER TYPES
// ============================================================================

export interface UserManagementFilters {
  search?: string
  role?: 'worker' | 'business' | 'admin'
  status?: 'active' | 'suspended' | 'banned'
  verificationStatus?: 'verified' | 'unverified' | 'pending'
  area?: string
  createdAfter?: string
  createdBefore?: string
  sortBy?: 'created_at' | 'full_name' | 'email' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface BusinessVerificationFilters {
  search?: string
  verificationStatus?: 'pending' | 'verified' | 'rejected'
  businessType?: 'hotel' | 'villa' | 'restaurant' | 'event_company' | 'other'
  area?: string
  submittedAfter?: string
  submittedBefore?: string
  sortBy?: 'submitted_at' | 'name' | 'area'
  sortOrder?: 'asc' | 'desc'
}

export interface KYCVerificationFilters {
  search?: string
  status?: 'pending' | 'verified' | 'rejected'
  submittedAfter?: string
  submittedBefore?: string
  area?: string
  sortBy?: 'submitted_at' | 'full_name'
  sortOrder?: 'asc' | 'desc'
}

export interface JobModerationFilters {
  search?: string
  status?: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'
  categoryId?: string
  area?: string
  reportedOnly?: boolean
  createdAfter?: string
  createdBefore?: string
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'budget_min'
  sortOrder?: 'asc' | 'desc'
}

export interface DisputeFilters {
  search?: string
  status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  type?: 'booking' | 'payment' | 'behavior' | 'quality' | 'other'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  createdAfter?: string
  createdBefore?: string
  sortBy?: 'created_at' | 'updated_at' | 'priority'
  sortOrder?: 'asc' | 'desc'
}

export interface ReportFilters {
  search?: string
  status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  reportedType?: 'user' | 'job' | 'business' | 'booking'
  createdAfter?: string
  createdBefore?: string
  sortBy?: 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// ADMIN ACTION TYPES
// ============================================================================

export interface BusinessVerificationAction {
  business_id: string
  action: 'approve' | 'reject'
  reason?: string
  admin_id: string
}

export interface KYCVerificationAction {
  kyc_id: string
  action: 'approve' | 'reject'
  rejection_reason?: string
  admin_id: string
}

export interface UserModerationAction {
  user_id: string
  action: 'suspend' | 'ban' | 'unsuspend' | 'unban'
  reason?: string
  admin_id: string
}

export interface JobModerationAction {
  job_id: string
  action: 'delete' | 'suspend' | 'restore'
  reason?: string
  admin_id: string
}

export interface DisputeResolution {
  dispute_id: string
  resolution: 'refund_full' | 'refund_partial' | 'no_refund' | 'worker_favor' | 'business_favor' | 'custom'
  resolution_notes?: string
  refund_amount?: number
  admin_id: string
}

export interface ReportAction {
  report_id: string
  action: 'resolve' | 'dismiss' | 'escalate'
  notes?: string
  admin_id: string
}

// ============================================================================
// ANALYTICS & METRICS TYPES
// ============================================================================

export interface PlatformMetrics {
  users: {
    total: number
    workers: number
    businesses: number
    admins: number
    newThisWeek: number
    newThisMonth: number
  }
  jobs: {
    total: number
    active: number
    completed: number
    cancelled: number
    newThisWeek: number
    newThisMonth: number
  }
  bookings: {
    total: number
    pending: number
    inProgress: number
    completed: number
    cancelled: number
    newThisWeek: number
    newThisMonth: number
  }
  transactions: {
    total: number
    totalVolume: number
    pendingVolume: number
    completedVolume: number
    thisWeekVolume: number
    thisMonthVolume: number
  }
  verifications: {
    pendingBusiness: number
    pendingKYC: number
    approvedThisWeek: number
    rejectedThisWeek: number
  }
  disputes: {
    open: number
    resolvedThisWeek: number
    resolvedThisMonth: number
    avgResolutionTime: number // in hours
  }
  reports: {
    pending: number
    open: number
    resolvedThisWeek: number
  }
}

export interface AnalyticsTimeRange {
  start: string
  end: string
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface UserGrowthData extends ChartDataPoint {
  workers: number
  businesses: number
  total: number
}

export interface JobActivityData extends ChartDataPoint {
  posted: number
  completed: number
  cancelled: number
}

export interface RevenueData extends ChartDataPoint {
  total: number
  fees: number
}

export interface AreaStats {
  area: string
  users: number
  jobs: number
  bookings: number
  revenue: number
}

// ============================================================================
// SYSTEM HEALTH TYPES
// ============================================================================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  uptime: number // percentage
  lastChecked: string
  services: ServiceHealth[]
}

export interface ServiceHealth {
  name: string
  status: 'operational' | 'degraded' | 'down'
  responseTime?: number // in milliseconds
  lastChecked: string
  errorMessage?: string
}

export interface SystemMetrics {
  cpu: number // percentage
  memory: number // percentage
  disk: number // percentage
  databaseConnections: number
  activeUsers: number
  requestsPerSecond: number
  avgResponseTime: number // in milliseconds
  timestamp: string
}

export interface SystemAlert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  service?: string
  resolvedAt?: string
  createdAt: string
}

// ============================================================================
// ADMIN LIST RESPONSE TYPES
// ============================================================================

export interface PaginatedAdminResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UserManagementItem {
  user: UserRow
  business?: BusinessRow
  worker?: WorkerRow
  bookingCount?: number
  reviewCount?: number
  reportCount?: number
}

export interface BusinessVerificationItem extends BusinessRow {
  user: UserRow
  submittedAt: string
  pendingDays: number
}

export interface KYCVerificationItem extends KYCVerificationRow {
  worker: WorkerRow
  user: UserRow
  submittedAt: string
  pendingDays: number
}

export interface JobModerationItem extends JobRow {
  business: BusinessRow
  user: UserRow
  category?: { id: string; name: string; slug: string }
  bookingCount?: number
  reportCount?: number
}

export interface DisputeItem {
  id: string
  booking_id: string
  booking: BookingRow
  reporter: UserRow
  reported: UserRow
  type: string
  description: string
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  resolution?: string
  resolution_notes?: string
  admin_notes?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  resolved_by?: string
}

export interface ReportItem extends ReportRow {
  reporter: UserRow
  reportedUser?: UserRow
  reportedBusiness?: BusinessRow
  reportedJob?: JobRow
  reportedBooking?: BookingRow
  booking?: BookingRow
}

// ============================================================================
// ADMIN DASHBOARD SUMMARY TYPES
// ============================================================================

export interface DashboardSummary {
  metrics: PlatformMetrics
  recentActivity: RecentActivity[]
  pendingActions: PendingActions
  systemHealth: SystemHealth
  alerts: SystemAlert[]
}

export interface RecentActivity {
  id: string
  type: 'user_registered' | 'job_posted' | 'booking_completed' | 'dispute_resolved' | 'verification_completed'
  description: string
  timestamp: string
  link?: string
}

export interface PendingActions {
  businessVerifications: number
  kycVerifications: number
  disputes: number
  reports: number
}

// ============================================================================
// ADMIN SETTINGS TYPES
// ============================================================================

export interface AdminSettings {
  platformName: string
  supportEmail: string
  supportPhone?: string
  maintenanceMode: boolean
  maintenanceMessage?: string
  registrationOpen: boolean
  minWorkerAge: number
  maxDailyJobs: number
  commissionRate: number // percentage
  features: {
    instantBooking: boolean
    messaging: boolean
    reviews: boolean
    disputes: boolean
  }
  updated_at: string
}

export interface AdminSettingsUpdate {
  platformName?: string
  supportEmail?: string
  supportPhone?: string
  maintenanceMode?: boolean
  maintenanceMessage?: string
  registrationOpen?: boolean
  minWorkerAge?: number
  maxDailyJobs?: number
  commissionRate?: number
  features?: {
    instantBooking?: boolean
    messaging?: boolean
    reviews?: boolean
    disputes?: boolean
  }
}
