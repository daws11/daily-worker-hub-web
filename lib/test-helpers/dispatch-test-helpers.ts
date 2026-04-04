/**
 * Dispatch Test Helpers
 *
 * Helper functions for E2E tests in the dispatch system.
 * Provides factory functions for creating test data and cleanup utilities.
 *
 * Usage:
 *   import { createTestWorker, createTestBusiness, cleanupTestData } from './lib/test-helpers/dispatch-test-helpers';
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

interface TestWorkerOverrides {
  full_name?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  is_online?: boolean;
  reliability_score?: number;
  tier?: string;
  experience_years?: number;
  preferred_categories?: string[];
  max_distance_km?: number;
  area?: string;
}

interface TestBusinessOverrides {
  name?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  area?: string;
  business_type?: string;
  is_verified?: boolean;
}

interface TestJobOverrides {
  title?: string;
  description?: string;
  budget_min?: number;
  budget_max?: number;
  hours_needed?: number;
  dispatch_mode?: "manual" | "auto";
  dispatch_status?: string;
  dispatch_timeout_seconds?: number;
  status?: string;
  category_id?: string;
  lat?: number;
  lng?: number;
  address?: string;
  area?: string;
  is_urgent?: boolean;
}

interface TestDispatchOverrides {
  status?: string;
  matching_score?: number;
  dispatch_order?: number;
  expires_at?: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a test user + worker pair.
 * Returns the worker row (with dispatch columns appended by migration).
 */
export async function createTestWorker(
  supabase: SupabaseClient,
  overrides: TestWorkerOverrides = {},
) {
  const email = `test-worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;

  // Create auth user
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: "TestPass123!",
      email_confirm: true,
      user_metadata: { role: "worker" },
    });

  if (authError || !authUser?.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // Create worker profile
  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .insert({
      user_id: authUser.user.id,
      full_name: overrides.full_name ?? "Test Worker",
      phone: overrides.phone ?? "6281234567890",
      lat: overrides.lat ?? -8.6705,
      lng: overrides.lng ?? 115.2126,
      reliability_score: overrides.reliability_score ?? 85,
      tier: overrides.tier ?? "pro",
      experience_years: overrides.experience_years ?? 2,
      area: overrides.area ?? "Denpasar",
      jobs_completed: 10,
      rating: 4.5,
      kyc_status: "verified",
    })
    .select()
    .single();

  if (workerError || !worker) {
    throw new Error(`Failed to create test worker: ${workerError?.message}`);
  }

  // Apply dispatch-specific fields via update (columns added by migration, may not be in generated types)
  const dispatchUpdate: Record<string, any> = {};
  if (overrides.is_online !== undefined) dispatchUpdate.is_online = overrides.is_online;
  if (overrides.max_distance_km !== undefined) dispatchUpdate.max_distance_km = overrides.max_distance_km;
  if (overrides.preferred_categories !== undefined) dispatchUpdate.preferred_categories = overrides.preferred_categories;
  if (overrides.lat !== undefined) {
    dispatchUpdate.current_lat = overrides.lat;
    dispatchUpdate.current_lng = overrides.lng ?? 115.2126;
  }

  if (Object.keys(dispatchUpdate).length > 0) {
    await supabase.from("workers").update(dispatchUpdate).eq("id", worker.id);
  }

  return { ...worker, user_id: authUser.user.id, user_email: email };
}

/**
 * Create a test user + business pair.
 * Returns the business row.
 */
export async function createTestBusiness(
  supabase: SupabaseClient,
  overrides: TestBusinessOverrides = {},
) {
  const email = `test-business-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;

  // Create auth user
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: "TestPass123!",
      email_confirm: true,
      user_metadata: { role: "business" },
    });

  if (authError || !authUser?.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // Create business profile
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      user_id: authUser.user.id,
      name: overrides.name ?? "Test Business",
      phone: overrides.phone ?? "6281234567891",
      lat: overrides.lat ?? -8.6705,
      lng: overrides.lng ?? 115.2126,
      address: "Jl. Test No. 123",
      area: overrides.area ?? "Denpasar",
      business_type: overrides.business_type ?? "restaurant",
      is_verified: overrides.is_verified ?? true,
    })
    .select()
    .single();

  if (businessError || !business) {
    throw new Error(`Failed to create test business: ${businessError?.message}`);
  }

  return { ...business, user_id: authUser.user.id, user_email: email };
}

/**
 * Create a test job for a business.
 * Requires a category_id — we look up or create a default category.
 */
export async function createTestJob(
  supabase: SupabaseClient,
  businessId: string,
  overrides: TestJobOverrides = {},
) {
  // Get or create a category
  let categoryId = overrides.category_id;
  if (!categoryId) {
    const { data: existingCat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", "dishwasher")
      .maybeSingle();

    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      const { data: newCat, error: catError } = await supabase
        .from("categories")
        .insert({ name: "Dishwasher", slug: "dishwasher" })
        .select()
        .single();

      if (catError || !newCat) {
        throw new Error(`Failed to create category: ${catError?.message}`);
      }
      categoryId = newCat.id;
    }
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endDate = new Date(tomorrow);
  endDate.setHours(endDate.getHours() + 8);

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      business_id: businessId,
      category_id: categoryId,
      title: overrides.title ?? "Test Dishwasher Position",
      description: overrides.description ?? "Looking for experienced dishwasher",
      budget_min: overrides.budget_min ?? 100000,
      budget_max: overrides.budget_max ?? 200000,
      hours_needed: overrides.hours_needed ?? 8,
      status: overrides.status ?? "open",
      lat: overrides.lat ?? -8.6705,
      lng: overrides.lng ?? 115.2126,
      address: overrides.address ?? "Jl. Test No. 123, Denpasar",
      is_urgent: overrides.is_urgent ?? false,
      deadline: endDate.toISOString(),
    })
    .select()
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to create test job: ${jobError?.message}`);
  }

  // Apply dispatch-specific columns via update
  const dispatchUpdate: Record<string, any> = {};
  if (overrides.dispatch_mode) dispatchUpdate.dispatch_mode = overrides.dispatch_mode;
  if (overrides.dispatch_status) dispatchUpdate.dispatch_status = overrides.dispatch_status;
  if (overrides.dispatch_timeout_seconds) dispatchUpdate.dispatch_timeout_seconds = overrides.dispatch_timeout_seconds;

  if (Object.keys(dispatchUpdate).length > 0) {
    await supabase.from("jobs").update(dispatchUpdate).eq("id", job.id);
  }

  return job;
}

/**
 * Set a worker online with location.
 */
export async function setWorkerOnline(
  supabase: SupabaseClient,
  workerId: string,
  lat: number,
  lng: number,
) {
  const now = new Date().toISOString();
  const autoOfflineAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  const { data, error } = await supabase
    .from("workers")
    .update({
      is_online: true,
      online_since: now,
      auto_offline_at: autoOfflineAt,
      current_lat: lat,
      current_lng: lng,
      last_location_update: now,
    } as any)
    .eq("id", workerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set worker online: ${error.message}`);
  }

  return data;
}

/**
 * Set a worker offline.
 */
export async function setWorkerOffline(
  supabase: SupabaseClient,
  workerId: string,
) {
  const { data, error } = await supabase
    .from("workers")
    .update({
      is_online: false,
      online_since: null,
      auto_offline_at: null,
      current_lat: null,
      current_lng: null,
    } as any)
    .eq("id", workerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set worker offline: ${error.message}`);
  }

  return data;
}

/**
 * Create a dispatch_queue entry.
 */
export async function createTestDispatch(
  supabase: SupabaseClient,
  jobId: string,
  workerId: string,
  businessId: string,
  overrides: TestDispatchOverrides = {},
) {
  const now = new Date();
  const expiresAt = overrides.expires_at
    ? new Date(overrides.expires_at)
    : new Date(now.getTime() + 45 * 1000); // 45 seconds default

  const { data, error } = await (supabase as any)
    .from("dispatch_queue")
    .insert({
      job_id: jobId,
      worker_id: workerId,
      business_id: businessId,
      status: overrides.status ?? "pending",
      matching_score: overrides.matching_score ?? 75,
      dispatch_order: overrides.dispatch_order ?? 1,
      expires_at: expiresAt.toISOString(),
      dispatched_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test dispatch: ${error.message}`);
  }

  return data;
}

/**
 * Create a worker_dispatch_history entry.
 */
export async function createTestDispatchHistory(
  supabase: SupabaseClient,
  workerId: string,
  jobId: string,
  action: string,
  dispatchQueueId?: string,
  extras: Record<string, any> = {},
) {
  const { data, error } = await (supabase as any)
    .from("worker_dispatch_history")
    .insert({
      worker_id: workerId,
      job_id: jobId,
      dispatch_queue_id: dispatchQueueId,
      action,
      ...extras,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create dispatch history: ${error.message}`);
  }

  return data;
}

/**
 * Create a compliance_tracking entry to simulate PP 35/2021 days worked.
 */
export async function createComplianceTracking(
  supabase: SupabaseClient,
  workerId: string,
  businessId: string,
  month: string,
  daysWorked: number,
) {
  const { data, error } = await supabase
    .from("compliance_tracking")
    .upsert(
      {
        worker_id: workerId,
        business_id: businessId,
        month,
        days_worked: daysWorked,
      },
      { onConflict: "worker_id,business_id,month" },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create compliance tracking: ${error.message}`);
  }

  return data;
}

/**
 * Create a compliance_warning entry (for blocking workers).
 */
export async function createComplianceWarning(
  supabase: SupabaseClient,
  workerId: string,
  businessId: string,
  month: string,
  daysWorked: number,
  warningLevel: string = "blocked",
) {
  const { data, error } = await supabase
    .from("compliance_warnings")
    .upsert(
      {
        worker_id: workerId,
        business_id: businessId,
        month,
        days_worked: daysWorked,
        warning_level: warningLevel,
        acknowledged: true,
      },
      { onConflict: "worker_id,business_id,month" },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create compliance warning: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Cleanup all test data created during a test run.
 * Pass the IDs that were created to clean up specifically.
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  opts: {
    workerIds?: string[];
    businessIds?: string[];
    jobIds?: string[];
    userIds?: string[];
    dispatchIds?: string[];
  } = {},
) {
  const errors: string[] = [];

  // Delete dispatch queue entries
  if (opts.jobIds?.length) {
    await (supabase as any)
      .from("dispatch_queue")
      .delete()
      .in("job_id", opts.jobIds);
    await (supabase as any)
      .from("worker_dispatch_history")
      .delete()
      .in("job_id", opts.jobIds);
    await supabase.from("bookings").delete().in("job_id", opts.jobIds);
    await supabase.from("jobs_skills").delete().in("job_id", opts.jobIds);
    await supabase.from("jobs").delete().in("id", opts.jobIds);
  }

  if (opts.dispatchIds?.length) {
    await (supabase as any)
      .from("dispatch_queue")
      .delete()
      .in("id", opts.dispatchIds);
  }

  if (opts.workerIds?.length) {
    await (supabase as any)
      .from("dispatch_queue")
      .delete()
      .in("worker_id", opts.workerIds);
    await (supabase as any)
      .from("worker_dispatch_history")
      .delete()
      .in("worker_id", opts.workerIds);
    await supabase
      .from("compliance_tracking")
      .delete()
      .in("worker_id", opts.workerIds);
    await supabase
      .from("compliance_warnings")
      .delete()
      .in("worker_id", opts.workerIds);
    await supabase
      .from("worker_availabilities")
      .delete()
      .in("worker_id", opts.workerIds);
    await supabase
      .from("worker_skills")
      .delete()
      .in("worker_id", opts.workerIds);
    await supabase
      .from("bookings")
      .delete()
      .in("worker_id", opts.workerIds);
    await supabase.from("wallets").delete().in("worker_id", opts.workerIds);
    await supabase.from("workers").delete().in("id", opts.workerIds);
  }

  if (opts.businessIds?.length) {
    await supabase.from("businesses").delete().in("id", opts.businessIds);
  }

  // Delete auth users last
  if (opts.userIds?.length) {
    for (const uid of opts.userIds) {
      try {
        await supabase.auth.admin.deleteUser(uid);
      } catch (e: any) {
        errors.push(`Failed to delete user ${uid}: ${e.message}`);
      }
    }
  }

  return { success: errors.length === 0, errors };
}

// ============================================================================
// Logging Utilities
// ============================================================================

export const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

export function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Supabase Client Factory
// ============================================================================

/**
 * Create a Supabase client with service role key for testing.
 * Loads .env.local automatically.
 */
export function createTestSupabaseClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require("dotenv");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require("path");

  dotenv.config({ path: join(process.cwd(), ".env.local") });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase configuration. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
