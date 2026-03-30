/**
 * Shared type definitions for Booking
 * Used across the application to ensure type consistency
 */

export interface BookingJob {
  id: string;
  title: string;
  address?: string | null;
}

export interface BookingWorker {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface BookingBusiness {
  id: string;
  name: string;
}

/**
 * Unified Booking interface - handles both single relation and array relations
 * from Supabase queries. The jobs, workers, businesses can be either single 
 * objects or arrays depending on the query (e.g., .single() vs without .single())
 */
export interface Booking {
  id: string;
  job_id: string;
  business_id: string;
  worker_id: string;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "in_progress"
    | "completed"
    | "cancelled";
  start_date: string | null;
  end_date: string | null;
  final_price: number | null;
  created_at: string;
  
  // Single relation (when using .single())
  job?: BookingJob;
  worker?: BookingWorker;
  business?: BookingBusiness;
  
  // Array relations (when NOT using .single())
  jobs?: BookingJob[] | null;
  workers?: BookingWorker[] | null;
  businesses?: BookingBusiness[] | null;
}

/**
 * Helper type to get the job from either format
 */
export function getJobTitle(job: Booking["job"] | Booking["jobs"]): string {
  if (Array.isArray(job)) {
    return job[0]?.title ?? "Unknown Job";
  }
  return job?.title ?? "Unknown Job";
}

export function getWorkerName(worker: Booking["worker"] | Booking["workers"]): string {
  if (Array.isArray(worker)) {
    return worker[0]?.full_name ?? "Unknown Worker";
  }
  return worker?.full_name ?? "Unknown Worker";
}

export function getBusinessName(business: Booking["business"] | Booking["businesses"]): string {
  if (Array.isArray(business)) {
    return business[0]?.name ?? "Unknown Business";
  }
  return business?.name ?? "Unknown Business";
}
