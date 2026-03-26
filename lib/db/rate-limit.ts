import { createClient } from "../supabase/server";

type RateLimitType = "auth" | "api-authenticated" | "api-public" | "payment";

type RateLimitRow = {
  id: string;
  identifier: string;
  rate_limit_type: RateLimitType;
  window_ms: number;
  created_at: string;
};

type RateLimitInsert = {
  identifier: string;
  rate_limit_type: RateLimitType;
  window_ms: number;
};

/**
 * Get current request count for sliding window rate limiting.
 * Returns the number of requests for an identifier+type within the window.
 *
 * @param identifier - Rate limit identifier (e.g., "user:<userId>", "ip:<ipAddress>")
 * @param type - Rate limit type (auth, api-authenticated, api-public, payment)
 * @param windowMs - Window duration in milliseconds
 * @returns Current request count within the window, or null on error
 */
export async function getRateLimitCount(
  identifier: string,
  type: RateLimitType,
  windowMs: number,
): Promise<{ count: number; error: null } | { count: null; error: unknown }> {
  const supabase = await createClient();
  const cutoffTime = new Date(Date.now() - windowMs).toISOString();

  const { data, error } = await (supabase as any)
    .from("rate_limits")
    .select("id")
    .eq("identifier", identifier)
    .eq("rate_limit_type", type)
    .gt("created_at", cutoffTime);

  if (error) {
    return { count: null, error };
  }

  return { count: data.length, error: null };
}

/**
 * Record a new request in the rate limit log.
 * Used for sliding window rate limiting to track individual requests.
 *
 * @param identifier - Rate limit identifier (e.g., "user:<userId>", "ip:<ipAddress>")
 * @param type - Rate limit type (auth, api-authenticated, api-public, payment)
 * @param windowMs - Window duration in milliseconds (stored for reference during cleanup)
 * @returns Inserted rate limit record, or null on error
 */
export async function recordRateLimitRequest(
  identifier: string,
  type: RateLimitType,
  windowMs: number,
): Promise<{ data: RateLimitRow | null; error: unknown }> {
  const supabase = await createClient();

  const insertData: RateLimitInsert = {
    identifier,
    rate_limit_type: type,
    window_ms: windowMs,
  };

  const { data, error } = await (supabase as any)
    .from("rate_limits")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Clean up expired rate limit entries older than 10 minutes.
 * Called periodically to prevent table bloat from old request records.
 *
 * @returns Number of deleted entries, or null on error
 */
export async function cleanupExpiredRateLimits(): Promise<
  { deletedCount: number; error: null } | { deletedCount: null; error: unknown }
> {
  const supabase = await createClient();
  const cutoffTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await (supabase as any)
    .from("rate_limits")
    .delete()
    .lt("created_at", cutoffTime);

  if (error) {
    return { deletedCount: null, error };
  }

  return { deletedCount: data?.length ?? 0, error: null };
}
