// @ts-nocheck
import { Database } from '../supabase/types'

type SocialPlatformRow = Database['public']['Tables']['social_platforms']['Row']
type BusinessSocialConnectionRow = Database['public']['Tables']['business_social_connections']['Row']
type JobPostRow = Database['public']['Tables']['job_posts']['Row']
type JobRow = Database['public']['Tables']['jobs']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']

export type SocialPlatformType = Database['public']['Enums']['social_platform_type']
export type SocialPlatformStatus = Database['public']['Enums']['social_platform_status']
export type ConnectionStatus = Database['public']['Enums']['connection_status']
export type JobPostStatus = Database['public']['Enums']['job_post_status']

export interface SocialPlatform {
  id: string
  platform_name: string
  platform_type: SocialPlatformType
  auth_type: string
  api_version: string | null
  config: Record<string, unknown>
  webhook_url: string | null
  webhook_secret: string | null
  description: string | null
  is_available: boolean
  status: SocialPlatformStatus
  created_at: string
  updated_at: string
}

export interface SocialPlatformConfig {
  clientId?: string
  redirectUri?: string
  scopes?: string[]
  apiVersion?: string
  graphUrl?: string
}

export interface BusinessSocialConnection {
  id: string
  business_id: string
  platform_id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  platform_account_id: string | null
  platform_account_name: string | null
  platform_account_url: string | null
  platform_page_id: string | null
  scopes: string[] | null
  settings: Record<string, unknown>
  status: ConnectionStatus
  error_count: number
  last_error: string | null
  last_error_at: string | null
  last_verified_at: string | null
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface BusinessSocialConnectionWithPlatform extends BusinessSocialConnection {
  platform: SocialPlatform
}

export interface ConnectionSettings {
  autoPostEnabled?: boolean
  defaultPostTiming?: 'immediate' | 'scheduled'
  scheduledTime?: string
  customFormatting?: boolean
  hashtags?: string[]
}

export interface CreateConnectionInput {
  platform_id: string
  access_token: string
  refresh_token?: string
  token_expires_at?: string
  platform_account_id?: string
  platform_account_name?: string
  platform_account_url?: string
  platform_page_id?: string
  scopes?: string[]
  settings?: ConnectionSettings
}

export interface UpdateConnectionInput {
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  settings?: ConnectionSettings
  status?: ConnectionStatus
  error_count?: number
  last_error?: string
  last_error_at?: string
}

export interface JobPost {
  id: string
  job_id: string
  connection_id: string
  platform_post_id: string | null
  platform_post_url: string | null
  post_type: string | null
  content: Record<string, unknown>
  media_ids: string[] | null
  status: JobPostStatus
  scheduled_at: string | null
  posted_at: string | null
  metrics: Record<string, unknown>
  error_code: string | null
  error_message: string | null
  retry_count: number
  last_retry_at: string | null
  created_at: string
  updated_at: string
}

export interface JobPostWithRelations extends JobPost {
  job: {
    id: string
    title: string
    description: string | null
  }
  connection: BusinessSocialConnectionWithPlatform
}

export interface JobPostContent {
  text: string
  images?: string[]
  video?: string
  link?: string
  hashtags?: string[]
  callToAction?: string
}

export interface JobPostMetrics {
  views?: number
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
  engagements?: number
  impressions?: number
  reach?: number
}

export interface CreateJobPostInput {
  job_id: string
  connection_id: string
  content: JobPostContent
  post_type?: string
  media_ids?: string[]
  scheduled_at?: string
}

export interface UpdateJobPostInput {
  content?: JobPostContent
  status?: JobPostStatus
  scheduled_at?: string
  error_code?: string
  error_message?: string
  retry_count?: number
  metrics?: JobPostMetrics
}

export interface JobPostListParams {
  job_id?: string
  connection_id?: string
  status?: JobPostStatus
  platform_id?: string
  page?: number
  limit?: number
}

export interface JobPostListResponse {
  posts: JobPostWithRelations[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SocialPlatformFilters {
  is_available?: boolean
  status?: SocialPlatformStatus
  platform_type?: SocialPlatformType
}

export interface ConnectionListParams {
  business_id?: string
  platform_id?: string
  status?: ConnectionStatus
  page?: number
  limit?: number
}

export interface ConnectionListResponse {
  connections: BusinessSocialConnectionWithPlatform[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PlatformPostResult {
  success: boolean
  platform_post_id?: string
  platform_post_url?: string
  error_code?: string
  error_message?: string
}

export interface RetryJobPostInput {
  job_post_id: string
  force_retry?: boolean
}
