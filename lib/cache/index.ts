/**
 * Cache Factory — Redis or In-Memory based on environment
 *
 * Returns a Redis-backed cache when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set, falling back to the in-memory
 * LRUCache otherwise. This allows seamless development without Redis
 * while using distributed Redis in production.
 */

import { LRUCache, cache as inMemoryCache } from "../cache";
import { RedisCache } from "./redis-cache";
import { isRedisAvailable } from "./redis-client";

// Re-export shared types and constants from lib/cache.ts for convenience
export type { CacheNamespace } from "../cache";
import { CACHE_TTL } from "../cache";
export { CACHE_TTL };

// Unified cache interface — supports both sync (LRU) and async (Redis) backends
// LRUCache methods are sync; RedisCache methods are async.
// The factory returns whichever concrete implementation is appropriate for the env.
export interface CacheInstance<T = unknown> {
  get(key: string): T | null | Promise<T | null>;
  set(key: string, value: T, ttl?: number): void | Promise<void>;
  del(key: string): boolean | Promise<boolean>;
  delPattern(pattern: string): number | Promise<number>;
  flush(): void | Promise<void>;
  getOrSet<R>(
    key: string,
    fetcher: () => Promise<R>,
    ttl?: number,
  ): Promise<R>;
  getStats(): Promise<{
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
  }>;
  getKeysByNamespace(
    namespace: import("../cache").CacheNamespace,
  ): string[] | Promise<string[]>;
}

// Module-level flag set on first access — persists across warm invocations
let _isRedis: boolean | null = null;

/**
 * Determine which cache backend to use.
 * Result is cached after first call to avoid repeated env lookups.
 */
function useRedis(): boolean {
  if (_isRedis === null) {
    _isRedis = isRedisAvailable();
  }
  return _isRedis;
}

// ============================================================
// LRUCache proxy — wraps the sync singleton in a thin async-safe shell
// ============================================================

/**
 * Wraps the global in-memory LRUCache so callers can await it uniformly.
 * All write operations are fire-and-forget at the LRU level (no network).
 */
const lruProxy: CacheInstance = {
  get(key: string): unknown {
    return inMemoryCache.get(key);
  },

  set(key: string, value: unknown, ttl?: number): void {
    inMemoryCache.set(key, value as never, ttl);
  },

  del(key: string): boolean {
    return inMemoryCache.del(key);
  },

  delPattern(pattern: string): number {
    return inMemoryCache.delPattern(pattern);
  },

  flush(): void {
    inMemoryCache.flush();
  },

  async getOrSet<R>(
    key: string,
    fetcher: () => Promise<R>,
    ttl?: number,
  ): Promise<R> {
    const cached = inMemoryCache.get(key) as R | null;
    if (cached !== null) {
      return cached;
    }
    const value = await fetcher();
    inMemoryCache.set(key, value as never, ttl);
    return value;
  },

  async getStats() {
    return inMemoryCache.getStats();
  },

  getKeysByNamespace(
    namespace: import("../cache").CacheNamespace,
  ): string[] {
    return inMemoryCache.getKeysByNamespace(namespace);
  },
};

// ============================================================
// RedisCache proxy — thin wrapper to conform to CacheInstance
// ============================================================

// Shared RedisCache instance (matches LRUCache default maxSize of 2000)
const redisCache = new RedisCache(2000);

// ============================================================
// Public factory API
// ============================================================

/**
 * Create (or return) the appropriate cache instance for the current environment.
 *
 * - **Production / Vercel**: uses `RedisCache` via Upstash (distributed, bounded).
 * - **Development**: falls back to in-memory `LRUCache` (no Redis credentials needed).
 *
 * The instance is determined once per module-load and reused for all subsequent calls.
 *
 * @example
 * ```ts
 * const cache = createCache();
 * const data = await cache.getOrSet("jobs:list", () => fetchJobs());
 * ```
 */
export function createCache<T = unknown>(): CacheInstance<T> {
  if (useRedis()) {
    // RedisCache is already a class instance; return it cast to the interface
    return redisCache as CacheInstance<T>;
  }
  return lruProxy as CacheInstance<T>;
}

/**
 * Convenience alias — the default cache instance used across the app.
 * Equivalent to `createCache()` but avoids repeated env checks.
 *
 * Prefer `createCache()` when you need a fresh determination (e.g. in tests
 * after calling `resetRedisClient()`).
 */
export const cache: CacheInstance = createCache();

// ============================================================
// Invalidation helpers — forwarded from lib/cache.ts for ergonomic re-exports
// ============================================================

export {
  invalidateJobCache,
  invalidateWorkerCache,
  invalidateUserCache,
  invalidateBadgeCache,
  invalidateCategoryCache,
} from "../cache";

// ============================================================
// Convenience helpers — delegate to the active cache instance
// ============================================================

/**
 * Cache job listings with automatic key generation.
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
  const instance = createCache();

  return instance.getOrSet(cacheKey, fetcher, CACHE_TTL.JOBS);
}

/**
 * Cache worker public profile.
 */
export async function getCachedWorkerProfile(
  workerId: string,
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const cacheKey = LRUCache.createKey("workers", workerId, "public");
  const instance = createCache();

  return instance.getOrSet(cacheKey, fetcher, CACHE_TTL.WORKERS);
}

/**
 * Cache badge definitions.
 */
export async function getCachedBadges(
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const cacheKey = LRUCache.createKey("badges", "definitions");
  const instance = createCache();

  return instance.getOrSet(cacheKey, fetcher, CACHE_TTL.BADGES);
}

/**
 * Cache categories.
 */
export async function getCachedCategories(
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const cacheKey = LRUCache.createKey("categories", "all");
  const instance = createCache();

  return instance.getOrSet(cacheKey, fetcher, CACHE_TTL.CATEGORIES);
}

/**
 * Cache user session / auth context.
 */
export async function getCachedSession(
  userId: string,
  fetcher: () => Promise<unknown>,
): Promise<unknown> {
  const cacheKey = LRUCache.createKey("sessions", userId, "auth");
  const instance = createCache();

  return instance.getOrSet(cacheKey, fetcher, CACHE_TTL.SESSIONS);
}

/**
 * Check whether the active cache backend is Redis.
 * Useful for tests and admin diagnostics.
 */
export function isRedisCacheBackend(): boolean {
  return useRedis();
}
