/**
<<<<<<< HEAD
 * Redis Client Stub
 * 
 * This is a stub for development without Redis.
 * In production, use UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<void>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrange(key: string, min: number, max: number): Promise<string[]>;
  zrem(key: string, ...members: string[]): Promise<number>;
}

/**
 * Check if Redis is available (always false in this stub)
 */
export function isRedisAvailable(): boolean {
  return false;
}

/**
 * Get Redis client (returns null when Redis not available)
 */
export function getRedisClient(): RedisClient | null {
  return null;
=======
 * Redis Client Factory for Upstash Redis
 *
 * Provides a singleton Redis client that is reused across requests.
 * Only available when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * environment variables are set.
 */

import { Redis } from "@upstash/redis";

/**
 * Check if Redis is available (credentials are configured)
 */
export function isRedisAvailable(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get the Redis client instance.
 * Throws if Redis is not available (call isRedisAvailable() first).
 */
export function getRedisClient(): Redis {
  if (!isRedisAvailable()) {
    throw new Error(
      "Redis is not available. Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set."
    );
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

/**
 * Reset the Redis client (useful for testing)
 */
export function resetRedisClient(): void {
  // No-op for now - the Redis class doesn't expose a reset method
  // This is here for API consistency if we later switch to a different client
>>>>>>> d1b96f9d12fafe385f8ccc8de16d21e499ab5ef0
}
