import { createClient } from "../supabase/server";

type RateLimitType = "auth" | "api-authenticated" | "api-public" | "payment";

export type { RateLimitType };

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

/**
 * Aggregate rate limit metrics from the database.
 * Queries the rate_limits table to build stats per type.
 *
 * @returns Aggregated rate limit metrics, or null on error
 */
export async function getRateLimitMetrics(): Promise<{
  totalRequests: number;
  blockedRequests: number;
  byType: Record<
    RateLimitType,
    { requests: number; blocked: number; activeLimiters: number }
  >;
  topIdentifiers: Array<{ identifier: string; count: number }>;
} | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("rate_limits")
    .select("identifier, rate_limit_type, created_at");

  if (error) {
    return null;
  }

  const stats = {
    totalRequests: data.length,
    blockedRequests: 0,
    byType: {
      auth: { requests: 0, blocked: 0, activeLimiters: 0 },
      "api-authenticated": { requests: 0, blocked: 0, activeLimiters: 0 },
      "api-public": { requests: 0, blocked: 0, activeLimiters: 0 },
      payment: { requests: 0, blocked: 0, activeLimiters: 0 },
    } as Record<
      RateLimitType,
      { requests: number; blocked: number; activeLimiters: number }
    >,
    topIdentifiers: [] as Array<{ identifier: string; count: number }>,
  };

  const identifierCounts = new Map<string, number>();

  for (const row of data as Array<{ identifier: string; rate_limit_type: RateLimitType; created_at: string }>) {
    const type = row.rate_limit_type;

    if (stats.byType[type]) {
      stats.byType[type].requests++;

      // Track unique identifiers per type
      const limiterKey = `${type}:${row.identifier}`;
      identifierCounts.set(
        limiterKey,
        (identifierCounts.get(limiterKey) || 0) + 1,
      );
    }
  }

  // Count active limiters per type and estimate blocked requests
  for (const [key, count] of identifierCounts.entries()) {
    const [type, identifier] = key.split(":") as [RateLimitType, string];
    if (stats.byType[type]) {
      stats.byType[type].activeLimiters++;
      // Estimate blocked: identifiers with >= 5 requests in the window
      if (count >= 5) {
        stats.byType[type].blocked++;
        stats.blockedRequests++;
      }
    }
  }

  // Build top identifiers sorted by request count
  stats.topIdentifiers = Array.from(identifierCounts.entries())
    .map(([key, count]) => {
      const [, identifier] = key.split(":");
      return { identifier, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return stats;
}
