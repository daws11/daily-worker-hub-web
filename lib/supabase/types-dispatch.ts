/**
 * Extended Types for Dispatch System
 *
 * Types for dispatch_queue and worker_dispatch_history tables
 * that were added by migration 001_dispatch_system.sql
 */

// ============================================================================
// dispatch_queue Table Types
// ============================================================================

export interface DispatchQueueRow {
  id: string;
  job_id: string;
  worker_id: string;
  business_id: string;
  status: "pending" | "accepted" | "rejected" | "timed_out" | "cancelled";
  matching_score: number | null;
  dispatched_at: string;
  expires_at: string;
  responded_at: string | null;
  response_time_seconds: number | null;
  dispatch_order: number;
  created_at: string;
  updated_at: string;
}

export interface DispatchQueueInsert {
  id?: string;
  job_id: string;
  worker_id: string;
  business_id: string;
  status?: "pending" | "accepted" | "rejected" | "timed_out" | "cancelled";
  matching_score?: number | null;
  dispatched_at?: string;
  expires_at: string;
  responded_at?: string | null;
  response_time_seconds?: number | null;
  dispatch_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DispatchQueueUpdate {
  status?: "pending" | "accepted" | "rejected" | "timed_out" | "cancelled";
  matching_score?: number | null;
  responded_at?: string | null;
  response_time_seconds?: number | null;
  updated_at?: string;
}

// ============================================================================
// worker_dispatch_history Table Types
// ============================================================================

export interface WorkerDispatchHistoryRow {
  id: string;
  worker_id: string;
  job_id: string;
  dispatch_queue_id: string | null;
  action: "accepted" | "rejected" | "timed_out" | "cancelled";
  response_time_seconds: number | null;
  worker_lat: number | null;
  worker_lng: number | null;
  distance_km: number | null;
  matching_score: number | null;
  created_at: string;
}

export interface WorkerDispatchHistoryInsert {
  id?: string;
  worker_id: string;
  job_id: string;
  dispatch_queue_id?: string | null;
  action: "accepted" | "rejected" | "timed_out" | "cancelled";
  response_time_seconds?: number | null;
  worker_lat?: number | null;
  worker_lng?: number | null;
  distance_km?: number | null;
  matching_score?: number | null;
  created_at?: string;
}

// ============================================================================
// Worker Dispatch Extension (columns added by 001_dispatch_system.sql)
// ============================================================================

export interface WorkerDispatchFields {
  is_online: boolean;
  online_since: string | null;
  auto_offline_at: string | null;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  max_distance_km: number;
  preferred_categories: string[];
  total_dispatches: number;
  total_accepted: number;
  total_rejected: number;
  total_timed_out: number;
  avg_response_time_seconds: number | null;
}

// ============================================================================
// Job Dispatch Extension (columns added by 001_dispatch_system.sql)
// ============================================================================

export interface JobDispatchFields {
  dispatch_mode: "manual" | "auto";
  dispatch_status: "pending" | "dispatching" | "fulfilled" | "exhausted" | "cancelled";
  total_dispatched: number;
  total_rejected: number;
  fulfilled_at: string | null;
  auto_accept_top_worker: boolean;
  dispatch_timeout_seconds: number;
}
