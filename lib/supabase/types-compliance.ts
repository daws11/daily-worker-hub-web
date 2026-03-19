/**
 * Extended Types for Compliance Tracking
 *
 * These types extend the auto-generated Supabase types to include
 * compliance_tracking and compliance_warnings tables.
 */

import type { Database } from './types'

// ============================================================================
// compliance_warnings Table Types
// ============================================================================

/**
 * Row type for compliance_warnings table
 */
export interface ComplianceWarningsRow {
  id: string
  business_id: string
  worker_id: string
  month: string
  days_worked: number
  warning_level: 'none' | 'warning' | 'blocked'
  acknowledged: boolean
  created_at: string
  updated_at: string
}

/**
 * Insert type for compliance_warnings table
 */
export interface ComplianceWarningsInsert {
  id?: string
  business_id: string
  worker_id: string
  month: string
  days_worked?: number
  warning_level?: 'none' | 'warning' | 'blocked'
  acknowledged?: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Update type for compliance_warnings table
 */
export interface ComplianceWarningsUpdate {
  days_worked?: number
  warning_level?: 'none' | 'warning' | 'blocked'
  acknowledged?: boolean
  updated_at?: string
}

// ============================================================================
// compliance_tracking Table Types
// ============================================================================

/**
 * Row type for compliance_tracking table
 */
export interface ComplianceTrackingRow {
  id: string
  business_id: string
  worker_id: string
  month: string
  days_worked: number
  created_at: string
  updated_at: string
}

// ============================================================================
// Extended Database Type with Compliance Tables
// ============================================================================

/**
 * Extended Database type including compliance tables
 * This type can be used when you need full type access
 */
export type DatabaseWithCompliance = Database & {
  public: {
    Tables: Database['public']['Tables'] & {
      compliance_warnings: {
        Row: ComplianceWarningsRow
        Insert: ComplianceWarningsInsert
        Update: ComplianceWarningsUpdate
        Relationships: [
          {
            foreignKeyName: "compliance_warnings_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_warnings_worker_id_fkey"
            columns: ["worker_id"]
            referencedRelation: "workers"
            referencedColumns: ["id"]
          }
        ]
      }
      compliance_tracking: {
        Row: ComplianceTrackingRow
        Insert: Omit<ComplianceTrackingRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ComplianceTrackingRow, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: "compliance_tracking_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_tracking_worker_id_fkey"
            columns: ["worker_id"]
            referencedRelation: "workers"
            referencedColumns: ["id"]
          }
        ]
      }
    }
  }
}

// ============================================================================
// Compliance Status Types
// ============================================================================

/**
 * Compliance status based on days worked
 */
export type ComplianceStatus = 'ok' | 'warning' | 'blocked'

/**
 * Warning level based on PP 35/2021 compliance
 * - none: 0-15 days worked (compliant)
 * - warning: 16-20 days worked (approaching limit)
 * - blocked: 21+ days worked (violation)
 */
export type WarningLevel = 'none' | 'warning' | 'blocked'

/**
 * Banner type for UI display
 */
export type BannerType = 'success' | 'warning-yellow' | 'warning-orange' | 'error'

// ============================================================================
// Compliance Check Result Types
// ============================================================================

/**
 * Result of compliance check for a worker-business pair
 */
export interface ComplianceStatusResult {
  status: ComplianceStatus
  daysWorked: number
  warningLevel: WarningLevel
  message: string
}

/**
 * Extended compliance check result with additional fields
 */
export interface ComplianceCheckResult {
  canBook: boolean
  status: ComplianceStatus
  warningLevel: WarningLevel
  daysWorked: number
  daysRemaining: number
  message: string
  bannerType: BannerType
}

/**
 * Alternative worker with compliance info
 */
export interface AlternativeWorker {
  id: string
  full_name: string
  avatar_url: string
  phone: string
  bio: string
  daysWorked: number
  complianceStatus: ComplianceStatus
  warningLevel: WarningLevel
  matchingScore?: number
}

/**
 * Compliance check result for server actions
 */
export interface ComplianceCheckActionResult {
  success: boolean
  canAccept: boolean
  error?: string
  data?: ComplianceStatusResult
}

// ============================================================================
// Compliance Warnings with Relations
// ============================================================================

/**
 * Compliance warning with worker details
 */
export interface ComplianceWarningWithWorker extends ComplianceWarningsRow {
  worker: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

/**
 * Compliance warning with business details
 */
export interface ComplianceWarningWithBusiness extends ComplianceWarningsRow {
  business: {
    id: string
    name: string
  }
}

/**
 * Compliance warning with both worker and business details
 */
export interface ComplianceWarningFull extends ComplianceWarningsRow {
  worker: {
    id: string
    full_name: string
    avatar_url: string | null
    phone: string | null
  }
  business: {
    id: string
    name: string
    email: string | null
  }
}

// ============================================================================
// Compliance Summary Types
// ============================================================================

/**
 * Compliance summary for a business
 */
export interface BusinessComplianceSummary {
  totalWorkers: number
  compliantWorkers: number
  warningWorkers: number
  blockedWorkers: number
  averageDaysWorked: number
  warnings: ComplianceWarningWithWorker[]
}

/**
 * Compliance summary for a worker
 */
export interface WorkerComplianceSummary {
  totalBusinesses: number
  compliantBusinesses: number
  warningBusinesses: number
  blockedBusinesses: number
  violations: ComplianceWarningWithBusiness[]
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid ComplianceStatus
 */
export function isComplianceStatus(value: unknown): value is ComplianceStatus {
  return typeof value === 'string' && ['ok', 'warning', 'blocked'].includes(value)
}

/**
 * Type guard to check if a value is a valid WarningLevel
 */
export function isWarningLevel(value: unknown): value is WarningLevel {
  return typeof value === 'string' && ['none', 'warning', 'blocked'].includes(value)
}

/**
 * Type guard to check if a value is a valid BannerType
 */
export function isBannerType(value: unknown): value is BannerType {
  return typeof value === 'string' && ['success', 'warning-yellow', 'warning-orange', 'error'].includes(value)
}
