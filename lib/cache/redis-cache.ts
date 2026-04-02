/**
 * Redis-Backed Cache with TTL Support
 *
 * Provides efficient caching backed by Upstash Redis, designed for Vercel
 * serverless and Edge Functions compatibility. Preserves the same API as
 * the in-memory LRUCache for seamless interchangeability.
 */

import { getRedisClient, isRedisAvailable } from "./redis-client";

// Cache entry structure stored in Redis
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

// Namespace configuration (re-exported from cache.ts for convenience)
export type CacheNamespace =
  | "jobs"
  | "workers"
  | "badges"
  | "categories"
  | "sessions"
  | "skills";

// TTL presets in milliseconds (re-exported from cache.ts for convenience)
export const CACHE_TTL = {
  JOBS: 5 * 60 * 1000, // 5 minutes
  WORKERS: 10 * 60 * 1000, // 10 minutes
  BADGES: 60 * 60 * 1000, // 1 hour
  CATEGORIES: 60 * 60 * 1000, // 1 hour
  SESSIONS: 15 * 60 * 1000, // 15 minutes
} as const;

// Redis key prefix for all cache entries
const CACHE_KEY_PREFIX = "dwh:cache:";
// Redis key suffix for stats tracking
const CACHE_STATS_KEY = `${CACHE_KEY_PREFIX}__stats__`;

/**
 * Redis-Backed Cache implementation with TTL support
 *
 * Uses Upstash Redis to provide a distributed cache that works across
 * multiple serverless instances. TTL is managed using Redis EXPIRE.
 */
export class RedisCache<T = unknown> {
  private maxSize: number;

  constructor(maxSize: number = 2000) {
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
   * Get the full Redis key with prefix
   */
  private prefixKey(key: string): string {
    return `${CACHE_KEY_PREFIX}${key}`;
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<T | null> {
    if (!isRedisAvailable()) {
      return null;
    }

    try {
      const redis = getRedisClient();
      const redisKey = this.prefixKey(key);
      const raw = await redis.get<string>(redisKey);

      if (raw === null) {
        await this.incrementStat("misses");
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(raw as string);

      // Check if expired (defensive, Redis TTL should handle this)
      if (Date.now() > entry.expiresAt) {
        await redis.del(redisKey);
        await this.incrementStat("misses");
        return null;
      }

      // Increment hit count
      entry.hits += 1;
      const updatedRaw = JSON.stringify(entry);
      // Restore the value with original TTL
      const ttl = Math.max(1, Math.floor((entry.expiresAt - Date.now()) / 1000));
      await redis.set(redisKey, updatedRaw, { ex: ttl });

      await this.incrementStat("hits");

      return entry.value;
    } catch (error) {
      // Log error in development, fail silently in production
      if (process.env.NODE_ENV === "development") {
        console.error("[RedisCache] get error:", error);
      }
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL (in milliseconds)
   */
  async set(key: string, value: T, ttl: number = CACHE_TTL.JOBS): Promise<void> {
    if (!isRedisAvailable()) {
      return;
    }

    try {
      const redis = getRedisClient();
      const redisKey = this.prefixKey(key);
      const now = Date.now();

      const entry: CacheEntry<T> = {
        value,
        expiresAt: now + ttl,
        createdAt: now,
        hits: 0,
      };

      const ttlSeconds = Math.max(1, Math.floor(ttl / 1000));
      await redis.set(redisKey, JSON.stringify(entry), { ex: ttlSeconds });

      // Enforce max size by evicting oldest entries if needed
      await this.enforceMaxSize();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[RedisCache] set error:", error);
      }
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const redis = getRedisClient();
      const redisKey = this.prefixKey(key);
      const result = await redis.del(redisKey);
      return result > 0;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[RedisCache] del error:", error);
      }
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern (using SCAN for safety)
   */
  async delPattern(pattern: string): Promise<number> {
    if (!isRedisAvailable()) {
      return 0;
    }

    try {
      const redis = getRedisClient();
      const searchPattern = this.prefixKey(pattern.replace(/\*/g, "*"));
      let deleted = 0;
      let cursor = 0;

      // Use SCAN to safely iterate over keys in production
      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: searchPattern,
          count: 100,
        });
        cursor = Number(nextCursor);

        if (keys.length > 0) {
          const result = await redis.del(...keys);
          deleted += result;
        }
      } while (cursor !== 0);

      return deleted;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[RedisCache] delPattern error:", error);
      }
      return 0;
    }
  }

  /**
   * Clear all cache entries managed by this cache instance
   */
  async flush(): Promise<void> {
    if (!isRedisAvailable()) {
      return;
    }

    try {
      const redis = getRedisClient();
      let cursor = 0;

      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: `${CACHE_KEY_PREFIX}*`,
          count: 100,
        });
        cursor = Number(nextCursor);

        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== 0);

      // Reset stats
      await redis.del(CACHE_STATS_KEY);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[RedisCache] flush error:", error);
      }
    }
  }

  /**
   * Get or set pattern - fetch from source if not cached
   */
  async getOrSet<R>(
    key: string,
    fetcher: () => Promise<R>,
    ttl: number = CACHE_TTL.JOBS,
  ): Promise<R> {
    const cached = await this.get(key);

    if (cached !== null) {
      return cached as unknown as R;
    }

    const value = await fetcher();
    await this.set(key, value as unknown as T, ttl);

    return value;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: this.maxSize,
      hitRate: 0,
      entries: [] as CacheStats["entries"],
    };

    if (!isRedisAvailable()) {
      return stats;
    }

    try {
      const redis = getRedisClient();

      // Get hit/miss stats
      const [hits, misses] = await Promise.all([
        redis.hget<number>(CACHE_STATS_KEY, "hits"),
        redis.hget<number>(CACHE_STATS_KEY, "misses"),
      ]);
      stats.hits = hits ?? 0;
      stats.misses = misses ?? 0;

      // Calculate hit rate
      const total = stats.hits + stats.misses;
      stats.hitRate = total > 0
        ? Math.round((stats.hits / total) * 100) / 100
        : 0;

      // Count entries and get entry details using SCAN
      let cursor = 0;
      const now = Date.now();

      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: `${CACHE_KEY_PREFIX}*`,
          count: 100,
        });
        cursor = Number(nextCursor);

        for (const key of keys) {
          // Skip the stats key
          if (key === CACHE_STATS_KEY) {
            continue;
          }

          const raw = await redis.get<string>(key);
          if (raw === null) {
            continue;
          }

          stats.size += 1;

          try {
            const entry: CacheEntry<unknown> = JSON.parse(raw as string);
            stats.entries.push({
              key: key.replace(CACHE_KEY_PREFIX, ""),
              hits: entry.hits,
              age: Math.floor((now - entry.createdAt) / 1000),
              ttlRemaining: Math.max(
                0,
                Math.floor((entry.expiresAt - now) / 1000),
              ),
            });
          } catch {
            // Skip malformed entries
          }
        }
      } while (cursor !== 0);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[RedisCache] getStats error:", error);
      }
    }

    return stats;
  }

  /**
   * Get all keys matching a namespace
   */
  async getKeysByNamespace(namespace: CacheNamespace): Promise<string[]> {
    if (!isRedisAvailable()) {
      return [];
    }

    try {
      const redis = getRedisClient();
      const searchPattern = this.prefixKey(`${namespace}:*`);
      const keys: string[] = [];
      let cursor = 0;

      do {
        const [nextCursor, scannedKeys] = await redis.scan(cursor, {
          match: searchPattern,
          count: 100,
        });
        cursor = Number(nextCursor);
        keys.push(...scannedKeys);
      } while (cursor !== 0);

      return keys.map((key) => key.replace(CACHE_KEY_PREFIX, ""));
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[RedisCache] getKeysByNamespace error:", error);
      }
      return [];
    }
  }

  /**
   * Increment a stat counter atomically
   */
  private async incrementStat(field: "hits" | "misses"): Promise<void> {
    if (!isRedisAvailable()) {
      return;
    }

    try {
      const redis = getRedisClient();
      await redis.hincrby(CACHE_STATS_KEY, field, 1);
    } catch {
      // Silently ignore stat increment failures
    }
  }

  /**
   * Enforce max size by evicting oldest entries
   */
  private async enforceMaxSize(): Promise<void> {
    try {
      const redis = getRedisClient();
      const currentSize = await redis.dbsize();

      if (currentSize <= this.maxSize) {
        return;
      }

      // Evict entries to get back under maxSize
      const toDelete = currentSize - this.maxSize + 1;
      let cursor = 0;
      let deleted = 0;

      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: `${CACHE_KEY_PREFIX}*`,
          count: 100,
        });
        cursor = Number(nextCursor);

        // Filter out the stats key
        const deletableKeys = keys.filter((k) => k !== CACHE_STATS_KEY);

        for (const key of deletableKeys) {
          if (deleted >= toDelete) {
            break;
          }

          // Get TTL to find oldest entries
          const ttl = await redis.ttl(key);
          if (ttl !== null) {
            await redis.del(key);
            deleted++;
          }
        }
      } while (cursor !== 0 && deleted < toDelete);
    } catch {
      // Silently ignore enforcement failures
    }
  }
}
