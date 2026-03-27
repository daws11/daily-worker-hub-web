/**
 * In-Memory LRU Cache with TTL Support
 *
 * Provides efficient caching for frequently accessed data in the Daily Worker Hub.
 * Supports namespaced keys, TTL (time-to-live), and automatic eviction.
 */

// Cache entry structure
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  entries: {
    key: string;
    hits: number;
    age: number;
    ttlRemaining: number;
  }[];
}

// Namespace configuration
export type CacheNamespace =
  | "jobs"
  | "workers"
  | "badges"
  | "categories"
  | "sessions"
  | "skills"
  | "bookings"
  | "applications";

// TTL presets in milliseconds
export const CACHE_TTL = {
  JOBS: 5 * 60 * 1000, // 5 minutes
  WORKERS: 10 * 60 * 1000, // 10 minutes
  BADGES: 60 * 60 * 1000, // 1 hour
  CATEGORIES: 60 * 60 * 1000, // 1 hour
  SESSIONS: 15 * 60 * 1000, // 15 minutes
  BOOKINGS: 5 * 60 * 1000, // 5 minutes
  APPLICATIONS: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * LRU Cache implementation with TTL support
 */
class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Generate a namespaced cache key
   */
  static createKey(
    namespace: CacheNamespace,
    ...parts: (string | number)[]
  ): string {
    return `${namespace}:${parts.join(":")}`;
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, { ...entry, hits: entry.hits + 1 });
    this.hits++;

    return entry.value;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key: string, value: T, ttl: number = CACHE_TTL.JOBS): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + ttl,
      createdAt: now,
      hits: 0,
    });
  }

  /**
   * Delete a key from cache
   */
  del(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  delPattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  flush(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get or set pattern - fetch from source if not cached
   */
  async getOrSet<R>(
    key: string,
    fetcher: () => Promise<R>,
    ttl: number = CACHE_TTL.JOBS,
  ): Promise<R> {
    const cached = this.get(key) as unknown as R | null;

    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value as unknown as T, ttl);

    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Math.floor((now - entry.createdAt) / 1000),
      ttlRemaining: Math.max(0, Math.floor((entry.expiresAt - now) / 1000)),
    }));

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate:
        this.hits + this.misses > 0
          ? Math.round((this.hits / (this.hits + this.misses)) * 100) / 100
          : 0,
      entries,
    };
  }

  /**
   * Get all keys matching a namespace
   */
  getKeysByNamespace(namespace: CacheNamespace): string[] {
    const prefix = `${namespace}:`;
    return Array.from(this.cache.keys()).filter((key) =>
      key.startsWith(prefix),
    );
  }
}

// Global cache instance
export const cache = new LRUCache(2000);

// ============================================================
// CACHE INVALIDATION HELPERS
// ============================================================

/**
 * Invalidate all job-related caches
 */
export function invalidateJobCache(jobId?: string): number {
  let deleted = 0;

  if (jobId) {
    // Invalidate specific job
    deleted += cache.delPattern(`jobs:*:${jobId}`);
    deleted += cache.delPattern(`jobs:${jobId}:*`);
  }

  // Always invalidate job listings (they might contain the updated job)
  deleted += cache.delPattern("jobs:list:*");

  return deleted;
}

/**
 * Invalidate all worker-related caches
 */
export function invalidateWorkerCache(workerId?: string): number {
  let deleted = 0;

  if (workerId) {
    // Invalidate specific worker
    if (cache.del(LRUCache.createKey("workers", workerId, "public"))) deleted++;
    if (cache.del(LRUCache.createKey("workers", workerId, "badges"))) deleted++;
    deleted += cache.delPattern(`workers:${workerId}:*`);
  }

  // Invalidate worker listings
  deleted += cache.delPattern("workers:list:*");

  return deleted;
}

/**
 * Invalidate user session cache
 */
export function invalidateUserCache(userId: string): number {
  let deleted = 0;

  if (cache.del(LRUCache.createKey("sessions", userId))) deleted++;
  if (cache.del(LRUCache.createKey("sessions", userId, "auth"))) deleted++;

  return deleted;
}

/**
 * Invalidate badge caches
 */
export function invalidateBadgeCache(): number {
  return cache.delPattern("badges:*");
}

/**
 * Invalidate category caches
 */
export function invalidateCategoryCache(): number {
  return cache.delPattern("categories:*");
}

/**
 * Invalidate all application-related caches
 */
export function invalidateApplicationCache(applicationId?: string): number {
  let deleted = 0;

  if (applicationId) {
    // Invalidate specific application
    if (cache.del(LRUCache.createKey("applications", applicationId))) deleted++;
    deleted += cache.delPattern(`applications:${applicationId}:*`);
  }

  // Invalidate application listings
  deleted += cache.delPattern("applications:list:*");

  return deleted;
}

// ============================================================
// CACHE MIDDLEWARE FOR API ROUTES
// ============================================================

interface CacheMiddlewareOptions {
  ttl?: number;
  namespace?: CacheNamespace;
  keyGenerator?: (request: Request) => string;
  bypassParam?: string;
}

/**
 * Generate a cache key from a request
 */
function defaultKeyGenerator(
  request: Request,
  namespace: CacheNamespace,
): string {
  const url = new URL(request.url);
  const params = url.searchParams.toString();
  const path = url.pathname;

  // Create a hash-like key from path and params
  const key = params ? `${path}:${params}` : path;
  return LRUCache.createKey(namespace, key);
}

/**
 * Cache middleware wrapper for API route handlers
 */
export function withCache<T extends Response>(
  handler: (request: Request) => Promise<T>,
  options: CacheMiddlewareOptions = {},
): (request: Request) => Promise<T> {
  const {
    ttl = CACHE_TTL.JOBS,
    namespace = "jobs",
    keyGenerator,
    bypassParam = "nocache",
  } = options;

  return async (request: Request): Promise<T> => {
    const url = new URL(request.url);

    // Check for cache bypass
    if (url.searchParams.get(bypassParam) === "true") {
      return handler(request);
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(request)
      : defaultKeyGenerator(request, namespace);

    // Only cache GET requests
    if (request.method !== "GET") {
      return handler(request);
    }

    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      // Return cached response
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT",
          "X-Cache-Key": cacheKey,
        },
      }) as T;
    }

    // Execute handler
    const response = await handler(request);

    // Only cache successful responses
    if (response.status === 200) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        cache.set(cacheKey, data, ttl);

        // Add cache headers to response
        const headers = new Headers(response.headers);
        headers.set("X-Cache", "MISS");
        headers.set("X-Cache-Key", cacheKey);

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        }) as T;
      } catch {
        // If we can't clone/parse the response, just return it
        return response;
      }
    }

    return response;
  };
}

// ============================================================
// CONVENIENCE FUNCTIONS FOR COMMON CACHING PATTERNS
// ============================================================

/**
 * Cache job listings with automatic key generation
 */
export async function getCachedJobs(
  filters: Record<string, string | number | undefined>,
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const filterKey = Object.entries(filters)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("&");

  const cacheKey = LRUCache.createKey("jobs", "list", filterKey || "all");

  return cache.getOrSet(cacheKey, fetcher, CACHE_TTL.JOBS);
}

/**
 * Cache worker public profile
 */
export async function getCachedWorkerProfile(
  workerId: string,
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const cacheKey = LRUCache.createKey("workers", workerId, "public");

  return cache.getOrSet(cacheKey, fetcher, CACHE_TTL.WORKERS);
}

/**
 * Cache badge definitions
 */
export async function getCachedBadges(
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const cacheKey = LRUCache.createKey("badges", "definitions");

  return cache.getOrSet(cacheKey, fetcher, CACHE_TTL.BADGES);
}

/**
 * Cache categories
 */
export async function getCachedCategories(
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const cacheKey = LRUCache.createKey("categories", "all");

  return cache.getOrSet(cacheKey, fetcher, CACHE_TTL.CATEGORIES);
}

/**
 * Cache user session/auth context
 */
export async function getCachedSession(
  userId: string,
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const cacheKey = LRUCache.createKey("sessions", userId, "auth");

  return cache.getOrSet(cacheKey, fetcher, CACHE_TTL.SESSIONS);
}

// Export the class for testing
export { LRUCache };
