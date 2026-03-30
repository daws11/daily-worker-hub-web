/**
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
}
